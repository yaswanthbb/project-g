import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  useMutation,
} from "@tanstack/react-query";
import { createApi } from "@gigs/shared";
import { Workspace, type Screen } from "./src/context";
import {
  Body,
  Button,
  Card,
  ErrorNotice,
  Field,
  Loading,
  Page,
  Title,
  colors,
} from "./src/ui";
import { TodayScreen, AllScreen, GigScreen } from "./src/gigs";
import { EarningsScreen, PortfolioScreen } from "./src/finance";
import { SettingsScreen } from "./src/settings";
import { connectPush } from "./src/push";
export const cache = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchInterval: 20000 } },
});
const SESSION_KEY = "gig-session";
export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={cache}>
        <NativeApp />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
export function NativeApp() {
  const [session, setSession] = useState<string | null>(null);
  const tokenRef = useRef(session);
  tokenRef.current = session;
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [screen, setScreen] = useState<Screen>({ name: "today" });
  const [pushError, setPushError] = useState("");
  const [pushRetry, setPushRetry] = useState(0);
  const clearSession = useCallback(async () => {
    setSession(null);
    setScreen({ name: "today" });
    setPushError("");
    cache.clear();
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }, []);
  const api = useMemo(
    () =>
      createApi(
        process.env.EXPO_PUBLIC_API_URL || "https://unconfigured.invalid",
        () => tokenRef.current,
        () => {
          clearSession().catch(() =>
            setStorageError(
              "Could not clear this device’s saved session. Please reopen the app.",
            ),
          );
        },
      ),
    [clearSession],
  );
  const openGig = useCallback(
    (id: string) => setScreen({ name: "gig", id }),
    [],
  );
  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY)
      .then(setSession)
      .catch(() =>
        setStorageError(
          "Could not read your saved session. Please log in again.",
        ),
      )
      .finally(() => setReady(true));
    const sub = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen.name === "today") return false;
      setScreen({ name: screen.name === "gig" ? "all" : "today" });
      return true;
    });
    return () => sub.remove();
  }, [screen]);
  useEffect(() => {
    if (!session) return;
    let disposed = false;
    let off: (() => void) | undefined;
    connectPush(api, openGig, () =>
      setPushError(
        "Phone notifications could not connect. Check permission and connection, then retry.",
      ),
    )
      .then((cleanup) => {
        if (disposed) cleanup();
        else {
          off = cleanup;
          setPushError("");
        }
      })
      .catch(() => {
        if (!disposed)
          setPushError(
            "Phone notifications could not connect. Check permission and connection, then retry.",
          );
      });
    return () => {
      disposed = true;
      off?.();
    };
  }, [session, api, openGig, pushRetry]);
  async function login(token: string) {
    await SecureStore.setItemAsync(SESSION_KEY, token);
    cache.clear();
    setStorageError("");
    setSession(token);
    setScreen({ name: "today" });
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    await clearSession();
  }
  if (!ready)
    return (
      <SafeAreaView style={styles.root}>
        <Loading />
      </SafeAreaView>
    );
  if (!session)
    return (
      <SafeAreaView style={styles.root}>
        <Login api={api} onLogin={login} storageError={storageError} />
      </SafeAreaView>
    );
  const tabs = [
    { name: "today", label: "Today", icon: "◉" },
    { name: "all", label: "All gigs", icon: "▤" },
    { name: "earnings", label: "Earnings", icon: "₹" },
    { name: "portfolio", label: "Portfolio", icon: "▧" },
    { name: "settings", label: "Settings", icon: "⚙" },
  ] as const;
  return (
    <Workspace.Provider value={{ api, openGig, logout }}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.brand}>❧ Gig by gig</Text>
        </View>
        {pushError && (
          <View style={styles.pushNotice}>
            <ErrorNotice error={pushError} />
            <Button secondary onPress={() => setPushRetry((v) => v + 1)}>
              Retry notifications
            </Button>
          </View>
        )}
        <View style={styles.content}>
          {screen.name === "today" ? (
            <TodayScreen />
          ) : screen.name === "all" ? (
            <AllScreen />
          ) : screen.name === "gig" ? (
            <GigScreen
              id={screen.id}
              onBack={() => setScreen({ name: "all" })}
            />
          ) : screen.name === "earnings" ? (
            <EarningsScreen />
          ) : screen.name === "portfolio" ? (
            <PortfolioScreen />
          ) : (
            <SettingsScreen />
          )}
        </View>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: screen.name === tab.name }}
              onPress={() => setScreen({ name: tab.name })}
              style={[styles.tab, screen.name === tab.name && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabIcon,
                  screen.name === tab.name && styles.activeText,
                ]}
              >
                {tab.icon}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  screen.name === tab.name && styles.activeText,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </Workspace.Provider>
  );
}
function Login({
  api,
  onLogin,
  storageError,
}: {
  api: ReturnType<typeof createApi>;
  onLogin: (token: string) => Promise<void>;
  storageError: string;
}) {
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () =>
      api<{ token: string }>("/auth/login", {
        method: "POST",
        body: { password },
      }),
    onSuccess: (data) => onLogin(data.token),
  });
  return (
    <Page>
      <View style={styles.loginIntro}>
        <Text style={styles.brand}>❧ Gig by gig</Text>
        <Title
          eyebrow="YOUR WORKSPACE"
          title="Good work starts with one small step."
          subtitle="Your gigs, your approach, your next move."
        />
      </View>
      <Card>
        <Title
          eyebrow="WELCOME BACK"
          title="Your next step awaits."
          subtitle="Open your workspace and keep it simple."
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={() => {
            if (password && !login.isPending) login.mutate();
          }}
        />
        <ErrorNotice error={storageError} />
        <ErrorNotice error={login.error} />
        <Button
          disabled={login.isPending || !password}
          onPress={() => login.mutate()}
        >
          {login.isPending ? "Opening…" : "Log in"}
        </Button>
        <Body muted>Just you. Just your work.</Body>
      </Card>
    </Page>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#eff2e9",
  },
  brand: { fontFamily: "serif", fontSize: 24, color: colors.green },
  content: { flex: 1 },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 7,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  tab: {
    minHeight: 54,
    minWidth: 55,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingHorizontal: 6,
    gap: 4,
  },
  activeTab: { backgroundColor: "#eaf0e2" },
  tabIcon: { fontSize: 20, color: "#84917d" },
  tabLabel: { fontSize: 9, color: "#84917d" },
  activeText: { color: colors.green },
  pushNotice: { paddingHorizontal: 16, paddingBottom: 8 },
  loginIntro: { paddingTop: 28, paddingBottom: 5 },
});

import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { PermissionsAndroid, Platform } from "react-native";
import { type Api } from "./context";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function connectPush(
  api: Api,
  open: (id: string) => void,
  onError: () => void,
) {
  await Notifications.setNotificationChannelAsync("gigs", {
    name: "Gigs & follow-ups",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
  if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (permission !== PermissionsAndroid.RESULTS.GRANTED)
      throw new Error("Notification permission is needed");
  }
  const messaging = getMessaging(getApp());
  let active = true;
  const register = async (token: string) => {
    if (active) await api("/push/devices", { method: "POST", body: { token } });
  };
  await register(await getToken(messaging));
  const tokenOff = onTokenRefresh(messaging, (token) => {
    register(token).catch(onError);
  });
  const foregroundOff = onMessage(messaging, async (message) => {
    if (!active) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.notification?.title || "Gig update",
        body: message.notification?.body || "Open Today for your next step.",
        data: message.data || {},
        sound: "default",
      },
      trigger: null,
    });
  });
  const tap = (data: Record<string, unknown> | undefined) => {
    if (active && typeof data?.gig_id === "string") open(data.gig_id);
  };
  const openOff = onNotificationOpenedApp(messaging, (message) =>
    tap(message.data),
  );
  const response = Notifications.addNotificationResponseReceivedListener(
    (event) => tap(event.notification.request.content.data),
  );
  getInitialNotification(messaging)
    .then((message) => {
      if (message) tap(message.data);
    })
    .catch(onError);
  return () => {
    active = false;
    tokenOff();
    foregroundOff();
    openOff();
    response.remove();
  };
}

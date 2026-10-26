import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Clipboard from "expo-clipboard";
import { type Gig, dateLabel } from "@gigs/shared";
export const colors = {
  green: "#174f40",
  ink: "#25392f",
  muted: "#6f7b71",
  paper: "#fffef9",
  background: "#f7f8f2",
  line: "#dfe5da",
  soft: "#e7eeda",
};
export function Title({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={s.title}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={s.h1}>
        {title}
      </Text>
      <Text style={s.muted}>{subtitle}</Text>
    </View>
  );
}
export function Page({
  children,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <ScrollView
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
export function Card({
  children,
  soft = false,
}: {
  children: ReactNode;
  soft?: boolean;
}) {
  return <View style={[s.card, soft && s.soft]}>{children}</View>;
}
export function H2({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={s.h2}>
      {children}
    </Text>
  );
}
export function Body({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return <Text style={muted ? s.muted : s.body}>{children}</Text>;
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={s.section}>
      <H2>{title}</H2>
      {children}
    </View>
  );
}
export function Button({
  children,
  onPress,
  disabled = false,
  secondary = false,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.green }]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <Text accessibilityRole="alert" style={s.error}>
      {error instanceof Error ? error.message : String(error)}
    </Text>
  ) : null;
}
export function Loading() {
  return (
    <View style={s.empty}>
      <ActivityIndicator size="large" color={colors.green} />
      <Body>Loading your gigs…</Body>
      <Body muted>The first load may take a moment.</Body>
    </View>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyMark}>✓</Text>
      <H2>{title}</H2>
      {children && <Body muted>{children}</Body>}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8a9484"
        style={[
          s.input,
          props.multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.picker}>
        <Picker
          accessibilityLabel={label}
          selectedValue={value}
          onValueChange={(v) => onChange(String(v))}
          style={{ color: colors.ink }}
        >
          {options.map((o) => (
            <Picker.Item key={o.value} label={o.label} value={o.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  optional = false,
  paid = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  paid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setShow(true)}
        style={s.input}
      >
        <Text style={s.body}>
          {value ? dateLabel(value) : "Not recorded · choose date"}
        </Text>
      </Pressable>
      {optional && !!value && (
        <Button secondary onPress={() => onChange("")}>
          Clear paid date
        </Button>
      )}
      {show && (
        <DateTimePicker
          value={value ? new Date(value + "T12:00:00") : new Date()}
          mode="date"
          maximumDate={paid ? new Date() : undefined}
          onChange={(_, date) => {
            setShow(false);
            if (date)
              onChange(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
              );
          }}
        />
      )}
    </View>
  );
}
export function Pill({ gig }: { gig: Gig }) {
  return (
    <Text
      style={[
        s.pill,
        gig.status === "New" && {
          backgroundColor: "#f6e9d6",
          color: "#9a6b29",
        },
      ]}
    >
      {gig.skipped_at ? "Skipped · New" : gig.status}
    </Text>
  );
}
export function Progress({ gig }: { gig: Gig }) {
  return (
    <View style={s.progress}>
      <Text style={s.small}>
        {gig.completed_steps} of {gig.total_steps} done
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: gig.total_steps,
          now: gig.completed_steps,
        }}
        style={s.track}
      >
        <View
          style={[
            s.fill,
            {
              width: `${gig.total_steps ? (gig.completed_steps / gig.total_steps) * 100 : 0}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}
export function OpenLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <Button
        secondary
        onPress={() => {
          Linking.openURL(url).catch(() =>
            setError("Could not open this link — try again"),
          );
        }}
      >
        {children} ↗
      </Button>
      <ErrorNotice error={error} />
    </>
  );
}
export function Copy({
  text,
  disabled,
  label,
}: {
  text: string;
  disabled: boolean;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setError("");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy — try again");
    }
  }
  return (
    <>
      <Button
        label={label}
        secondary
        disabled={disabled || !text}
        onPress={copy}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
      <ErrorNotice error={error} />
    </>
  );
}
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View accessibilityViewIsModal style={s.modal}>
          <View style={s.sheetHeader}>
            <H2>{title}</H2>
            <Button secondary onPress={onClose}>
              Close
            </Button>
          </View>
          <ScrollView
            contentContainerStyle={s.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function GigCard({ gig, onPress }: { gig: Gig; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${gig.business_name}`}
      onPress={onPress}
      style={s.card}
    >
      <View style={s.row}>
        <Text style={s.avatar}>{gig.business_name[0]}</Text>
        <Pill gig={gig} />
      </View>
      <Text style={s.businessName}>{gig.business_name}</Text>
      <Body muted>
        {[gig.business_type, gig.city_area].filter(Boolean).join(" · ")}
      </Body>
      <Body>{gig.problem_noticed}</Body>
      <Progress gig={gig} />
      <Text style={s.link}>Open gig →</Text>
    </Pressable>
  );
}
export function Facts({ items }: { items: [string, string][] }) {
  return (
    <View>
      {items.map(([label, value]) => (
        <View key={label} style={s.fact}>
          <Text style={s.muted}>{label}</Text>
          <Text style={s.factValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  page: { padding: 22, paddingBottom: 40, gap: 4 },
  title: { marginTop: 10, marginBottom: 23, gap: 10 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    color: colors.muted,
    fontWeight: "600",
  },
  h1: {
    fontFamily: "serif",
    fontSize: 34,
    lineHeight: 41,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 14,
  },
  body: { fontSize: 14, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 12, lineHeight: 21, color: colors.muted },
  small: { fontSize: 11, color: colors.muted, lineHeight: 18 },
  card: {
    padding: 21,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    marginBottom: 16,
    gap: 12,
  },
  soft: { backgroundColor: colors.soft, borderColor: "#dce5ca" },
  section: { marginBottom: 23 },
  button: {
    backgroundColor: colors.green,
    minHeight: 48,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.green,
    marginVertical: 3,
  },
  secondary: { backgroundColor: colors.paper, borderColor: "#d5ddd0" },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  error: {
    backgroundColor: "#fff0e8",
    color: "#934832",
    padding: 13,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 21,
    marginVertical: 10,
  },
  empty: {
    alignItems: "center",
    backgroundColor: "#f0f3e9",
    padding: 28,
    borderRadius: 13,
    borderColor: colors.line,
    borderWidth: 1,
    marginVertical: 8,
    gap: 10,
  },
  emptyMark: { fontSize: 28, color: "#72925b" },
  field: { gap: 8, marginVertical: 10 },
  label: { fontSize: 12, color: colors.ink, fontWeight: "500" },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d6dfcf",
    padding: 13,
    minHeight: 48,
    color: colors.ink,
    fontSize: 14,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#d6dfcf",
    borderRadius: 8,
    backgroundColor: colors.paper,
  },
  pill: {
    fontSize: 11,
    color: colors.green,
    backgroundColor: "#e6eddf",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  progress: { gap: 8, marginVertical: 6 },
  track: {
    backgroundColor: "#dce3d4",
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { backgroundColor: "#59815c", height: 5 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  avatar: {
    width: 36,
    height: 36,
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: "serif",
    fontSize: 22,
    color: "#607852",
    backgroundColor: "#edf0e5",
    borderRadius: 8,
  },
  businessName: {
    fontFamily: "serif",
    fontSize: 24,
    lineHeight: 31,
    color: colors.ink,
  },
  link: { fontSize: 13, fontWeight: "600", color: colors.green, marginTop: 10 },
  fact: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  factValue: { fontSize: 14, fontWeight: "500", color: colors.ink },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#1b302c88",
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "93%",
    paddingBottom: 20,
  },
  sheetHeader: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  sheetContent: { padding: 22, paddingBottom: 40, gap: 8 },
  check: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.line,
    minHeight: 58,
  },
  checkbox: { fontSize: 22, color: colors.green, width: 26 },
  checkText: { flex: 1, gap: 5 },
  done: { textDecorationLine: "line-through", color: colors.muted },
  earned: {
    fontFamily: "serif",
    fontSize: 47,
    color: colors.green,
    letterSpacing: -1,
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 16 },
});

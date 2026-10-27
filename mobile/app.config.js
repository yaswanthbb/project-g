const localCheck =
  process.env.GIGS_LOCAL_CHECK === "1" && process.env.EAS_BUILD !== "true";
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!localCheck && (!apiUrl || !apiUrl.startsWith("https://")))
  throw new Error(
    "Set EXPO_PUBLIC_API_URL to the HTTPS backend URL before a native build.",
  );
export default {
  name: "Gig by gig",
  slug: "gig-by-gig",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  platforms: ["android"],
  scheme: "gigbygig",
  android: {
    package: "com.projectg.app",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || "./firebase/google-services.json",
    permissions: ["POST_NOTIFICATIONS"],
    versionCode: 1,
  },
  plugins: [
    // Manifest mods run in reverse registration order; apply overrides last.
    "./plugins/with-firebase-notifications.cjs",
    "expo-dev-client",
    "@react-native-community/datetimepicker",
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
    ["expo-notifications", { defaultChannel: "gigs", color: "#174f40" }],
    "expo-secure-store",
  ],
  extra: process.env.EAS_PROJECT_ID
    ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
    : {},
};

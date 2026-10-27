// Expo loads this build plugin through CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAndroidManifest } = require("expo/config-plugins");

// Expo Notifications and React Native Firebase both declare these defaults.
// Keep the app's values when Android merges the libraries' manifests.
module.exports = function withFirebaseNotifications(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const application = manifest.application[0];
    const metadata = application["meta-data"] || [];
    for (const [name, attribute] of [
      [
        "com.google.firebase.messaging.default_notification_channel_id",
        "android:value",
      ],
      [
        "com.google.firebase.messaging.default_notification_color",
        "android:resource",
      ],
    ]) {
      const entry = metadata.find((item) => item.$["android:name"] === name);
      if (!entry?.$[attribute]) {
        throw new Error(
          `Missing notification setting: ${name}. Place this plugin before expo-notifications in app.config.js so its manifest mod runs last.`,
        );
      }
      const replacements = new Set(
        (entry.$["tools:replace"] || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );
      replacements.add(attribute);
      entry.$["tools:replace"] = [...replacements].join(",");
    }
    return config;
  });
};

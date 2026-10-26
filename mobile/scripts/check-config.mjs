import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.EXPO_PUBLIC_API_URL;
const google = resolve(
  process.env.GOOGLE_SERVICES_JSON || "firebase/google-services.json",
);
if (!api?.startsWith("https://"))
  throw new Error(
    "Set EXPO_PUBLIC_API_URL to the HTTPS backend URL. A real phone cannot use laptop localhost.",
  );
if (!existsSync(google))
  throw new Error(
    "Missing Firebase Android config. Put google-services.json in mobile/firebase or supply the GOOGLE_SERVICES_JSON file environment variable. Rebuild the APK after adding it.",
  );
const config = JSON.parse(readFileSync(google, "utf8"));
const pkg = "com.projectg.app";
if (
  !config.client?.some(
    (c) => c.client_info?.android_client_info?.package_name === pkg,
  )
)
  throw new Error("Firebase package name must be com.projectg.app.");
console.log(
  "Native build prerequisites are present. Device push verification is still required.",
);

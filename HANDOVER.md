# Handover · project-g

## 1. Open the website and install the Android app

**Website:** the local URL is http://localhost:5173 while the development server runs. No deployed website URL has been supplied or verified.

**Backend:** deployed by the owner at https://project-g-api.onrender.com. Its HTTPS `/api/health` returned `{"status":"ok"}` on 27 October 2026. This health check does not establish database persistence or Firebase Admin delivery.

To deploy:

1. Create a Neon Postgres database and set its connection URL as `DATABASE_URL` on the Render backend. Do not use SQLite on Render; its free filesystem is temporary.
2. Use the repository's `render.yaml` as the Render service configuration. Choose the free plan. Its start command applies the three migrations before starting one Uvicorn worker. Set the backend environment variables below. For local use, keep the Admin key in the ignored `backend/secrets/firebase-service-account.json` and set `FIREBASE_SERVICE_ACCOUNT_PATH`. On Render, store the Firebase Admin key as a secret file and point `FIREBASE_SERVICE_ACCOUNT_PATH` at that file.
3. Deploy the web project to Vercel's free tier with root `web`, framework Vite, build `npm run build`, output `dist`. Enable inclusion of files outside the root because `shared/` is a workspace dependency. Install from the repository root with `npm ci`. Set `VITE_API_URL` to the Render HTTPS URL. Add the resulting Vercel origin to `FRONTEND_ORIGINS` on Render, then restart the backend. Use this same backend URL for Android.
4. Enable the included hourly reminder workflow on the repository's default branch. Set repository secrets `REMINDER_URL` (the Render base URL) and `REMINDER_API_TOKEN` (matching the server variable). The workflow must be enabled and its two secrets set for reliable daily wakeups. The secured endpoint wakes a sleeping free backend and sends due reminders; an in-process worker also checks while the backend is running. Reminders are date-based in Asia/Kolkata. Scheduled workflows can be delayed, so delivery is not guaranteed at an exact minute.

**Android package: `com.projectg.app`.** The supplied Firebase Android file has been verified to match that package and is ignored by Git. Its local location is `mobile/firebase/google-services.json`.

**Installable APK built on 27 October 2026:** `mobile/dist/project-g-1.0.0-arm64-v8a.apk` (about 23.1 MiB). It is a standalone release for 64-bit ARM Android phones running Android 7.0 or newer. Copy it to the phone, open it, and allow installation from that source if Android asks. Open **Gig by gig**, log in with the password seeded on the deployed backend, and allow notifications. Expo Go and a laptop development server are not required.

The APK embeds the deployed backend URL. Its package/version, matching Firebase application/sender/project resources, notification service/channel, signature schemes v2/v3, non-debuggable release manifest, embedded app bundle, and 16 KB native-library alignment were verified. Checksum and build details are saved beside it as `.apk.sha256` and `build-info.json`. Real phone login, layout, cross-device sync and push delivery are still pending.

**Keep the signing key:** privately back up `mobile/project-g-release.keystore` and `mobile/credentials.json` together. They are ignored by Git and are required to sign compatible future updates. Do not replace this key. Before a local update, increase `android.versionCode` in `mobile/app.config.js` and rebuild. If moving to EAS, import this existing key or configure EAS local credentials before building; a newly generated EAS key cannot update this APK.

For future APK builds:

1. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS backend in `mobile/.env` and in the matching EAS build environment (preview/production). A phone cannot use the laptop's localhost URL.
2. Keep the matching Firebase Android configuration in `mobile/firebase/google-services.json`. For a cloud EAS build, provide it as the EAS **file** environment variable `GOOGLE_SERVICES_JSON`; the ignored local file is not committed or automatically uploaded.
3. For EAS, sign into the owner's Expo account and configure `EAS_PROJECT_ID` if needed. From `mobile`, run `node scripts/check-config.mjs` and then `npx eas-cli build --platform android --profile preview`. Use the available free build allocation; no paid plan is required by the app. For a local debug APK use `npm run android -w mobile` after installing a JDK and Android SDK and connecting a device. A development client is included; Expo Go is not an FCM test.
4. Download the APK from the completed EAS build on the phone and install it, allowing installation from that download source if Android asks. Updates must use the same package **and signing key**, with a higher versionCode. The `production` profile enables auto-increment for subsequent internally distributed APKs. There is no Play Store submission.
5. Log in on the real APK and grant Android notification permission. Test a new Muse gig and a due follow-up with the app foregrounded and backgrounded. Confirm a phone change appears on the laptop and vice versa. A Firebase configuration change requires rebuilding the native APK.

To repeat the local standalone build, export `JAVA_HOME`, `ANDROID_HOME` and, if needed, `GRADLE_USER_HOME` for the installed toolchain, then run from `mobile`:

```bash
node scripts/check-config.mjs
npx expo prebuild --platform android --no-install
cd android
NODE_ENV=production ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2 --build-cache
cd ..
node scripts/sign-apk.mjs android/app/build/outputs/apk/release/app-release.apk dist/project-g-1.0.0-arm64-v8a.apk
```

Update the output filename when changing the version. The signing helper uses the private saved credentials, keeps passwords out of command arguments, and verifies the resulting signature. Distribute the signed file under `mobile/dist`, not the intermediate APK under `android/app/build`. The build plugin resolves Expo/Firebase notification manifest defaults on regeneration; do not remove it.

## 2. Password setup

This checkout is already initialized locally: private `backend/.env`, one seeded user, and zero gigs. Local login/logout and the empty Today API were verified without displaying secrets. Read `INITIAL_PASSWORD` in that local file, log in, and change it in Settings.

For a fresh installation, run `python3 backend/setup_local.py` to create private local setup secrets, or manually set `INITIAL_PASSWORD` in the backend environment before the first start. Startup seeds exactly one user (`escnaor`) if absent; it never resets an existing password from the environment.

Open Login and use that initial password. Change it in Settings. Settings also logs out; a password change revokes the other devices' sessions. Sessions otherwise remain valid until logout. The backend stores bcrypt hashes; session tokens are stored hashed in the database, in Android SecureStore on the phone, and localStorage on the web.

No actual password or server token is included in this document. The local account was seeded from the private environment file. No test gigs were inserted into its persistent database.

## 3. Environment variables (names only)

| Where                                       | Names                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render/backend                              | `DATABASE_URL`, `INITIAL_PASSWORD`, `MUSE_API_TOKEN`, `REMINDER_API_TOKEN`, `FRONTEND_ORIGINS`, `FIREBASE_SERVICE_ACCOUNT_PATH`, `APP_TIMEZONE`, `PYTHON_VERSION`, `PORT` |
| Vercel/web                                  | `VITE_API_URL`                                                                                                                                                            |
| Expo/Android                                | `EXPO_PUBLIC_API_URL`, `GOOGLE_SERVICES_JSON`, `EAS_PROJECT_ID`                                                                                                           |
| GitHub reminder workflow                    | `REMINDER_URL`, `REMINDER_API_TOKEN`                                                                                                                                      |
| Local Android toolchain if building locally | `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `GRADLE_USER_HOME`                                                                                                       |

The native package is fixed in app configuration; it is not taken from an Android package environment variable. The Firebase Admin service-account key belongs only on the backend, never in the mobile app or web bundle. `MUSE_API_TOKEN` is separate from user login and never goes into either frontend. This implementation uses opaque session tokens, so it does not need a `JWT_SECRET`.

## 4. Give Muse the ingestion endpoint

Muse posts JSON to `POST <backend HTTPS URL>/api/gigs`, with `Content-Type: application/json` and `X-Muse-Token` set to the server's `MUSE_API_TOKEN`. Configure the secret in Muse's server-side environment. Do not share it in the UI or a document.

Body shape:

```json
{
  "business_name": "Business researched by Muse",
  "business_type": "salon",
  "city_area": "Pune",
  "source": "Local research",
  "problem_noticed": "Plain description of the actual problem",
  "why_it_fits": "Why a simple website fits this business and your skills",
  "price_min": 8000,
  "price_max": 15000,
  "outreach_whatsapp": "A personalized message for manual review and sending",
  "outreach_email": "The separate email version",
  "steps": [
    { "position": 1, "title": "Approve this gig and read the research" },
    {
      "position": 2,
      "title": "Copy, review and send the WhatsApp message yourself"
    }
  ]
}
```

Include nullable contact fields and demo link if known. The API accepts HTTP(S) links. Every step needs a unique positive position and an action title. Supply the actual full approach for each gig; the example only illustrates the schema. The default call script applies if Muse omits one.

A successful create returns HTTP 201 and the gig ID. It atomically queues a new-gig push and attempts delivery in the background when Firebase is configured. A 201 alone proves creation, **not delivery**. Failed notifications remain queued. The scheduler endpoint returns 503 when Firebase is not configured and 502 when delivery fails; it never claims success for those cases.

Do not automatically retry a timed-out gig creation without checking whether the business was created; ingestion does not provide an idempotency key.

## 5. Acceptance evidence and remaining work

See `ACCEPTANCE.md` for the item-by-item results. Local/mocked checks are complete only where recorded there. Backend HTTPS health and the signed native APK build are now verified. Neon persistence, deployed website/CORS, real Firebase delivery, real Android install/login and physical phone-to-laptop synchronization still need verification.

No production test gig was seeded. Unit/integration test gigs are explicitly labelled `TEST ONLY` and stored in temporary databases. The disposable browser preview is also temporary and labelled test data.

The dependency audit still reports advisories in Expo/Firebase's transitive tool dependencies. See `DEPENDENCY_NOTES.md` for the exact final audit result; incompatible framework downgrades were not applied to hide them. Do not claim an advisory-free release.

## Reference documentation

- [Render free service sleep and storage](https://render.com/docs/free)
- [Vercel monorepo configuration](https://vercel.com/docs/monorepos/monorepo-faq)
- [Expo APK builds](https://docs.expo.dev/build-reference/apk/)
- [Expo Android setup](https://docs.expo.dev/get-started/set-up-your-environment/)
- [React Native Firebase messaging](https://rnfirebase.io/messaging/usage)
- [Firebase Admin delivery](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk)
- [GitHub Actions free allowances](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

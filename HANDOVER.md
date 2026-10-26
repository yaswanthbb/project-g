# Handover · project-g

## 1. Open the website and install the Android app

**Website:** the local URL is http://localhost:5173 while the development server runs. No public Vercel/Render deployment has been performed, so no public web URL is claimed.

To deploy:

1. Create a Neon Postgres database and set its connection URL as `DATABASE_URL` on the Render backend. Do not use SQLite on Render; its free filesystem is temporary.
2. Use the repository's `render.yaml` as the Render service configuration. Choose the free plan. Its start command applies the three migrations before starting one Uvicorn worker. Set the backend environment variables below. For local use, keep the Admin key in the ignored `backend/secrets/firebase-service-account.json` and set `FIREBASE_SERVICE_ACCOUNT_PATH`. On Render, store the Firebase Admin key as a secret file and point `FIREBASE_SERVICE_ACCOUNT_PATH` at that file.
3. Deploy the web project to Vercel's free tier with root `web`, framework Vite, build `npm run build`, output `dist`. Enable inclusion of files outside the root because `shared/` is a workspace dependency. Install from the repository root with `npm ci`. Set `VITE_API_URL` to the Render HTTPS URL. Add the resulting Vercel origin to `FRONTEND_ORIGINS` on Render, then restart the backend. Use this same backend URL for Android.
4. Enable the included hourly reminder workflow on the repository's default branch. Set repository secrets `REMINDER_URL` (the Render base URL) and `REMINDER_API_TOKEN` (matching the server variable). The workflow must be enabled and its two secrets set for reliable daily wakeups. The secured endpoint wakes a sleeping free backend and sends due reminders; an in-process worker also checks while the backend is running. Reminders are date-based in Asia/Kolkata. Scheduled workflows can be delayed, so delivery is not guaranteed at an exact minute.

**Android package: `com.projectg.app`.** The supplied Firebase Android file has been verified to match that package and is ignored by Git. Its local location is `mobile/firebase/google-services.json`.

Before a real APK build:

1. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS backend in `mobile/.env` and in the matching EAS build environment (preview/production). A phone cannot use the laptop's localhost URL.
2. Keep the matching Firebase Android configuration in `mobile/firebase/google-services.json`. For a cloud EAS build, provide it as the EAS **file** environment variable `GOOGLE_SERVICES_JSON`; the ignored local file is not committed or automatically uploaded.
3. For EAS, sign into the owner's Expo account and configure `EAS_PROJECT_ID` if needed. From `mobile`, run `node scripts/check-config.mjs` and then `npx eas-cli build --platform android --profile preview`. Use the available free build allocation; no paid plan is required by the app. For a local debug APK use `npm run android -w mobile` after installing a JDK and Android SDK and connecting a device. A development client is included; Expo Go is not an FCM test.
4. Download the APK from the completed EAS build on the phone and install it, allowing installation from that download source if Android asks. Updates must use the same package **and signing key**, with a higher versionCode. The `production` profile enables auto-increment for subsequent internally distributed APKs. There is no Play Store submission.
5. Log in on the real APK and grant Android notification permission. Test a new Muse gig and a due follow-up with the app foregrounded and backgrounded. Confirm a phone change appears on the laptop and vice versa. A Firebase configuration change requires rebuilding the native APK.

An APK has **not** been built, installed, or tested on a device in this run. The Android JavaScript bundle is not an APK.

## 2. Password setup

This checkout is already initialized locally: private `backend/.env`, one seeded user, and zero gigs. Local login/logout and the empty Today API were verified without displaying secrets. Read `INITIAL_PASSWORD` in that local file, log in, and change it in Settings.

For a fresh installation, run `python3 backend/setup_local.py` to create private local setup secrets, or manually set `INITIAL_PASSWORD` in the backend environment before the first start. Startup seeds exactly one user (`escnaor`) if absent; it never resets an existing password from the environment.

Open Login and use that initial password. Change it in Settings. Settings also logs out; a password change revokes the other devices' sessions. Sessions otherwise remain valid until logout. The backend stores bcrypt hashes; session tokens are stored hashed in the database, in Android SecureStore on the phone, and localStorage on the web.

No actual password or server token is included in this document. The local account was seeded from the private environment file. No test gigs were inserted into its persistent database.

## 3. Environment variables (names only)

| Where | Names |
|---|---|
| Render/backend | `DATABASE_URL`, `INITIAL_PASSWORD`, `MUSE_API_TOKEN`, `REMINDER_API_TOKEN`, `FRONTEND_ORIGINS`, `FIREBASE_SERVICE_ACCOUNT_PATH`, `APP_TIMEZONE`, `PYTHON_VERSION`, `PORT` |
| Vercel/web | `VITE_API_URL` |
| Expo/Android | `EXPO_PUBLIC_API_URL`, `GOOGLE_SERVICES_JSON`, `EAS_PROJECT_ID` |
| GitHub reminder workflow | `REMINDER_URL`, `REMINDER_API_TOKEN` |
| Local Android toolchain if building locally | `JAVA_HOME`, `ANDROID_HOME` |

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
    { "position": 2, "title": "Copy, review and send the WhatsApp message yourself" }
  ]
}
```

Include nullable contact fields and demo link if known. The API accepts HTTP(S) links. Every step needs a unique positive position and an action title. Supply the actual full approach for each gig; the example only illustrates the schema. The default call script applies if Muse omits one.

A successful create returns HTTP 201 and the gig ID. It atomically queues a new-gig push and attempts delivery in the background when Firebase is configured. A 201 alone proves creation, **not delivery**. Failed notifications remain queued. The scheduler endpoint returns 503 when Firebase is not configured and 502 when delivery fails; it never claims success for those cases.

Do not automatically retry a timed-out gig creation without checking whether the business was created; ingestion does not provide an idempotency key.

## 5. Acceptance evidence and remaining work

See `ACCEPTANCE.md` for the item-by-item results. Local/mocked checks are complete only where recorded there. Live deployment, Neon connectivity, real Firebase delivery, real Android install/login and physical phone-to-laptop synchronization still need verification.

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

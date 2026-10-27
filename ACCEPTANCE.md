# Acceptance evidence · updated 27 October 2026

Local implementation completed in Section 10 order. The user explicitly authorized finishing all code with local tests while physical APK/push verification remains pending. This document does **not** mark every Section 11 acceptance item as fully passed.

## Automated checks

- **18 backend tests passed on SQLite and the same 18 passed on disposable PostgreSQL 18.** Postgres migrations upgrade to head, show no schema drift, roll back, and upgrade again.
- **4 web tests passed:** copy feedback/gating, notes following remote edits while preserving a draft, and stale unauthorized responses not clearing a newer session.
- **4 native interaction tests passed:** correct/wrong password and stored session; approval-gated copy without a status update; Won's 50% default and required payload; visible Real client and Demo labels. Native APIs and HTTP are mocked in these tests.
- ESLint, Ruff, web TypeScript/build, native TypeScript, and Metro Android export passed. The export contains 824 modules and is a JavaScript/Hermes artifact, not an installable APK.

## Signed APK build · 27 October 2026

- Standalone release APK: `mobile/dist/project-g-1.0.0-arm64-v8a.apk`; package `com.projectg.app`; version 1.0.0/code 1; ARM64; minimum Android API 24.
- Android Gradle release compilation and release lint passed. Resolved Expo/Firebase notification manifest conflicts in a persistent config plugin. Upstream deprecation and Google Play Services R8 warnings remain; no device-runtime success is inferred from compilation.
- Private app signing key generated and retained with ignored credentials. Final APK signatures v2/v3 verified. Release is not debuggable, contains the compiled app bundle and uses 16 KB native-library alignment.
- Packaged API URL matches the deployed backend. Firebase application, sender and project resources match the supplied `com.projectg.app` client file; notification permission, service and `gigs` channel are present. Signing/server credential files are absent from the APK.
- Deployed HTTPS `/api/health` returned `{"status":"ok"}`. No production data was created or changed. Database persistence and provider delivery remain unverified.
- Mobile TypeScript, all 4 native interaction tests and full source lint passed again. Test HTTP/native APIs remain mocked.

## Section 11 checklist

| Item                                                                       | Evidence                                                                                                                                 | Result                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Correct/wrong password on web and Android                                  | API tests; actual browser login/error; mocked native login/SecureStore test                                                              | Local passed; real APK pending                                    |
| Muse ingestion with steps, rejects missing/wrong token, phone gets push    | API tests on both databases; durable event creation; mocked dispatch                                                                     | API/local delivery logic passed; real FCM/device delivery pending |
| Today sections, exact next step, due/overdue follow-ups, clean empty state | API tests; actual browser Today at laptop/phone widths; Skip → Nothing due today                                                         | Local passed                                                      |
| All gig fields, copy, sheets, checklist, notes, status                     | Actual local browser detail/copy/sheets/reload; native component tests and bundle                                                        | Local passed; actual native layout/device behavior pending        |
| Approval required; copying never marks Sent                                | Backend gates; actual browser Approved status after copy; web/native copy tests                                                          | Local passed                                                      |
| Full status order, backwards, Lost stops reminders                         | API tests, shared ordered status list, native/web picker code                                                                            | Local passed; physical-device operation pending                   |
| Day 3 / Day 7 only, Today and push, cancellation after progress            | Date-controlled API and dispatcher tests; repeat-dispatch suppression, retries, invalid-session device cleanup                           | Local logic passed; live timed FCM delivery pending               |
| Won quote/advance prompt; Paid advance amount/date; correct monthly totals | API validation and cross-month money tests on both databases; native Won form test                                                       | Local passed                                                      |
| Portfolio honest labels and working links                                  | API create/edit/URL validation; actual browser saved Demo link; native Real client/Demo test                                             | Local passed; native external-link launch pending                 |
| Phone/laptop changes appear both ways                                      | Two authenticated sessions read/write the same API/database; notes synchronization regression test; focus/20-second refresh              | Shared-backend logic passed; physical phone/laptop test pending   |
| Plain empty/loading/error states; readable laptop/phone; large targets     | Actual browser 1280×900 and 390×844 layouts, no horizontal overflow; search-empty and connection-error state; native tests/source        | Web/local passed; native device review pending                    |
| Secrets excluded and variable names handed over                            | Firebase file matches com.projectg.app; ignored/not tracked; private-key/token scan and Git exclusion checks; HANDOVER.md env-name table | Local checks passed; deployment secret configuration pending      |
| Test gig cleaned up or clearly labelled                                    | Every fixture is TEST ONLY in disposable databases; browser test gig skipped so Today is clean; no production seeding                    | Passed locally                                                    |

## Real-world checks still required

1. Backend HTTPS health is verified. Verify Neon database persistence and sleep recovery, and deploy/check the website and its CORS origin.
2. Configure the backend Firebase Admin service account and enable FCM HTTP v1. Verify its project/permissions.
3. The signed native APK is built with the real API URL and matching Firebase client. Install it on a physical ARM64 Android phone and verify startup/login.
4. Log in on the APK, grant notification permission, and verify both new-gig and due-follow-up pushes. Check foreground/background delivery and tapping a notification.
5. Exercise status, checklist, notes, earnings, portfolio links and clipboard on the real phone. Confirm changes appear on the laptop and vice versa, including after sleep/reopen.
6. Enable the scheduler workflow and its secrets. Check it actually wakes the deployed backend and sends due reminders. No exact-minute guarantee is claimed for a free scheduler.

See DEPENDENCY_NOTES.md for unresolved upstream tooling advisories. Local persistent setup was also checked: one user seeded from private backend/.env, correct-password login/logout passed, and zero gigs. The disposable browser-preview database was removed after testing.

Backend HTTPS health and an actual signed APK are verified. Deployed website/database behavior, physical-device use, provider delivery and complete Section 11 sign-off remain pending.

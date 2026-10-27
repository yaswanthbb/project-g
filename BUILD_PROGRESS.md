# Build progress

Implementation follows CODEX_SPEC.md Section 10. No OUT-list additions.

1. Backend/database/login: passed 5 API/setup/migration tests; bcrypt, persistent revocable sessions, Muse-only ingestion.
2. Gig CRUD/status/steps: passed 9 cumulative backend tests and Ruff; UTC-normalized timestamps.
3. Web Login/Today/Gig detail: passed build, ESLint, 2 component tests and real browser interactions against disposable local API; copy feedback, approval, sheets, and persisted notes/step checked.
4. Earnings/Portfolio/Retainers: passed 12 cumulative backend tests, web build/lint/component checks and browser portfolio/earnings verification.
5. Follow-ups/Android FCM: passed 16 cumulative backend tests including both dates, suppression, retry, deduplication and logout cleanup. Firebase adapter unverified with real provider.
6. Android: same seven screens implemented; passed TypeScript, 4 mocked native interaction tests, and Metro Android bundle export (824 modules). A signed standalone ARM64 release APK was built on 27 October 2026; signature, package, embedded API/Firebase configuration and alignment checks passed. Device checks remain pending.
7. Polish/acceptance: local checks complete: 18 API tests on each database, 4 web + 4 native tests, lint/types, web build, Android bundle, laptop/phone browser review, plain errors and clean Today. See ACCEPTANCE.md for pending deployment/provider/device checks.

All test gigs live in disposable test databases. No production data is seeded.

User authorized finishing all code with local tests while real APK/FCM verification remains pending. Firebase Android configuration is now present, verified for com.projectg.app, and ignored; the deployed API URL is configured in the mobile build and its HTTPS health endpoint is verified. Deployed backend Admin credentials/provider delivery have not been verified.

Android package locked by latest user instruction: `com.projectg.app`. Firebase config must match it.

Local persistent setup complete: private environment file, one seeded user, successful API login/logout, zero gigs. No secrets printed or staged.

27 October 2026 APK build: `mobile/dist/project-g-1.0.0-arm64-v8a.apk`, version 1.0.0/code 1, Android API 24+, 24,216,149 bytes. SHA-256: `943baccc0fea771a18ccf07bebe6802a942481e65201cfbe0bcc4d79bd1f16cd`. Release uses a private local signing key retained outside Git. Fixed native Expo/Firebase notification manifest merge through a reproducible config plugin. Mobile TypeScript, all 4 native tests, source lint, native release build, v2/v3 signatures, Firebase resource match, packaged API URL and 16 KB alignment passed. No device or live push success is claimed. No production data was created or changed.

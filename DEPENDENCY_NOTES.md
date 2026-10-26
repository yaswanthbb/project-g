# Dependency audit · 26 October 2026

Final npm audit: 8 high-severity package entries, 0 critical, 0 moderate. Several flagged packages share the same upstream root advisory. This is not an advisory-free release.

Compatible gRPC overrides were applied and the lockfile rebuilt. Web/native functional checks pass with this resolved tree. The remaining upstream root advisories are:

- **node-forge**: node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements. [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Reported affected range: `<=1.4.0`.
- **zod**: Zod can exhaust memory while validating oversized constrained collections. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Reported affected range: `<4.6.6`.

These come through Expo tooling/certificate and schema dependencies. The application does not expose its own certificate-signing service or Zod validation endpoint; that does not establish absence of risk in upstream tools. A forced Expo downgrade to old incompatible releases was not applied. Updating Zod from the Expo CLI's declared v3 API to v4 is not a compatible automatic patch. Recheck official upstream fixes before treating the app as release-ready.

The package lock and local tests are not a native APK security audit. No real-device or provider verification is implied.

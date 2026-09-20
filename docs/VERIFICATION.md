# Verification — 20 September 2026

## Passed locally

- TypeScript strict type check.
- 40 automated tests: input/location/translation/WhatsApp validation; actual migration execution and RLS/grant behavior in PGlite; posting limits; moderation; private contact access; blocking; suspension; idempotent photo retries; OAuth callback deduplication; deletion order and cleanup failure retry.
- Android Hermes JavaScript/assets export and web export.
- Expo Android prebuild/config generation.
- Browser UI at a 360px viewport: Marathi/Hindi switch, district selector, guest account screen, in-app Hindi privacy policy with Zero21 Studio contact. Language preference persisted on reload.
- Generated public policy pages use Zero21 Studio and zero21studiocompany@gmail.com. They are local files, not hosted yet.

## Remaining release checks

- Hosted Supabase/Google OAuth and Storage integration require owner's project setup; no production credentials were provided. SQL tests stub the auth/storage schemas and deletion tests mock network APIs.
- Signed Android device workflow, photo picker on real hardware, telephone/WhatsApp handoff, and Play submission are not verified by a JavaScript export.
- Owner must host public policy pages, provide Google/Play/EAS setup, review translations, and collect 20 real consented listings.
- Expo Doctor: 20/21 checks pass. Its compatibility service requests `expo@57.0.24`, `expo-image-picker@57.0.19`, and `expo-image-manipulator@57.0.19`; npm returns 404 for each at verification time. Project pins available stable versions 57.0.23/57.0.18/57.0.18. Do not switch to preview SDK 58 to silence this. Upgrade to the matching stable patches when published, then rerun checks.
- Dependency audit after patched test/image tooling: 0 critical, 0 high, 10 moderate (Expo/xcode/uuid toolchain), 1 low (esbuild development server). Do not apply audit's suggested Expo downgrade to SDK 46. Review upstream fixes before release; do not expose dev servers publicly.

See RELEASE.md for real-device and production acceptance steps. No production listings or fake KYC claims are included.

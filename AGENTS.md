# Gaav Bajar

Use caveman style for user-facing updates. Write normal code and documentation.

- Expo SDK 57, React Native 0.86, TypeScript, Supabase. Read versioned Expo documentation: https://docs.expo.dev/versions/v57.0.0/.
- Keep changes minimal and scoped. State assumptions; ask when product intent is unclear.
- Never put service-role secrets in the mobile app. Keep contacts private and enforce authorization in SQL, not only the UI.
- Maintain both Marathi and Hindi strings. Do not claim Aadhaar/KYC/identity verification; only Google email is verified.
- Run `npm run check` and Android bundle export for relevant changes. Native device and hosted Supabase checks remain release gates.
- `android/` and `ios/` are generated with Expo prebuild, not hand-maintained source.

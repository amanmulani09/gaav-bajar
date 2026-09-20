# Public policy and account-deletion pages

Generate the publishable pages with real owner details:

```sh
SUPPORT_EMAIL='your-real-support-address' APP_OPERATOR='Your legal name or business' npm run site:build
```

Host the generated `site/*.html` files on any static HTTPS host. Put its origin in `EXPO_PUBLIC_POLICY_URL`. No marketplace web release is needed. Pages work without the app; deletion requests arrive at the owner's email.

Do not publish an invented support address. The owner must actually monitor this inbox and fulfill verified requests within seven days, as stated on the generated page. No credentials belong in these files.

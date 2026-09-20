# Security review — 20 September 2026

## Remediation update — 20 September 2026

The audit below is a historical snapshot. The subsequent authorized code fixes add server-side contact-reveal limits, deployed browser security headers, encrypted native session storage, and a generated Android release-signing guard. See [SECURITY_FIXES.md](SECURITY_FIXES.md) for deployment and verification status. Repository visibility and licensing remain unchanged.

## Scope and outcome

Audit only, as requested. Repository remains public. No application, infrastructure, license, dependency, or deployment changes were made for this review. This document records findings; it is not a penetration-test certification.

Reviewed local source, SQL migrations, deletion functions, native configuration, reachable local Git history, npm advisories, GitHub repository metadata, and limited unauthenticated production requests. No production records were created, changed, or deleted. Existing authenticated buyer/seller accounts were not used for adversarial testing.

No privileged secret was found by the pattern scan, and tested anonymous routes did not disclose private records. This does not establish that the entire system is secure. The most important remaining issues are copyability of the public repository, contact-harvesting resistance, native release signing, and browser/session hardening.

## Findings and recommended order

### 1. Public source and permissive template license conflict with preventing copying

- **Confirmed:** `amanmulani09/gaav-bajar` is public and permits forks. GitHub reported zero forks at audit time; that cannot establish whether anyone cloned or copied it.
- Root `LICENSE:1` contains the Expo MIT license and Expo copyright notice. It expressly permits copying, modification, distribution, and sale subject to its conditions. This does not establish ownership of every application asset or contribution.
- Public web JavaScript, design, text, and displayed product photos can also be downloaded or screenshotted. Minification, hidden source maps, disabled right-click, and a public API key cannot prevent copying.
- **Decision:** user chose to keep the repository public. Source secrecy therefore remains unavailable. Clarify licensing of original application code/assets while retaining required third-party notices; obtain appropriate licensing advice before changing terms. Do not assume changing a license recalls existing copies or permissions.
- Technical protection should focus on authorization, abuse prevention, account security, and keeping privileged server logic/credentials server-side. Watermarks can discourage photo reuse but cannot guarantee prevention.

### 2. Contact lookup has no application-level harvesting limit

- **Priority: high for privacy hardening.** `supabase/migrations/202609200001_marketplace.sql:146` checks membership and listing visibility, then returns contact details. There is no per-user contact-reveal quota, cooldown, or audit trail in this function.
- A Google-signed-in user with onboarding completed could enumerate public listing IDs and repeatedly request phone numbers. This is an abuse of permitted access, not an anonymous access bypass.
- Posting and report quotas exist, but do not constrain contact reads. Infrastructure-level limits, if any, were not inspected and should not be assumed to prevent harvesting.
- **Next:** enforce a server-side contact-reveal budget, record minimal abuse-audit data, and decide reasonable repeat-contact behavior. Apply limits at the Supabase entry point; a Vercel-only limit does not cover direct Supabase requests. Test normal use and exhausted limits using disposable accounts/staging data.

### 3. Local Android release configuration uses the public debug signing key

- **Priority: high before native distribution.** `android/app/build.gradle:115` assigns the debug signing configuration to release. `android/app/debug.keystore` is tracked and uses standard debug credentials.
- This is a generated development configuration, not evidence that a published production binary is debug-signed. An EAS build may inject separate credentials; no signed APK/AAB or Play Console configuration was inspected.
- If distributed unchanged, the known signing key could be used to sign impersonating builds. It must not be the production release key.
- **Next:** configure protected production signing through the supported Expo/EAS workflow, use Play App Signing where applicable, and verify the actual release certificate before distribution. Regenerate native files through Expo rather than hand-editing generated source. Never commit a production keystore or its password.

### 4. Production web lacks explicit browser security headers

- **Priority: medium.** Live homepage has HTTPS/HSTS, but no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. `vercel.json:1` has no header rules.
- Missing framing protection permits embedding the app in another site's frame, creating clickjacking exposure. Missing CSP removes a useful defense against script injection; this review did not find an actual XSS exploit.
- **Next:** deny framing, set `nosniff` and an appropriate referrer policy, and introduce a tested CSP compatible with Expo, Supabase photos/API, and Vercel Analytics. Keep Google popup login and requested camera behavior working. Test headers on the deployed site, not only in source.
- The current static-export deployment process creates a separate deployment config. Future hardening must preserve header rules there as well as in repository `vercel.json`.

### 5. Session persistence is not protected by native secure storage

- **Priority: medium.** `src/core/storage/local.ts:3` creates MMKV without an encryption key and uses it to persist Supabase sessions. Web storage is accessible to scripts running on the same origin. Draft photos and contact fields use AsyncStorage.
- This is not public network access to sessions. Risk arises from malicious same-origin script execution on web or compromised/local device storage access. Android backup is disabled, which reduces one exposure route.
- **Next:** use a suitable secure-storage adapter for native session credentials, with migration and refresh/logout tests. On web, prioritize CSP/XSS prevention; JavaScript-readable browser storage cannot be made equivalent to HttpOnly cookies by changing its name or encrypting with a bundled key. A cookie-backed server architecture would be a separate design change.

### 6. Configuration guard misses legacy privileged JWT keys

- **Priority: low; deployment safety gap.** `src/core/supabase/client.ts:19` rejects new `sb_secret_` keys, but does not reject legacy JWT-format `service_role` keys. It also allows HTTP URLs outside localhost.
- No such privileged key or insecure production URL was found. This is a misconfiguration risk, not an observed leak. Runtime checks also cannot prevent a secret already substituted into a compiled bundle from being exposed.
- **Next:** validate public environment values before bundling; reject privileged key formats/roles and require HTTPS for hosted production URLs. Permit local HTTP only for deliberate local development.

### 7. Hosted email signup is enabled although the app uses Google

- **Priority: low.** The public Supabase auth settings report `google` and `email` enabled, signup allowed, and email auto-confirm disabled.
- SQL membership checks require a confirmed Google identity, so email-only signup does not bypass marketplace publishing/contact restrictions. Nevertheless, unused signup paths increase account-spam and support surface.
- **Next:** if Google-only authentication is intentional, disable unused email/password signup/provider options after checking whether any legitimate accounts depend on them. Keep database checks regardless.

### 8. Dependency and repository automation follow-up

- Full npm audit: **0 critical, 0 high, 10 moderate package entries, 1 low entry**. The ten moderate entries propagate one underlying `uuid` advisory through the Expo/Xcode build-tool chain; they are not ten distinct vulnerabilities.
- `uuid` advisory GHSA-w5hq-g745-h8pq concerns output-buffer bounds in v3/v5/v6. The inspected `xcode` call uses `uuid.v4()` without an output buffer. No reachable production exploit was established. Do not use `npm audit fix --force`: npm proposes an incompatible Expo downgrade.
- Low-severity `esbuild` advisory GHSA-g7r4-m6w7-qqqr concerns its development server on Windows. The audited machine is macOS and production is a static Vercel export. Update through a compatible toolchain patch and rerun checks.
- GitHub rulesets returned an empty list; classic branch protection returned 404. This suggests protection needs review, but the endpoint response alone cannot exclude permission limitations. Secret-scanning and vulnerability-alert endpoints also returned 404; their enabled state was **not verified**.
- No checked-in GitHub Actions/Dependabot configuration was found. Review required PR checks, secret scanning/push protection, dependency alerts, and account 2FA. Account-level 2FA was not audited.

## Checks completed

| Check | Result |
|---|---|
| TypeScript and existing test suite | `npm run check`: 81 tests passed, including SQL authorization and mocked deletion tests |
| Pattern scan | 162 reachable historical Git blobs plus current tracked/untracked non-ignored files and local `.env`; no matches for selected private-key, OAuth-secret, privileged Supabase key, GitHub token, AWS key, credential URL, or JWT patterns |
| Secret tracking | `.env` ignored; only `.env.example` tracked; tracked Android debug keystore is development material |
| Anonymous private-table requests | Contacts, profiles, reports, referrals, consent events, influencer codes, posting events: HTTP 401 |
| Anonymous public feed | Listings: HTTP 200; confirms public API key works while private requests are denied |
| Anonymous contact RPC | HTTP 401 |
| Unauthenticated deletion endpoints | Both HTTP 401; no mutations |
| Unsigned public URL for an existing listing photo | HTTP 400; public-bucket access not available |
| Public project-file exposure | `/.env`, `/.git/config`, `/package.json`, and tested current bundle `.map`: HTTP 404 |
| HTTPS | HSTS present on production homepage |

The pattern scan is limited to selected recognizable formats and locally reachable history; it is not a complete entropy-based scan of all remote branches, logs, backups, or provider secrets. Tests use a local PostgreSQL-compatible harness and mocked auth/storage for some cases; they are not a substitute for live cross-account testing.

## Existing controls worth keeping

- SQL row-level security, explicit table/function grants, ownership checks, and private contact separation.
- Google OAuth PKCE and callback URL validation.
- Authenticated deletion functions validate the bearer token with Supabase before using server-side privileged access. Their `verify_jwt=false` setting is not, by itself, an unauthenticated-delete flaw.
- Photo storage enforces owner paths, file size/type, and quotas. Viewing uses temporary signed URLs; copies already downloaded and URLs still valid until expiry cannot be recalled immediately.
- User text is rendered as text rather than injected HTML in inspected UI code.
- Production analytics strips URL queries/fragments and excludes authentication paths.

## Remaining audit boundaries

Not verified: hosted policy/schema parity in full, Google Cloud OAuth redirect allowlist and secrets, Vercel/Supabase team permissions, provider security advisors, backups/restore, production Android signing, authenticated cross-account API requests, real mobile behavior, or sustained abuse/load resistance. No claim is made that this review prevents cloning, scraping, or all attacks.

## References

- [Supabase API keys and trust boundaries](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)
- [Vercel header configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub repository licensing](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- [esbuild advisory](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)

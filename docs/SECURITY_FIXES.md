# Minimal security fixes — 20 September 2026

## Implemented

| Risk | Fix | Release status |
|---|---|---|
| Contact harvesting | `get_contact` returns seller contact only to the listing owner or the one buyer whose bid the seller accepted. Bid rows are private and seller decisions are enforced in SQL. | Added in migration `202609210001_bids` (hosted deployment remains a release gate) |
| Browser framing/script exposure | Enforced CSP, framing denial, `nosniff`, referrer policy, and permissions policy. Camera is allowed for the site; microphone/geolocation disabled. No COOP restriction was added that would sever the Google popup relationship. | Deployed to production web |
| Native plaintext sessions | Separate AES-256 MMKV store; randomly generated encryption key stored in Expo SecureStore (Android Keystore/iOS Keychain). Large sessions stay out of SecureStore's value-size constraints. Existing session keys migrate on access; old values are removed and the old store compacted. Secure-storage failures do not fall back to plaintext. | Included in native source and Android export; new native binary required |
| Debug-signed native releases | Expo config plugin adds a Gradle guard that rejects release packaging with missing credentials, the debug alias, or an Android Debug certificate. Debug builds remain available. No production signing key was generated or committed. | Generated Android source updated; production EAS credentials still required |

Repository remains public and licensing remains unchanged. Public frontend code/images remain copyable. Low-priority audit items were not folded into these changes.

## Verification

- `npm run check`: 104 tests passed. Bid checks cover denied pre-acceptance contact, seller-only decisions, private bid rows, accepted-buyer access, immutable consent history, and mandatory upgrade to the current consent version. Existing storage, auth, moderation, deletion, and session tests also pass.
- Web and Android Expo exports passed.
- Isolated Gradle tests: debug build allowed; debug-signed release blocked; missing signing blocked; disposable non-debug signer accepted. Test signing material lives only in a temporary directory and is not production credentials.
- Full Android release-task dry-run was not completed: offline configuration lacked cached Android Gradle Plugin 9.2.1; the online retry was stopped while resolving dependencies/installing missing Android SDK components. The guard was tested in an isolated real Gradle project, not a completed Android release build.
- The earlier hosted contact-limit migration was verified by checksum and read-only access checks. The replacing bid-gated migration `202609210001_bids` has not yet been deployed or verified against hosted Supabase.
- Production `contact_reveals` and `private_contacts` requests without a session return HTTP 401.
- Production response headers exactly match `vercel.json`; auth callback, social image, and analytics script return HTTP 200.
- Browser smoke check: public feed, real listing photo, ad detail, authenticated state, and seller editor with Camera/Gallery rendered. No captured CSP errors. No advertisement was published or deleted.
- Web deployment: `dpl_4Q6KDhhEEnp45JGw8b45rk8SG3Ff`, https://gaav-bajar.vercel.app.

## Deployment and remaining limits

- **Web:** already live. Static-export deployments must copy the repository's `headers` and `rewrites` into their deployment `vercel.json`; replacing that file with rewrite-only configuration would remove these protections. The CSP currently permits the configured production Supabase host; update it deliberately when introducing another backend.
- **Database:** the earlier contact-limit migration is deployed. Apply `202609210001_bids` in normal migration order, then perform seller/two-buyer authorization checks before release.
- **Native:** rebuild/reinstall after adding SecureStore. Verify login, background/foreground refresh, upgrade migration, and logout on a real device. Validate the final release certificate before distributing an APK/AAB. A web deployment cannot change an installed native app.
- Bid approval sharply narrows contact access but cannot recall contact details after an accepted buyer obtains them. Bid and contact rows cascade when the related listing or account is deleted; provider backups remain subject to provider retention schedules.
- Browser sessions remain JavaScript-readable, as before. CSP reduces injection exposure but does not provide HttpOnly-cookie isolation. Draft photos/contact fields still use AsyncStorage; this change protects native session credentials specifically.
- Native credential-store behavior and full OAuth/device end-to-end acceptance remain release checks; mocked unit tests and exports are not substitutes.

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the original audit and intentionally deferred findings.

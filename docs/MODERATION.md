# Owner moderation runbook

Use Supabase Dashboard with an administrator account. Never give service-role keys or dashboard access to regular users. Check reports and pending listings daily; remove urgent harmful content promptly.

## Review and act

- `reports`: unresolved rows include either `listing_id` or `seller_id`, reason, and time. Check listing content/photos and related seller. Set `resolved=true` only after action.
- `listings`: `pending` is hidden. Inspect `moderation_reason`, title, description, seller name, location and photos. After review, set `status='active'` to approve, or `status='removed'` to reject/take down. Record a short reason in `moderation_reason`. Never approve illegal goods, wildlife, drugs, weapons, abusive content, medicines, or pesticides. Livestock/property listings require particular attention to applicable local rules and ownership claims.
- `profiles`: set `suspended=true` for abusive sellers. This immediately hides their public listings and blocks new app writes/contact retrieval; do not delete Auth user directly while files remain.
- `listing_photos`: maps listing to storage paths. View photos with dashboard storage tools. Bucket stays private. Already issued signed links expire within ten minutes.
- No phone ownership or identity checks are performed. Do not tell users they are KYC verified.

## Deletion requests outside the app

1. Request must come from the same Google email as the account. Verify correspondence using the support mailbox; do not request Aadhaar, OTP, or password.
2. Within seven days of verification, set profile `deleting=true`. Record request handling in your restricted support mailbox (do not add identity documents).
3. Delete **all objects** under `listing-photos/<user UUID>/`, including unreferenced uploads and draft folders, using Storage dashboard/API. Use Storage API/dashboard, not direct `DELETE storage.objects`, which can leave underlying objects behind.
4. Delete Auth user using Authentication dashboard only after storage is empty. Profile/listings/contacts/photos/reports/blocks/posting events cascade.
5. Confirm completion by email. If cleanup fails, keep account hidden and retry; do not report success early.

In-app deletion automates this sequence. Edge Functions use server-only service-role credentials and never log contact values or tokens.

## Weekly quota hygiene

Review storage size, bandwidth, database size, and Supabase Free limits. Don't silently turn on paid services. Delete abandoned drafts older than 30 days after checking they are not active work: remove their storage prefix first, then listing row. Clear unreferenced images in active folders only after matching paths against `listing_photos`. Local drafts may still exist on users' devices; they can upload them again on retry.

Posting-event rows older than 30 days can be deleted; the active limit uses only the previous 24 hours. Review unresolved reports before removing old content. Changes to retention policy require updating both in-app policy JSON and public pages.

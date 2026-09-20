# Codebase architecture

Gaav Bajar uses a small feature-first structure. It keeps framework setup, business rules, external services, feature UI, and reusable UI separate without adding a state-management library.

```text
src/
  application/            app composition, navigation, overlays, global styles
  core/
    i18n/                 Marathi/Hindi dictionaries and error mapping
    marketplace/          domain rules and typed Supabase repository
    storage/              MMKV instance and Supabase storage adapter
    supabase/             configured Supabase client
  data/                   checked-in legal and Maharashtra location data
  features/
    auth/                 sign-in UI
    legal/                policy links and legal screens
    listings/             browse, editor, detail, cards, listing constants
    profile/              profile and account screen
  shared/ui/              reusable visual primitives and design tokens
supabase/
  migrations/             database schema, grants, functions, RLS, storage rules
  functions/              privileged deletion Edge Functions
site/                     generated public privacy/deletion pages
tests/                    domain, database authorization, deletion, retry tests
```

## Dependency direction

- `application` composes features and owns cross-feature state and navigation. This name avoids Expo Router's reserved `app` directory.
- `features` may use `core` and `shared`; feature screens do not call Supabase directly.
- `core/marketplace/repository.ts` is the data boundary for listings, profiles, uploads, RPCs, and deletion calls. UI code does not build database queries.
- `core` contains platform/service code and domain rules. It never imports feature or application UI.
- `shared` contains reusable UI only. It does not know about listings or profiles.
- Supabase migrations and Edge Functions remain independent deployment units.

New user-facing work belongs in its feature folder. Add shared code only after two features need it. Keep server authorization in SQL/Edge Functions even when client validation exists. Avoid broad barrel exports: direct imports make dependencies visible and reduce circular-import risk. Device-local favorites stay in the listings feature and use only listing IDs; current listing records still come through the repository. Referral codes are captured by profile UI, but validation and immutable attribution stay in `save_profile` and private database tables.

MMKV stores only small, frequently read values: auth session, language, and favorite IDs. Photo drafts stay in asynchronous storage because synchronous large-string writes would hurt responsiveness. `StyleSheet.create` remains the styling layer; NativeWind or Unistyles would add migration and runtime/build cost without fixing a measured bottleneck in this static MVP UI.

`MarketApp.tsx` remains the application controller for this MVP. If its state grows beyond the current marketplace flow, split business flows into focused hooks such as `useListings` and `useProfile`; do not introduce a global state library until navigation or shared-state needs justify it.

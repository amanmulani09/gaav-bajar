-- Versioned, one-time onboarding consent. Exact notices stay in the database for audit evidence.
create table public.consent_notices (
  version text not null,
  language text not null check (language in ('mr', 'hi', 'en')),
  notice_text text not null,
  created_at timestamptz not null default now(),
  primary key (version, language)
);

insert into public.consent_notices(version, language, notice_text) values
('onboarding-v1', 'mr', 'गाव बाजार तुमचे नाव, Google ईमेल, जाहिरातीची माहिती, फोटो, ठिकाण, मोबाइल क्रमांक आणि ऐच्छिक WhatsApp क्रमांक घेतो. तुमचे नाव, जाहिराती, फोटो आणि जाहिरातीचे ठिकाण सार्वजनिक दिसते. मोबाइल आणि WhatsApp क्रमांक फक्त सक्रिय जाहिरात उघडणाऱ्या Google ने लॉगिन केलेल्या वापरकर्त्यांना दिसतात. ही माहिती जाहिरात प्रकाशित करणे, खरेदीदार-विक्रेता संपर्क, गैरवापर रोखणे आणि मदत देण्यासाठी वापरतो. Supabase माहिती साठवते आणि Google लॉगिन देते. खाते न बनवून तुम्ही नकार देऊ शकता. जाहिरात किंवा खाते हटवून संमती मागे घेऊ शकता; खरेदीदारांनी आधी घेतलेल्या प्रती परत घेता येत नाहीत.'),
('onboarding-v1', 'hi', 'गाँव बाजार आपका नाम, Google ईमेल, विज्ञापन की जानकारी, फोटो, स्थान, मोबाइल नंबर और वैकल्पिक WhatsApp नंबर लेता है। आपका नाम, विज्ञापन, फोटो और विज्ञापन का स्थान सार्वजनिक दिखता है। मोबाइल और WhatsApp नंबर केवल सक्रिय विज्ञापन खोलने वाले Google से लॉगिन किए उपयोगकर्ताओं को दिखते हैं। यह जानकारी विज्ञापन प्रकाशित करने, खरीदार-विक्रेता संपर्क, दुरुपयोग रोकने और सहायता देने के लिए इस्तेमाल होती है। Supabase जानकारी रखता है और Google लॉगिन देता है। खाता न बनाकर आप मना कर सकते हैं। विज्ञापन या खाता हटाकर सहमति वापस ले सकते हैं; खरीदारों को पहले मिली प्रतियाँ वापस नहीं ली जा सकतीं।'),
('onboarding-v1', 'en', 'Gaav Bajar collects your name, Google email, listing details, photos, location, mobile number, and optional WhatsApp number. Your name, listings, photos, and listing location are public. Mobile and WhatsApp numbers are shown only to Google-signed-in users who open an active listing. We use this data to publish listings, connect buyers and sellers, prevent abuse, and provide support. Supabase stores the data and Google provides sign-in. You can decline by not creating an account. You can withdraw by deleting a listing or your account; copies already obtained by buyers cannot be recalled.');

alter table public.profiles
  add column data_consent_at timestamptz,
  add column data_consent_version text,
  add column data_consent_language text,
  add foreign key(data_consent_version, data_consent_language)
    references public.consent_notices(version, language);

create table public.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  version text not null,
  language text not null,
  accepted_at timestamptz not null default now(),
  foreign key(version, language)
    references public.consent_notices(version, language),
  unique(user_id, version)
);

alter table public.consent_notices enable row level security;
alter table public.consent_events enable row level security;
revoke all on public.consent_notices, public.consent_events
  from public, anon, authenticated;
grant all on public.consent_notices, public.consent_events to service_role;
grant usage, select on sequence public.consent_events_id_seq to service_role;

create or replace function public.member_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.google_user() and exists(
    select 1 from public.profiles
    where id = auth.uid()
      and not suspended
      and not deleting
      and terms_at is not null
      and data_consent_at is not null
  );
$$;

drop function public.save_profile(text, boolean, text);
create function public.save_profile(
  name text,
  accept_terms boolean,
  accept_data boolean,
  consent_version text,
  consent_language text,
  referral_code text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := upper(trim(coalesce(referral_code, '')));
  profile_exists boolean;
  consent_needed boolean;
  accepted_at timestamptz := now();
begin
  if not public.google_user() then raise exception 'loginRequired'; end if;
  if accept_terms is distinct from true then raise exception 'termsRequired'; end if;
  if coalesce(length(trim(name)), 0) not between 2 and 80
    or public.text_flagged(name) then raise exception 'nameInvalid'; end if;

  perform 1 from auth.users where id = auth.uid() for update;
  select exists(
    select 1 from public.profiles where id = auth.uid()
  ) into profile_exists;
  select not exists(
    select 1 from public.profiles
    where id = auth.uid() and data_consent_at is not null
  ) into consent_needed;

  if exists(
    select 1 from public.profiles
    where id = auth.uid() and (suspended or deleting)
  ) then raise exception 'suspended'; end if;

  if consent_needed and (
    accept_data is distinct from true
    or not exists(
      select 1 from public.consent_notices
      where version = consent_version and language = consent_language
    )
  ) then raise exception 'consentRequired'; end if;

  if normalized_code <> '' then
    if profile_exists then raise exception 'referralLocked'; end if;
    if normalized_code !~ '^[A-Z0-9_-]{3,32}$'
      or not exists(
        select 1 from public.influencer_codes
        where code = normalized_code and active
      ) then raise exception 'referralInvalid'; end if;
  end if;

  insert into public.profiles(
    id, display_name, terms_at,
    data_consent_at, data_consent_version, data_consent_language
  ) values(
    auth.uid(), trim(name), accepted_at,
    case when consent_needed then accepted_at end,
    case when consent_needed then consent_version end,
    case when consent_needed then consent_language end
  )
  on conflict(id) do update
    set display_name = excluded.display_name,
        terms_at = coalesce(public.profiles.terms_at, excluded.terms_at),
        data_consent_at = coalesce(
          public.profiles.data_consent_at, excluded.data_consent_at
        ),
        data_consent_version = coalesce(
          public.profiles.data_consent_version, excluded.data_consent_version
        ),
        data_consent_language = coalesce(
          public.profiles.data_consent_language, excluded.data_consent_language
        );

  if consent_needed then
    insert into public.consent_events(user_id, version, language, accepted_at)
    values(auth.uid(), consent_version, consent_language, accepted_at);
  end if;

  if normalized_code <> '' then
    insert into public.referrals(user_id, code)
    values(auth.uid(), normalized_code);
  end if;

  update public.listings
  set seller_name = trim(name)
  where owner_id = auth.uid();
end
$$;

revoke all on function public.save_profile(text, boolean, boolean, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_profile(text, boolean, boolean, text, text, text)
  to authenticated;

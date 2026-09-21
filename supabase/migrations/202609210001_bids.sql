-- Private offers. A seller must accept one before that buyer can reveal contact details.
insert into public.consent_notices(version, language, notice_text) values
('onboarding-v2', 'mr', 'गाव बाजार तुमचे नाव, Google ईमेल, जाहिरातीची माहिती, फोटो, जाहिरातीचे ठिकाण, मोबाइल क्रमांक, ऐच्छिक WhatsApp क्रमांक, बोलीची रक्कम, खरेदीदाराचे ठिकाण आणि ऐच्छिक नोंद घेतो. तुमचे नाव, जाहिराती, फोटो आणि जाहिरातीचे ठिकाण सार्वजनिक दिसते. बोली फक्त ती देणारा खरेदीदार आणि विक्रेता पाहू शकतात. मोबाइल आणि WhatsApp क्रमांक फक्त तुम्ही स्वीकारलेल्या बोलीच्या खरेदीदाराला दिसतात. ही माहिती जाहिरात प्रकाशित करणे, बोली व्यवस्थापित करणे, खरेदीदार-विक्रेता संपर्क, गैरवापर रोखणे आणि मदत देण्यासाठी वापरतो. Supabase माहिती साठवते आणि Google लॉगिन देते. खाते न बनवून तुम्ही नकार देऊ शकता. जाहिरात किंवा खाते हटवून संमती मागे घेऊ शकता; खरेदीदारांनी आधी घेतलेल्या प्रती परत घेता येत नाहीत.'),
('onboarding-v2', 'hi', 'गाँव बाजार आपका नाम, Google ईमेल, विज्ञापन की जानकारी, फोटो, विज्ञापन का स्थान, मोबाइल नंबर, वैकल्पिक WhatsApp नंबर, बोली की रकम, खरीदार का स्थान और वैकल्पिक नोट लेता है। आपका नाम, विज्ञापन, फोटो और विज्ञापन का स्थान सार्वजनिक दिखता है। बोली केवल उसे देने वाला खरीदार और विक्रेता देख सकते हैं। मोबाइल और WhatsApp नंबर केवल उस खरीदार को दिखते हैं जिसकी बोली आप स्वीकार करते हैं। यह जानकारी विज्ञापन प्रकाशित करने, बोलियाँ सँभालने, खरीदार-विक्रेता संपर्क, दुरुपयोग रोकने और सहायता देने के लिए इस्तेमाल होती है। Supabase जानकारी रखता है और Google लॉगिन देता है। खाता न बनाकर आप मना कर सकते हैं। विज्ञापन या खाता हटाकर सहमति वापस ले सकते हैं; खरीदारों को पहले मिली प्रतियाँ वापस नहीं ली जा सकतीं।'),
('onboarding-v2', 'en', 'Gaav Bajar collects your name, Google email, listing details, photos, listing location, mobile number, optional WhatsApp number, offer amount, buyer location, and optional offer note. Your name, listings, photos, and listing location are public. An offer is visible only to the buyer who made it and the seller. Mobile and WhatsApp numbers are shown only to the buyer whose offer you accept. We use this data to publish listings, manage offers, connect buyers and sellers, prevent abuse, and provide support. Supabase stores the data and Google provides sign-in. You can decline by not creating an account. You can withdraw by deleting a listing or your account; copies already obtained by buyers cannot be recalled.');

create or replace function public.member_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.google_user() and exists(
    select 1 from public.profiles
    where id=auth.uid() and not suspended and not deleting
      and terms_at is not null and data_consent_at is not null
      and data_consent_version='onboarding-v2'
  );
$$;

create or replace function public.save_profile(
  name text,
  accept_terms boolean,
  accept_data boolean,
  consent_version text,
  consent_language text,
  referral_code text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  normalized_code text := upper(trim(coalesce(referral_code, '')));
  profile_exists boolean;
  consent_needed boolean;
  accepted_at timestamptz := now();
begin
  if not public.google_user() then raise exception 'loginRequired'; end if;
  if accept_terms is distinct from true then raise exception 'termsRequired'; end if;
  if coalesce(length(trim(name)),0) not between 2 and 80
    or public.text_flagged(name) then raise exception 'nameInvalid'; end if;

  perform 1 from auth.users where id=auth.uid() for update;
  select exists(select 1 from public.profiles where id=auth.uid()) into profile_exists;
  select not exists(
    select 1 from public.profiles where id=auth.uid()
      and data_consent_at is not null
      and data_consent_version=consent_version
  ) into consent_needed;

  if exists(select 1 from public.profiles where id=auth.uid() and (suspended or deleting))
    then raise exception 'suspended'; end if;
  if consent_needed and (
    accept_data is distinct from true or not exists(
      select 1 from public.consent_notices
      where version=consent_version and language=consent_language
    )
  ) then raise exception 'consentRequired'; end if;

  if normalized_code <> '' then
    if profile_exists then raise exception 'referralLocked'; end if;
    if normalized_code !~ '^[A-Z0-9_-]{3,32}$' or not exists(
      select 1 from public.influencer_codes where code=normalized_code and active
    ) then raise exception 'referralInvalid'; end if;
  end if;

  insert into public.profiles(
    id,display_name,terms_at,data_consent_at,data_consent_version,data_consent_language
  ) values(
    auth.uid(),trim(name),accepted_at,accepted_at,consent_version,consent_language
  )
  on conflict(id) do update set
    display_name=excluded.display_name,
    terms_at=coalesce(public.profiles.terms_at,excluded.terms_at),
    data_consent_at=case when consent_needed then excluded.data_consent_at else public.profiles.data_consent_at end,
    data_consent_version=case when consent_needed then excluded.data_consent_version else public.profiles.data_consent_version end,
    data_consent_language=case when consent_needed then excluded.data_consent_language else public.profiles.data_consent_language end;

  if consent_needed then
    insert into public.consent_events(user_id,version,language,accepted_at)
      values(auth.uid(),consent_version,consent_language,accepted_at)
      on conflict(user_id,version) do nothing;
  end if;
  if normalized_code <> '' then
    insert into public.referrals(user_id,code) values(auth.uid(),normalized_code);
  end if;
  update public.listings set seller_name=trim(name) where owner_id=auth.uid();
end $$;

create table public.bids (
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(13,2) not null check (amount > 0 and amount <= 10000000000),
  district_id text not null references public.districts(id),
  taluka_id text,
  location text not null check (length(trim(location)) between 1 and 80),
  note text check (length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (listing_id, buyer_id),
  foreign key (taluka_id, district_id) references public.talukas(id, district_id)
);
create unique index bids_one_accepted_per_listing on public.bids(listing_id) where status = 'accepted';
create index bids_seller_queue on public.bids(listing_id, created_at desc);
alter table public.bids enable row level security;
revoke all on public.bids from public, anon, authenticated;
grant all on public.bids to service_role;

create function public.place_bid(
  target uuid,
  offer numeric,
  district text,
  taluka text,
  place text,
  message text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare listing_owner uuid;
begin
  if not public.member_ok() then raise exception 'profileRequired'; end if;
  select owner_id into listing_owner from public.listings
    where id = target and status = 'active' and public.seller_visible(owner_id)
    for update;
  if not found then raise exception 'notFound'; end if;
  if listing_owner = auth.uid() then raise exception 'invalid'; end if;
  if offer is null or offer <= 0 or offer > 10000000000 then raise exception 'bidAmountInvalid'; end if;
  if not exists(select 1 from public.districts where id = district)
    or (exists(select 1 from public.talukas where district_id = district)
      and not exists(select 1 from public.talukas where id = taluka and district_id = district))
    or coalesce(length(trim(place)), 0) not between 1 and 80
    then raise exception 'locationInvalid'; end if;
  if length(coalesce(message, '')) > 500 or public.text_flagged(coalesce(message, ''))
    then raise exception 'bidNoteInvalid'; end if;

  insert into public.bids(listing_id,buyer_id,amount,district_id,taluka_id,location,note)
    values(target,auth.uid(),offer,district,nullif(taluka,''),trim(place),nullif(trim(message),''))
  on conflict(listing_id,buyer_id) do update set
    amount=excluded.amount,district_id=excluded.district_id,taluka_id=excluded.taluka_id,
    location=excluded.location,note=excluded.note,status='pending',updated_at=now()
    where public.bids.status <> 'accepted';
  if not found then raise exception 'bidAlreadyAccepted'; end if;
end $$;

create function public.my_bid(target uuid)
returns table(
  listing_id uuid,buyer_id uuid,buyer_name text,amount numeric,district_id text,
  taluka_id text,location text,note text,status text,created_at timestamptz,updated_at timestamptz
) language plpgsql security definer set search_path = '' as $$
begin
  if not public.member_ok() then raise exception 'profileRequired'; end if;
  return query select b.listing_id,b.buyer_id,p.display_name,b.amount,b.district_id,
    b.taluka_id,b.location,b.note,b.status,b.created_at,b.updated_at
    from public.bids b join public.profiles p on p.id=b.buyer_id
    where b.listing_id=target and b.buyer_id=auth.uid();
end $$;

create function public.listing_bids(target uuid)
returns table(
  listing_id uuid,buyer_id uuid,buyer_name text,amount numeric,district_id text,
  taluka_id text,location text,note text,status text,created_at timestamptz,updated_at timestamptz
) language plpgsql security definer set search_path = '' as $$
begin
  if not public.member_ok() then raise exception 'profileRequired'; end if;
  if not exists(select 1 from public.listings where id=target and owner_id=auth.uid())
    then raise exception 'notFound'; end if;
  return query select b.listing_id,b.buyer_id,p.display_name,b.amount,b.district_id,
    b.taluka_id,b.location,b.note,b.status,b.created_at,b.updated_at
    from public.bids b join public.profiles p on p.id=b.buyer_id
    where b.listing_id=target order by b.created_at desc;
end $$;

create function public.decide_bid(target uuid, bidder uuid, approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.member_ok() then raise exception 'profileRequired'; end if;
  perform 1 from public.listings where id=target and owner_id=auth.uid() and status='active' for update;
  if not found then raise exception 'notFound'; end if;
  if approve then
    if exists(select 1 from public.bids where listing_id=target and status='accepted' and buyer_id<>bidder)
      then raise exception 'bidAlreadyAccepted'; end if;
    update public.bids set status='rejected',updated_at=now()
      where listing_id=target and status='pending' and buyer_id<>bidder;
    update public.bids set status='accepted',updated_at=now()
      where listing_id=target and buyer_id=bidder and status in ('pending','accepted');
  else
    update public.bids set status='rejected',updated_at=now()
      where listing_id=target and buyer_id=bidder and status='pending';
  end if;
  if not found then raise exception 'notFound'; end if;
end $$;

create or replace function public.get_contact(target uuid)
returns table(phone text, whatsapp text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.member_ok() then raise exception 'profileRequired'; end if;
  if not public.listing_visible(target) then raise exception 'notFound'; end if;
  if not exists(select 1 from public.listings where id=target and owner_id=auth.uid())
    and not exists(select 1 from public.bids where listing_id=target and buyer_id=auth.uid() and status='accepted')
    then raise exception 'bidNotAccepted'; end if;
  return query select c.phone,c.whatsapp from public.private_contacts c where c.listing_id=target;
end $$;

revoke all on function public.place_bid(uuid,numeric,text,text,text,text),
  public.my_bid(uuid),public.listing_bids(uuid),public.decide_bid(uuid,uuid,boolean)
  from public,anon,authenticated;
grant execute on function public.place_bid(uuid,numeric,text,text,text,text),
  public.my_bid(uuid),public.listing_bids(uuid),public.decide_bid(uuid,uuid,boolean)
  to authenticated;

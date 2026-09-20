-- Apply with Supabase CLI. All user writes go through narrow RPCs.
create table public.districts (id text primary key, name text not null);
create table public.talukas (id text primary key, district_id text not null references public.districts, name text not null, unique(id, district_id));
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (length(display_name) between 2 and 80),
  terms_at timestamptz, suspended boolean not null default false, deleting boolean not null default false
);
create table public.listings (
  id uuid primary key, owner_id uuid not null references public.profiles on delete cascade,
  seller_name text not null, title text not null default '', description text not null default '',
  category text not null default 'other' check (category in ('tractor','equipment','produce','livestock','land','property','other')),
  price numeric(13,2) check (price > 0 and price <= 10000000000),
  district_id text references public.districts, taluka_id text,
  village text not null default '', status text not null default 'draft' check (status in ('draft','active','pending','sold','removed')),
  search_text text generated always as (title || ' ' || description) stored,
  moderation_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(taluka_id, district_id) references public.talukas(id, district_id)
);
create table public.posting_events (owner_id uuid not null references public.profiles on delete cascade, created_at timestamptz not null default now());
alter table public.posting_events enable row level security;
create index posting_events_owner on public.posting_events(owner_id,created_at);
create index listings_feed on public.listings (created_at desc, id) where status = 'active';
create index listings_owner on public.listings(owner_id);
create index listings_location on public.listings(district_id, taluka_id, category);
create table public.private_contacts (
  listing_id uuid primary key references public.listings on delete cascade,
  phone text not null check (phone ~ '^91[6-9][0-9]{9}$'),
  whatsapp text check (whatsapp ~ '^91[6-9][0-9]{9}$'), consent_at timestamptz not null default now()
);
create table public.listing_photos (
  path text primary key, listing_id uuid not null references public.listings on delete cascade,
  position smallint not null check (position between 0 and 2), unique(listing_id,position)
);
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles on delete cascade,
  listing_id uuid references public.listings on delete cascade,
  seller_id uuid references public.profiles on delete cascade,
  reason text not null check (reason in ('fraud','prohibited','abuse','other')),
  created_at timestamptz not null default now(), resolved boolean not null default false,
  check (num_nonnulls(listing_id,seller_id) = 1)
);
create table public.user_blocks (
  blocker_id uuid references public.profiles on delete cascade, blocked_id uuid references public.profiles on delete cascade,
  primary key (blocker_id,blocked_id), check(blocker_id <> blocked_id)
);

create function public.google_user() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u join auth.identities i on i.user_id=u.id
    where u.id=auth.uid() and u.email_confirmed_at is not null and i.provider='google');
$$;
create function public.member_ok() returns boolean language sql stable security definer set search_path = '' as $$
 select public.google_user() and exists(select 1 from public.profiles where id=auth.uid() and not suspended and not deleting and terms_at is not null);
$$;
create function public.seller_visible(seller uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=seller and not suspended and not deleting)
   and not exists(select 1 from public.user_blocks where (blocker_id=auth.uid() and blocked_id=seller) or (blocker_id=seller and blocked_id=auth.uid()));
$$;
create function public.listing_visible(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.listings l where l.id=target and ((l.status='active' and public.seller_visible(l.owner_id)) or l.owner_id=auth.uid()));
$$;

alter table public.districts enable row level security;
alter table public.talukas enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.private_contacts enable row level security;
alter table public.listing_photos enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;
create policy districts_read on public.districts for select using(true);
create policy talukas_read on public.talukas for select using(true);
create policy profile_self on public.profiles for select to authenticated using(id=auth.uid());
create policy listings_read on public.listings for select using ((status='active' and public.seller_visible(owner_id)) or owner_id=auth.uid());
create policy photos_read on public.listing_photos for select using(public.listing_visible(listing_id));
create policy blocks_self on public.user_blocks for select to authenticated using(blocker_id=auth.uid());
-- private_contacts and reports deliberately have no client SELECT policy.

create function public.text_flagged(value text) returns boolean language sql immutable set search_path = '' as $$
 select lower(coalesce(value,'')) ~ '(https?://|www\.|[[:alnum:]-]+\.(com|in|org|net)([^[:alpha:]]|$)|[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9][[:space:]-]*[0-9]|porn|weapon|cocaine|heroin|बंदूक|अश्लील|गांजा|हथियार|दारू|शस्त्र|pesticide|कीटकनाशक|कीटनाशक|medicine|औषध)';
$$;
revoke all on function public.text_flagged(text) from public,anon,authenticated;

create function public.save_profile(name text, accept_terms boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.google_user() then raise exception 'loginRequired'; end if;
 if accept_terms is distinct from true then raise exception 'termsRequired'; end if;
 if coalesce(length(trim(name)),0) not between 2 and 80 or public.text_flagged(name) then raise exception 'nameInvalid'; end if;
 if exists(select 1 from public.profiles where id=auth.uid() and (suspended or deleting)) then raise exception 'suspended'; end if;
 insert into public.profiles(id,display_name,terms_at) values(auth.uid(),trim(name),now())
 on conflict(id) do update set display_name=excluded.display_name,terms_at=coalesce(public.profiles.terms_at,excluded.terms_at);
 update public.listings set seller_name=trim(name) where owner_id=auth.uid();
end $$;

create function public.begin_listing(target uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.member_ok() then raise exception 'profileRequired'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if exists(select 1 from public.listings where id=target and owner_id=auth.uid()) then return; end if;
 if (select count(*) from public.posting_events where owner_id=auth.uid() and created_at>now()-interval '1 day') >= 10
 or (select count(*) from public.listings where owner_id=auth.uid() and status in ('draft','active','pending')) >= 20
 then raise exception 'postingLimit'; end if;
 insert into public.posting_events(owner_id) values(auth.uid());
 insert into public.listings(id,owner_id,seller_name) select target,id,display_name from public.profiles where id=auth.uid();
end $$;

create function public.save_listing(target uuid, payload jsonb, paths text[]) returns text language plpgsql security definer set search_path = '' as $$
declare row public.listings; next_status text; item text; pos integer:=0; district text; taluka text; content text;
begin
 if not public.member_ok() then raise exception 'profileRequired'; end if;
 select * into row from public.listings where id=target and owner_id=auth.uid() for update;
 if not found then raise exception 'notFound'; end if;
 if row.status in ('removed','sold') then raise exception 'notEditable'; end if;
 if length(trim(payload->>'title')) not between 5 and 100 or coalesce(trim(payload->>'title'),'')='' then raise exception 'titleInvalid'; end if;
 if length(trim(payload->>'description')) not between 20 and 2000 or coalesce(trim(payload->>'description'),'')='' then raise exception 'descriptionInvalid'; end if;
 if coalesce(payload->>'category','') not in ('tractor','equipment','produce','livestock','land','property','other') then raise exception 'invalid'; end if;
 if nullif(payload->>'price','') is not null and ((payload->>'price') !~ '^[0-9]+(\.[0-9]{1,2})?$' or (payload->>'price')::numeric <= 0 or (payload->>'price')::numeric > 10000000000) then raise exception 'priceInvalid'; end if;
 district:=payload->>'district_id'; taluka:=nullif(payload->>'taluka_id','');
 if not exists(select 1 from public.districts where id=district)
 or (exists(select 1 from public.talukas where district_id=district) and not exists(select 1 from public.talukas where id=taluka and district_id=district))
 or coalesce(length(trim(payload->>'village')),0) not between 1 and 80 then raise exception 'locationInvalid'; end if;
 if coalesce(payload->>'phone','') !~ '^91[6-9][0-9]{9}$' or (nullif(payload->>'whatsapp','') is not null and (payload->>'whatsapp') !~ '^91[6-9][0-9]{9}$') then raise exception 'phoneInvalid'; end if;
 if (payload->>'consent') is distinct from 'true' then raise exception 'consentRequired'; end if;
 if paths is null or cardinality(paths)>3 or cardinality(paths)<>(select count(distinct x) from unnest(paths) x) then raise exception 'photoLimit'; end if;
 foreach item in array paths loop
  if item is null or item not like auth.uid()::text||'/'||target::text||'/%' or not exists(
   select 1 from storage.objects where bucket_id='listing-photos' and name=item
    and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 524288
  ) then raise exception 'photoInvalid'; end if;
 end loop;
 content:=lower(concat_ws(' ',payload->>'title',payload->>'description',payload->>'village',row.seller_name));
 next_status:=case when public.text_flagged(content) then 'pending' else 'active' end;
 update public.listings set title=trim(payload->>'title'),description=trim(payload->>'description'),category=payload->>'category',
 price=nullif(payload->>'price','')::numeric,district_id=district,taluka_id=taluka,village=trim(payload->>'village'),
 status=next_status,moderation_reason=case when next_status='pending' then 'Text/link rule matched; review required' end, updated_at=now() where id=target;
 insert into public.private_contacts(listing_id,phone,whatsapp) values(target,payload->>'phone',nullif(payload->>'whatsapp',''))
 on conflict(listing_id) do update set phone=excluded.phone,whatsapp=excluded.whatsapp,consent_at=now();
 delete from public.listing_photos where listing_id=target;
 foreach item in array paths loop
  insert into public.listing_photos(path,listing_id,position) values(item,target,pos); pos:=pos+1;
 end loop;
 return next_status;
end $$;

create function public.get_contact(target uuid) returns table(phone text,whatsapp text) language plpgsql security definer set search_path = '' as $$
begin
 if not public.member_ok() then raise exception 'profileRequired'; end if;
 if not public.listing_visible(target) then raise exception 'notFound'; end if;
 return query select c.phone,c.whatsapp from public.private_contacts c where c.listing_id=target;
end $$;
create function public.mark_sold(target uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.member_ok() then raise exception 'profileRequired'; end if;
 update public.listings set status='sold',updated_at=now() where id=target and owner_id=auth.uid() and status in ('active','pending');
 if not found then raise exception 'notFound'; end if;
end $$;
create function public.report_item(target uuid, kind text, why text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.member_ok() then raise exception 'profileRequired'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'postingLimit'; end if;
 if why not in ('fraud','prohibited','abuse','other') then raise exception 'invalid'; end if;
 if kind='listing' and public.listing_visible(target) then
  insert into public.reports(reporter_id,listing_id,reason) values(auth.uid(),target,why);
 elsif kind='seller' and public.seller_visible(target) and exists(select 1 from public.listings where owner_id=target and status='active') then
  insert into public.reports(reporter_id,seller_id,reason) values(auth.uid(),target,why);
 else raise exception 'notFound'; end if;
end $$;
create function public.block_seller(target uuid, blocked boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.member_ok() then raise exception 'profileRequired'; end if;
 if target=auth.uid() then raise exception 'invalid'; end if;
 if blocked then insert into public.user_blocks values(auth.uid(),target) on conflict do nothing;
 else delete from public.user_blocks where blocker_id=auth.uid() and blocked_id=target; end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('listing-photos','listing-photos',false,524288,array['image/jpeg']);
create function public.can_upload_photo(object_name text) returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
 -- Serialize quota checks with uploads and account/listing hiding during deletion.
 perform 1 from public.profiles where id=auth.uid() for update;
 if not public.member_ok() or object_name !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$') then return false; end if;
 perform 1 from public.listings where id::text=split_part(object_name,'/',2) and owner_id=auth.uid() and status in ('draft','active','pending') for update;
 if not found then return false; end if;
 return (select count(*) from storage.objects where bucket_id='listing-photos' and name like split_part(object_name,'/',1)||'/'||split_part(object_name,'/',2)||'/%')<6;
end $$;
create policy photo_upload on storage.objects for insert to authenticated with check(bucket_id='listing-photos' and public.can_upload_photo(name));
create policy photo_download on storage.objects for select using(bucket_id='listing-photos' and (
 (split_part(name,'/',1)=auth.uid()::text) or exists(select 1 from public.listing_photos p where p.path=name and public.listing_visible(p.listing_id))));
create policy photo_delete_unused on storage.objects for delete to authenticated using(bucket_id='listing-photos' and split_part(name,'/',1)=auth.uid()::text and not exists(select 1 from public.listing_photos p where p.path=name));

-- Supabase defaults otherwise grant EXECUTE to PUBLIC. Explicit allow-list.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.districts,public.talukas,public.listings,public.listing_photos to anon,authenticated;
grant select on public.profiles,public.user_blocks to authenticated;
revoke all on function public.google_user(),public.member_ok(),public.seller_visible(uuid),public.listing_visible(uuid),public.save_profile(text,boolean),public.begin_listing(uuid),public.save_listing(uuid,jsonb,text[]),public.get_contact(uuid),public.mark_sold(uuid),public.report_item(uuid,text,text),public.block_seller(uuid,boolean),public.can_upload_photo(text) from public,anon,authenticated;
grant execute on function public.seller_visible(uuid),public.listing_visible(uuid) to anon,authenticated;
grant execute on function public.google_user(),public.member_ok(),public.save_profile(text,boolean),public.begin_listing(uuid),public.save_listing(uuid,jsonb,text[]),public.get_contact(uuid),public.mark_sold(uuid),public.report_item(uuid,text,text),public.block_seller(uuid,boolean),public.can_upload_photo(text) to authenticated;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

create function public.my_blocks() returns table(id uuid,name text) language sql stable security definer set search_path = '' as $$
 select p.id,p.display_name from public.user_blocks b join public.profiles p on p.id=b.blocked_id where b.blocker_id=auth.uid();
$$;
revoke all on function public.my_blocks() from public,anon;
grant execute on function public.my_blocks() to authenticated;

-- Write-once influencer attribution. Codes are created and reported by owner only.
create table public.influencer_codes (
  code text primary key
    check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  label text not null check (length(trim(label)) between 2 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.referrals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null references public.influencer_codes(code),
  claimed_at timestamptz not null default now()
);
create index referrals_code on public.referrals(code, claimed_at);

alter table public.influencer_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on public.influencer_codes, public.referrals
  from public, anon, authenticated;

drop function public.save_profile(text, boolean);
create function public.save_profile(
  name text,
  accept_terms boolean,
  referral_code text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := upper(trim(coalesce(referral_code, '')));
  profile_exists boolean;
begin
  if not public.google_user() then raise exception 'loginRequired'; end if;
  if accept_terms is distinct from true then raise exception 'termsRequired'; end if;
  if coalesce(length(trim(name)), 0) not between 2 and 80
    or public.text_flagged(name) then raise exception 'nameInvalid'; end if;

  -- Serialize first-profile creation so referral attribution stays write-once.
  perform 1 from auth.users where id = auth.uid() for update;
  select exists(
    select 1 from public.profiles where id = auth.uid()
  ) into profile_exists;

  if exists(
    select 1 from public.profiles
    where id = auth.uid() and (suspended or deleting)
  ) then raise exception 'suspended'; end if;

  if normalized_code <> '' then
    if profile_exists then raise exception 'referralLocked'; end if;
    if normalized_code !~ '^[A-Z0-9_-]{3,32}$'
      or not exists(
        select 1 from public.influencer_codes
        where code = normalized_code and active
      ) then raise exception 'referralInvalid'; end if;
  end if;

  insert into public.profiles(id, display_name, terms_at)
  values(auth.uid(), trim(name), now())
  on conflict(id) do update
    set display_name = excluded.display_name,
        terms_at = coalesce(public.profiles.terms_at, excluded.terms_at);

  if normalized_code <> '' then
    insert into public.referrals(user_id, code)
    values(auth.uid(), normalized_code);
  end if;

  update public.listings
  set seller_name = trim(name)
  where owner_id = auth.uid();
end
$$;

revoke all on function public.save_profile(text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.save_profile(text, boolean, text)
  to authenticated;

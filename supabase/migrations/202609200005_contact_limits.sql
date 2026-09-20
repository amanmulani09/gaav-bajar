-- Keep only the latest reveal of each listing; no phone numbers are logged.
create table public.contact_reveals (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  revealed_at timestamptz not null default now(),
  primary key (viewer_id, listing_id)
);
create index contact_reveals_budget on public.contact_reveals(viewer_id, revealed_at);
alter table public.contact_reveals enable row level security;
revoke all on public.contact_reveals from public, anon, authenticated;
grant all on public.contact_reveals to service_role;

create or replace function public.get_contact(target uuid)
returns table(phone text, whatsapp text)
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize a buyer's requests so parallel calls cannot exceed the budget.
  perform 1 from public.profiles where id = auth.uid() for update;
  if not public.member_ok() then raise exception 'profileRequired'; end if;
  if not public.listing_visible(target) then raise exception 'notFound'; end if;
  if not exists(select 1 from public.private_contacts where listing_id = target)
    then raise exception 'notFound'; end if;

  if not exists(select 1 from public.listings where id = target and owner_id = auth.uid()) then
    delete from public.contact_reveals
      where viewer_id = auth.uid() and revealed_at <= now() - interval '24 hours';
    if not exists(select 1 from public.contact_reveals where viewer_id = auth.uid() and listing_id = target) then
      if (select count(*) from public.contact_reveals where viewer_id = auth.uid()) >= 20
        then raise exception 'contactLimit'; end if;
      insert into public.contact_reveals(viewer_id, listing_id) values(auth.uid(), target);
    end if;
  end if;
  return query select c.phone, c.whatsapp from public.private_contacts c where c.listing_id = target;
end $$;
revoke all on function public.get_contact(uuid) from public, anon;
grant execute on function public.get_contact(uuid) to authenticated;

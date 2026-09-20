-- Add vehicle and household categories without changing existing listings.
alter table public.listings drop constraint listings_category_check;
alter table public.listings add constraint listings_category_check check (category in ('tractor','equipment','produce','livestock','land','property','vehicles','household','other'));

create or replace function public.save_listing(target uuid, payload jsonb, paths text[]) returns text language plpgsql security definer set search_path = '' as $$
declare row public.listings; next_status text; item text; pos integer:=0; district text; taluka text; content text;
begin
 if not public.member_ok() then raise exception 'profileRequired'; end if;
 select * into row from public.listings where id=target and owner_id=auth.uid() for update;
 if not found then raise exception 'notFound'; end if;
 if row.status in ('removed','sold') then raise exception 'notEditable'; end if;
 if length(trim(payload->>'title')) not between 5 and 100 or coalesce(trim(payload->>'title'),'')='' then raise exception 'titleInvalid'; end if;
 if length(trim(payload->>'description')) not between 20 and 2000 or coalesce(trim(payload->>'description'),'')='' then raise exception 'descriptionInvalid'; end if;
 if coalesce(payload->>'category','') not in ('tractor','equipment','produce','livestock','land','property','vehicles','household','other') then raise exception 'invalid'; end if;
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
    and metadata->>'mimetype' like 'image/%' and (metadata->>'size')::bigint between 1 and 10485760
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

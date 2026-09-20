# Influencer referral operations

Referral attribution is intentionally small. Owner creates codes in Supabase. New user enters a code during first profile completion. Database stores one immutable attribution only after Google authentication, terms acceptance, and valid profile save.

## Create or disable a code

Run in Supabase SQL Editor with an owner/admin account:

```sql
insert into public.influencer_codes (code, label)
values ('KISAN01', 'Influencer name');

update public.influencer_codes
set active = false
where code = 'KISAN01';
```

Codes use 3–32 uppercase letters, numbers, `_`, or `-`. App normalizes user input to uppercase. Never recycle a code for another influencer.

## Count joined users

```sql
select
  c.code,
  c.label,
  c.active,
  count(r.user_id) as joined_users
from public.influencer_codes c
left join public.referrals r on r.code = c.code
group by c.code, c.label, c.active
order by joined_users desc, c.code;
```

`joined_users` counts profiles that completed Google login, accepted terms, and saved a valid code. It does not prove install source, identity, paid conversion, listing creation, or transaction. Decide payout rules separately and pay manually after reviewing suspicious patterns.

Client roles cannot read either referral table. Existing users cannot add or change attribution. Deleting an account deletes its referral row, so historical payout exports should be saved before account deletion if business records require them.

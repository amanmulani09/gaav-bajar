import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dictionaries } from "../src/core/i18n";

let db: PGlite;
const seller = "11111111-1111-4111-8111-111111111111",
  buyer = "22222222-2222-4222-8222-222222222222",
  nongoogle = "33333333-3333-4333-8333-333333333333",
  referred = "44444444-4444-4444-8444-444444444444";
const item = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const payload = {
  title: "चांगला ट्रॅक्टर",
  description: "पूर्ण चांगल्या स्थितीतील ट्रॅक्टर विकणे आहे.",
  category: "tractor",
  price: "125000",
  district_id: "490",
  taluka_id: "4195",
  village: "पुणे",
  phone: "919876543210",
  whatsapp: "",
  consent: true,
};
async function asUser(id: string | null) {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
    id || "",
  ]);
  await db.exec(`set role ${id ? "authenticated" : "anon"}`);
}
async function admin() {
  await db.exec("reset role");
}
async function publish(id = item, changes = {}) {
  return db.query(
    "select public.save_listing($1,$2::jsonb,$3::text[]) as status",
    [id, JSON.stringify({ ...payload, ...changes }), []],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid references auth.users on delete cascade,provider text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant select,insert,delete on storage.objects to anon,authenticated;
    insert into auth.users values('${seller}',now()),('${buyer}',now()),('${nongoogle}',now()),('${referred}',now());
    insert into auth.identities values('${seller}','google'),('${buyer}','google'),('${nongoogle}','email'),('${referred}','google');`);
  await db.exec(
    readFileSync("supabase/migrations/202609200001_marketplace.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609200002_locations.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609200003_referrals.sql", "utf8"),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202609200004_onboarding_consent.sql",
      "utf8",
    ),
  );
  await db.exec(readFileSync("supabase/migrations/202609200005_contact_limits.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/202609200006_image_upload_limits.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/202609200007_listing_categories.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/202609210001_bids.sql", "utf8"));
  await db.query(
    "insert into public.influencer_codes(code,label) values($1,$2)",
    ["FARM_01", "Test influencer"],
  );
  const taluka = await db.query<{ id: string }>(
    "select id from public.talukas where district_id='490' limit 1",
  );
  payload.taluka_id = taluka.rows[0].id;
  for (const id of [seller, buyer]) {
    await asUser(id);
    await db.query(
      "select public.save_profile($1,true,true,'onboarding-v2','mr')",
      [id === seller ? "शेतकरी नाव" : "खरेदीदार नाव"],
    );
  }
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe.sequential("database authorization and lifecycle", () => {
  it("stores the exact versioned notices shown in each app language", async () => {
    await admin();
    expect(
      (
        await db.query(
          "select language,notice_text from public.consent_notices where version='onboarding-v2' order by language",
        )
      ).rows,
    ).toEqual([
      { language: "en", notice_text: dictionaries.en.dataConsentNotice },
      { language: "hi", notice_text: dictionaries.hi.dataConsentNotice },
      { language: "mr", notice_text: dictionaries.mr.dataConsentNotice },
    ]);
  });
  it("requires Google identity and terms", async () => {
    await asUser(nongoogle);
    await expect(
      db.query(
        "select public.save_profile('No Google',true,true,'onboarding-v1','en')",
      ),
    ).rejects.toThrow("loginRequired");
    await asUser(seller);
    await expect(
      db.query(
        "select public.save_profile('Seller',false,true,'onboarding-v1','en')",
      ),
    ).rejects.toThrow("termsRequired");
    await expect(
      db.query(
        "select public.save_profile('Seller',null,true,'onboarding-v1','en')",
      ),
    ).rejects.toThrow("termsRequired");
    await expect(
      db.query(
        "select public.save_profile('visit https://spam.example',true,true,'onboarding-v1','en')",
      ),
    ).rejects.toThrow("nameInvalid");
    await asUser(referred);
    await expect(
      db.query(
        "select public.save_profile('Consent test',true,false,'onboarding-v1','en')",
      ),
    ).rejects.toThrow("consentRequired");
  });
  it("attributes a valid influencer code once and hides referral data", async () => {
    await asUser(referred);
    await expect(
      db.query(
        "select public.save_profile('नवीन वापरकर्ता',true,true,'onboarding-v1','mr','BAD')",
      ),
    ).rejects.toThrow("referralInvalid");
    await db.query(
      "select public.save_profile('नवीन वापरकर्ता',true,true,'onboarding-v1','mr','farm_01')",
    );
    await expect(db.query("select * from public.referrals")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query(
        "select public.save_profile('नवीन वापरकर्ता',true,true,'onboarding-v1','mr','OTHER')",
      ),
    ).rejects.toThrow("referralLocked");
    await admin();
    expect(
      (
        await db.query(
          "select user_id::text,code from public.referrals where user_id=$1",
          [referred],
        )
      ).rows,
    ).toEqual([{ user_id: referred, code: "FARM_01" }]);
    expect(
      (
        await db.query(
          "select version,language from public.consent_events where user_id=$1",
          [referred],
        )
      ).rows,
    ).toEqual([{ version: "onboarding-v1", language: "mr" }]);
    await asUser(referred);
    await expect(
      db.query("select * from public.consent_events"),
    ).rejects.toThrow("permission denied");
    await db.query(
      "select public.save_profile('नवीन वापरकर्ता',true,true,'onboarding-v1','hi')",
    );
    expect((await db.query("select public.member_ok() as ok")).rows).toEqual([
      { ok: false },
    ]);
    await db.query(
      "select public.save_profile('नवीन वापरकर्ता',true,true,'onboarding-v2','hi')",
    );
    expect((await db.query("select public.member_ok() as ok")).rows).toEqual([
      { ok: true },
    ]);
    await admin();
    expect(
      (
        await db.query(
          "select version,language from public.consent_events where user_id=$1 order by version",
          [referred],
        )
      ).rows,
    ).toEqual([
      { version: "onboarding-v1", language: "mr" },
      { version: "onboarding-v2", language: "hi" },
    ]);
  });
  it("creates idempotent drafts and publishes validated listings", async () => {
    await asUser(seller);
    await db.query("select public.begin_listing($1)", [item]);
    await db.query("select public.begin_listing($1)", [item]);
    expect((await publish()).rows).toEqual([{ status: "active" }]);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(1);
  });
  it("allows anonymous browsing but denies raw phone access and contact RPC", async () => {
    await asUser(null);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("select * from public.private_contacts"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("select public.get_contact($1)", [item]),
    ).rejects.toThrow("permission denied");
  });
  it("keeps contact hidden until the seller accepts a valid bid", async () => {
    await asUser(buyer);
    await expect(
      db.query("select * from public.get_contact($1)", [item]),
    ).rejects.toThrow("bidNotAccepted");
    await expect(
      db.query("select public.place_bid($1,0,$2,$3,'Pune',null)", [item, payload.district_id, payload.taluka_id]),
    ).rejects.toThrow("bidAmountInvalid");
    await expect(
      db.query("select public.place_bid($1,100000,$2,$3,'Pune','Call 9876543210')", [item, payload.district_id, payload.taluka_id]),
    ).rejects.toThrow("bidNoteInvalid");
    await db.query("select public.place_bid($1,100000,$2,$3,'Pune','Can inspect this week')", [item, payload.district_id, payload.taluka_id]);
    expect((await db.query("select amount,status from public.my_bid($1)", [item])).rows)
      .toEqual([{ amount: "100000.00", status: "pending" }]);
    await expect(
      db.query("select public.decide_bid($1,$2,true)", [item, buyer]),
    ).rejects.toThrow("notFound");
    await expect(publish()).rejects.toThrow("notFound");
    await expect(
      db.query("update public.listings set status='active'"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("select * from public.private_contacts"),
    ).rejects.toThrow("permission denied");
    await asUser(seller);
    expect((await db.query("select buyer_id::text,amount,status from public.listing_bids($1)", [item])).rows)
      .toEqual([{ buyer_id: buyer, amount: "100000.00", status: "pending" }]);
    await db.query("select public.decide_bid($1,$2,true)", [item, buyer]);
    await asUser(buyer);
    expect((await db.query("select * from public.get_contact($1)", [item])).rows)
      .toEqual([{ phone: payload.phone, whatsapp: null }]);
    await expect(db.query("select * from public.bids")).rejects.toThrow("permission denied");
    await expect(
      db.query("select public.place_bid($1,110000,$2,$3,'Pune',null)", [item, payload.district_id, payload.taluka_id]),
    ).rejects.toThrow("bidAlreadyAccepted");
  });
  it("validates contact consent and location on server", async () => {
    await asUser(seller);
    await expect(publish(item, { consent: false })).rejects.toThrow(
      "consentRequired",
    );
    await expect(publish(item, { district_id: "999" })).rejects.toThrow(
      "locationInvalid",
    );
    await expect(publish(item, { phone: "123" })).rejects.toThrow(
      "phoneInvalid",
    );
    await expect(publish(item, { title: null })).rejects.toThrow(
      "titleInvalid",
    );
    await expect(publish(item, { price: "-5" })).rejects.toThrow(
      "priceInvalid",
    );
  });
  it("keeps flagged content private and allows safe edit back to active", async () => {
    expect(
      (
        await publish(item, {
          description: "For full details visit https://spam.example please.",
        })
      ).rows,
    ).toEqual([{ status: "pending" }]);
    await asUser(buyer);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select * from public.get_contact($1)", [item]),
    ).rejects.toThrow("notFound");
    await asUser(null);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(0);
    await asUser(seller);
    await publish();
  });
  it("blocks listings and contact in both directions; can unblock", async () => {
    await asUser(buyer);
    await db.query("select public.block_seller($1,true)", [seller]);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select * from public.get_contact($1)", [item]),
    ).rejects.toThrow("notFound");
    expect(
      (await db.query("select * from public.my_blocks()")).rows,
    ).toHaveLength(1);
    await db.query("select public.block_seller($1,false)", [seller]);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(1);
  });
  it("accepts reports but hides reports from other users", async () => {
    await asUser(buyer);
    await db.query("select public.report_item($1,'listing','fraud')", [item]);
    await db.query("select public.report_item($1,'seller','abuse')", [seller]);
    await expect(db.query("select * from public.reports")).rejects.toThrow(
      "permission denied",
    );
  });
  it("accepts image MIME types through 10 MiB and rejects larger or non-image objects", async () => {
    await admin();
    expect((await db.query("select file_size_limit,allowed_mime_types,public from storage.buckets where id='listing-photos'")).rows).toEqual([
      { file_size_limit: 10485760, allowed_mime_types: ["image/*"], public: false },
    ]);
    const path = `${seller}/${item}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg`;
    await db.query("insert into storage.objects values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','listing-photos',$1,'{}')", [path]);
    for (const [mimetype, size, valid] of [
      ["image/png", 10485760, true], ["image/webp", 10485760, true],
      ["image/heic", 10485760, true], ["image/avif", 10485760, true],
      ["image/gif", 10485760, true], ["image/svg+xml", 10485760, true],
      ["image/jpeg", 10485761, false], ["application/pdf", 100, false],
    ] as const) {
      await admin();
      await db.query("update storage.objects set metadata=$1::jsonb where name=$2", [JSON.stringify({ mimetype, size }), path]);
      await asUser(seller);
      const save = db.query("select public.save_listing($1,$2::jsonb,$3::text[]) as status", [item, JSON.stringify(payload), [path]]);
      if (valid) expect((await save).rows).toEqual([{ status: "active" }]);
      else await expect(save).rejects.toThrow("photoInvalid");
    }
    await publish();
    await admin();
    await db.query("delete from storage.objects where name=$1", [path]);
  });
  it("publishes and filters vehicle and household categories while rejecting unknown categories", async () => {
    for (const category of ["vehicles", "household"]) {
      await asUser(seller);
      await publish(item, { category });
      await asUser(null);
      expect((await db.query("select id from public.listings where category=$1", [category])).rows).toEqual([{ id: item }]);
    }
    await asUser(seller);
    await expect(publish(item, { category: "unknown" })).rejects.toThrow("invalid");
    await publish();
  });
  it("denies foreign photo attachment and restricts storage upload paths", async () => {
    await asUser(seller);
    expect(
      (
        await db.query("select public.can_upload_photo($1) as allowed", [
          `${buyer}/${item}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`,
        ])
      ).rows,
    ).toEqual([{ allowed: false }]);
    await expect(
      db.query("select public.save_listing($1,$2::jsonb,$3::text[])", [
        item,
        JSON.stringify(payload),
        ["foreign.jpg"],
      ]),
    ).rejects.toThrow("photoInvalid");
    const path = `${seller}/${item}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
    await db.query(
      "insert into storage.objects values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','listing-photos',$1,$2::jsonb)",
      [path, JSON.stringify({ mimetype: "image/jpeg", size: 50000 })],
    );
    await db.query("select public.save_listing($1,$2::jsonb,$3::text[])", [
      item,
      JSON.stringify(payload),
      [path],
    ]);
    await asUser(null);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(1);
    await asUser(seller);
    await publish(item, {
      description: "Read https://spam.example for full details.",
    });
    await asUser(null);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(0);
    await asUser(seller);
    await publish();
  });
  it("hides suspended sellers and forbids publishing", async () => {
    await admin();
    await db.query("update public.profiles set suspended=true where id=$1", [
      seller,
    ]);
    await asUser(buyer);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(0);
    await asUser(seller);
    await expect(publish()).rejects.toThrow("profileRequired");
    await admin();
    await db.query("update public.profiles set suspended=false where id=$1", [
      seller,
    ]);
  });
  it("sold listings leave public feed and deny buyer contact", async () => {
    await asUser(seller);
    await db.query("select public.mark_sold($1)", [item]);
    await asUser(buyer);
    expect(
      (await db.query("select id from public.listings")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select * from public.get_contact($1)", [item]),
    ).rejects.toThrow("notFound");
    await asUser(seller);
    await expect(publish()).rejects.toThrow("notEditable");
  });
  it("enforces daily posting limit even for drafts", async () => {
    await asUser(seller);
    for (let i = 1; i < 10; i++)
      await db.query("select public.begin_listing($1)", [
        `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      ]);
    await expect(
      db.query(
        "select public.begin_listing('00000000-0000-4000-8000-000000000099')",
      ),
    ).rejects.toThrow("postingLimit");
  });
  it("deleting a draft cannot reset the daily posting limit", async () => {
    await admin();
    await db.query("delete from public.listings where id='00000000-0000-4000-8000-000000000009'");
    await asUser(seller);
    await expect(db.query("select public.begin_listing('00000000-0000-4000-8000-000000000099')")).rejects.toThrow("postingLimit");
  });
  it("client cannot self-clear moderation flags", async () => {
    await asUser(seller);
    await expect(db.query("update public.profiles set suspended=false where id=auth.uid()")).rejects.toThrow("permission denied");
  });
  it("account deletion cascades private and public relational data", async () => {
    await admin();
    await db.query("delete from auth.users where id=$1", [seller]);
    for (const table of [
      "listings",
      "private_contacts",
      "listing_photos",
      "bids",
      "reports",
    ])
      expect(
        (await db.query(`select * from public.${table}`)).rows,
      ).toHaveLength(0);
  });
});

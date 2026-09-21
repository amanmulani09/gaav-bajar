import { describe, expect, it } from "vitest";
import {
  currentConsentVersion,
  emptyDraft,
  emptyBidDraft,
  hasCurrentConsent,
  locations,
  normalizePhone,
  validateDraft,
  validateBid,
  whatsappUrl,
} from "../src/core/marketplace/domain";
import { dictionaries } from "../src/core/i18n";
import legal from "../src/data/legal.json";

const valid = () => ({
  ...emptyDraft("id"),
  title: "चांगला ट्रॅक्टर",
  description: "पूर्ण चांगल्या स्थितीतील ट्रॅक्टर विकणे आहे.",
  district_id: "490",
  taluka_id: locations.find((d) => d.id === "490")!.talukas[0].id,
  village: "पुणे",
  phone: "9876543210",
});
describe("listing validation", () => {
  it("allows contact-for-price and no photos", () =>
    expect(validateDraft(valid())).toBeNull());
  it("normalizes Indian numbers and rejects invalid ones", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizePhone("1234567890")).toBe("");
    expect(normalizePhone("91919876543210")).toBe("");
  });
  it.each(["0", "-1", "12abc", "1e4", "1.234", "10000000001"])(
    "rejects price %s",
    (price) =>
      expect(validateDraft({ ...valid(), price })).toBe("priceInvalid"),
  );
  it("rejects wrong district/taluka combination", () =>
    expect(
      validateDraft({ ...valid(), taluka_id: locations[0].talukas[0].id }),
    ).toBe("locationInvalid"));
  it("allows Mumbai City without taluka", () =>
    expect(
      validateDraft({ ...valid(), district_id: "482", taluka_id: "" }),
    ).toBeNull());
  it("rejects excess photos", () =>
    expect(
      validateDraft({ ...valid(), photos: Array(4).fill({ path: "x" }) }),
    ).toBe("photoLimit"));
});
describe("bid validation", () => {
  const bid = () => ({
    ...emptyBidDraft(),
    amount: "100000",
    district_id: "490",
    taluka_id: locations.find((d) => d.id === "490")!.talukas[0].id,
    location: "Pune",
  });
  it("requires a positive amount and complete location", () => {
    expect(validateBid(bid())).toBeNull();
    expect(validateBid({ ...bid(), amount: "0" })).toBe("bidAmountInvalid");
    expect(validateBid({ ...bid(), location: "" })).toBe("locationInvalid");
  });
  it("limits the optional note to 500 characters", () =>
    expect(validateBid({ ...bid(), note: "x".repeat(501) })).toBe(
      "bidNoteInvalid",
    ));
});
it("encodes WhatsApp message safely with listing ID", () => {
  const url = new URL(
    whatsappUrl("9876543210", "ट्रॅक्टर & गाडी?", "listing-123", "mr"),
  );
  expect(url.pathname).toBe("/919876543210");
  expect(url.searchParams.get("text")).toContain("ट्रॅक्टर & गाडी?");
  expect(url.searchParams.get("text")).toContain("listing-123");
});
it("ships matching nonempty Marathi/Hindi/English labels", () => {
  expect(Object.keys(dictionaries.mr).sort()).toEqual(
    Object.keys(dictionaries.hi).sort(),
  );
  expect(Object.keys(dictionaries.mr).sort()).toEqual(
    Object.keys(dictionaries.en).sort(),
  );
  for (const language of Object.values(dictionaries))
    for (const value of Object.values(language))
      expect(value.length).toBeGreaterThan(0);
});
it("requires the current disclosure version", () => {
  expect(currentConsentVersion).toBe("onboarding-v2");
  expect(
    hasCurrentConsent({
      id: "user",
      display_name: "Buyer",
      terms_at: "now",
      data_consent_at: "now",
      data_consent_version: "onboarding-v1",
      data_consent_language: "en",
      suspended: false,
      deleting: false,
    }),
  ).toBe(false);
});
it("privacy and terms disclose private offers in every language", () => {
  for (const language of Object.values(legal)) {
    const privacy = language.privacy.flat().join(" ").toLowerCase();
    const terms = language.terms.flat().join(" ").toLowerCase();
    expect(privacy).toMatch(/बोली|बोली|offer/);
    expect(terms).toMatch(/बोली|बोली|offer/);
    expect(privacy).not.toMatch(/signed-in users|लॉगिन केलेल्या वापरकर्त्यांना|लॉगिन किए उपयोगकर्ताओं/);
  }
});
it("uses English WhatsApp copy when English is selected", () => {
  const url = new URL(
    whatsappUrl("9876543210", "Farm tractor", "listing-456", "en"),
  );
  expect(url.searchParams.get("text")).toContain("Farm tractor");
  expect(url.searchParams.get("text")).toContain("Listing ID: listing-456");
});
it("has consistent official Maharashtra location snapshot", () => {
  expect(locations).toHaveLength(36);
  expect(locations.flatMap((d) => d.talukas)).toHaveLength(358);
  expect(
    new Set(locations.flatMap((d) => d.talukas.map((t) => t.id))).size,
  ).toBe(358);
});

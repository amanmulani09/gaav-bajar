import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  locations,
  normalizePhone,
  validateDraft,
  whatsappUrl,
} from "../src/core/marketplace/domain";
import { dictionaries } from "../src/core/i18n";

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

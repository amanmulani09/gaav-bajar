import { expect, it } from "vitest";
import { Listing } from "../src/core/marketplace/domain";
import { listingShareText, listingShareUrl, sharedListingId, whatsappShareUrl } from "../src/core/marketplace/sharing";

const id = "91b7c841-1e23-43fd-994e-c84cc9ff4484";

it("round-trips a stable public listing URL", () => {
  expect(sharedListingId(listingShareUrl(id))).toBe(id);
});

it.each([
  "https://evil.example/?listing=" + id,
  "https://gaav-bajar.vercel.app/auth/callback?listing=" + id,
  "https://gaav-bajar.vercel.app/?listing=invalid",
  `https://gaav-bajar.vercel.app/?listing=${id}&listing=${id}`,
  "not a URL",
])("ignores invalid or unrelated incoming link: %s", (url) => {
  expect(sharedListingId(url)).toBeNull();
});

it("shares public details and a bounded description, without private contact fields", () => {
  const item = {
    id, title: "ट्रॅक्टर & ट्रॉली", description: "x".repeat(500),
    village: "पुणे", district_id: "unknown", taluka_id: null,
    phone: "private-phone", whatsapp: "private-whatsapp",
  } as unknown as Listing;
  const message = listingShareText(item, "₹5,000", "गाव बाजार");
  expect(message).toContain(item.title);
  expect(message).toContain("₹5,000");
  expect(message).toContain("पुणे");
  expect(message).toContain(listingShareUrl(id));
  expect(message).toContain("x".repeat(240) + "…");
  expect(message).not.toContain("private-");
  expect(new URL(whatsappShareUrl(message)).searchParams.get("text")).toBe(message);
});

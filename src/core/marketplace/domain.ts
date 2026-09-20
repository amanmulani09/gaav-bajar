import locations from "../../data/locations.json";

export type Language = "mr" | "hi" | "en";
export const categories = [
  "tractor",
  "equipment",
  "produce",
  "livestock",
  "land",
  "property",
  "other",
] as const;
export type Category = (typeof categories)[number];
export type ListingStatus = "draft" | "active" | "pending" | "sold" | "removed";
export type Listing = {
  id: string;
  owner_id: string;
  seller_name: string;
  title: string;
  description: string;
  category: Category;
  price: number | null;
  district_id: string;
  taluka_id: string | null;
  village: string;
  status: ListingStatus;
  created_at: string;
  listing_photos: { path: string; position: number; url?: string }[];
};
export type Profile = {
  id: string;
  display_name: string;
  terms_at: string | null;
  data_consent_at: string | null;
  data_consent_version: string | null;
  data_consent_language: Language | null;
  suspended: boolean;
  deleting: boolean;
};
export type Photo = { path: string; uri?: string; base64?: string };
export type Draft = {
  id: string;
  title: string;
  description: string;
  category: Category;
  price: string;
  district_id: string;
  taluka_id: string;
  village: string;
  phone: string;
  whatsapp: string;
  photos: Photo[];
};
export { locations };
export function normalizePhone(value: string): string {
  const digits = value.replace(/[\s()+-]/g, "");
  const local =
    digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `91${local}` : "";
}
export function validateDraft(draft: Draft): string | null {
  if (draft.title.trim().length < 5 || draft.title.trim().length > 100)
    return "titleInvalid";
  if (
    draft.description.trim().length < 20 ||
    draft.description.trim().length > 2000
  )
    return "descriptionInvalid";
  if (!categories.includes(draft.category)) return "invalid";
  if (
    draft.price &&
    (!/^\d+(\.\d{1,2})?$/.test(draft.price) ||
      Number(draft.price) <= 0 ||
      Number(draft.price) > 1e10)
  )
    return "priceInvalid";
  const district = locations.find((d) => d.id === draft.district_id);
  if (
    !district ||
    (district.talukas.length > 0 &&
      !district.talukas.some((t) => t.id === draft.taluka_id))
  )
    return "locationInvalid";
  if (!draft.village.trim() || draft.village.trim().length > 80)
    return "locationInvalid";
  if (
    !normalizePhone(draft.phone) ||
    (draft.whatsapp && !normalizePhone(draft.whatsapp))
  )
    return "phoneInvalid";
  if (draft.photos.length > 3) return "photoLimit";
  return null;
}
export function locationLabel(
  listing: Pick<Listing, "district_id" | "taluka_id" | "village">,
): string {
  const district = locations.find((d) => d.id === listing.district_id);
  const taluka = district?.talukas.find((t) => t.id === listing.taluka_id);
  return [listing.village, taluka?.name, district?.name]
    .filter(Boolean)
    .join(" · ");
}
export function whatsappUrl(
  phone: string,
  title: string,
  id: string,
  language: Language,
): string {
  const text =
    language === "mr"
      ? `नमस्कार, गाव बाजारवरील “${title}” जाहिरातीबद्दल माहिती हवी आहे. क्रमांक: ${id}`
      : language === "hi"
        ? `नमस्ते, गाँव बाजार पर “${title}” के बारे में जानकारी चाहिए। क्रमांक: ${id}`
        : `Hello, I would like more information about “${title}” on Gaav Bajar. Listing ID: ${id}`;
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("phoneInvalid");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
export function emptyDraft(id: string): Draft {
  return {
    id,
    title: "",
    description: "",
    category: "tractor",
    price: "",
    district_id: "",
    taluka_id: "",
    village: "",
    phone: "",
    whatsapp: "",
    photos: [],
  };
}

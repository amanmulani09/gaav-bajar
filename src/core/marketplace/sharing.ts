import { Listing, locationLabel } from "./domain";

const site = "https://gaav-bajar.vercel.app";
const listingId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function listingShareUrl(id: string): string {
  if (!listingId.test(id)) throw new Error("notFound");
  return `${site}/?listing=${encodeURIComponent(id)}`;
}

export function sharedListingId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== site || parsed.pathname !== "/") return null;
    const ids = parsed.searchParams.getAll("listing");
    return ids.length === 1 && listingId.test(ids[0]) ? ids[0] : null;
  } catch {
    return null;
  }
}

export function listingShareText(item: Listing, price: string, brand: string): string {
  const description = item.description.trim();
  return [
    item.title,
    price,
    locationLabel(item),
    description.length > 240 ? `${description.slice(0, 240)}…` : description,
    brand,
    listingShareUrl(item.id),
  ].filter(Boolean).join("\n");
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

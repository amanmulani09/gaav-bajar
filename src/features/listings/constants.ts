import { Category } from "../../core/marketplace/domain";

export const categoryIcons: Record<Category, string> = {
  tractor: "🚜",
  equipment: "⚙",
  produce: "🌾",
  livestock: "🐄",
  land: "🌱",
  property: "⌂",
  other: "▦",
};

export const listingPageSize = 20;
export const favoriteIdsStorageKey = "favorite-listing-ids";
export const maxFavoriteListings = 100;

// Three base64 photos plus fields must fit Android AsyncStorage's 2 MiB row limit.
export const maxDraftPhotoBytes = 384 * 1024;

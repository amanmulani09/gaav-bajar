import { Category } from "../../core/marketplace/domain";

export const categoryIcons: Record<Category, string> = {
  tractor: "🚜",
  vehicles: "🚗",
  household: "🛋",
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

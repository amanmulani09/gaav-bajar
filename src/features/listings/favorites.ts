import { maxFavoriteListings } from "./constants";

export function parseFavoriteIds(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string"))]
      .filter(Boolean)
      .slice(0, maxFavoriteListings);
  } catch {
    return [];
  }
}

export function toggleFavoriteId(ids: string[], id: string): string[] {
  return ids.includes(id)
    ? ids.filter((item) => item !== id)
    : [id, ...ids].slice(0, maxFavoriteListings);
}

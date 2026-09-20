import { describe, expect, it } from "vitest";
import {
  parseFavoriteIds,
  toggleFavoriteId,
} from "../src/features/listings/favorites";

describe("local favorites", () => {
  it("parses only unique string IDs and tolerates invalid storage", () => {
    expect(parseFavoriteIds(null)).toEqual([]);
    expect(parseFavoriteIds("broken")).toEqual([]);
    expect(parseFavoriteIds(JSON.stringify(["a", 2, "a", "", "b"]))).toEqual([
      "a",
      "b",
    ]);
  });

  it("adds newest first, removes existing, and caps storage", () => {
    expect(toggleFavoriteId(["a"], "b")).toEqual(["b", "a"]);
    expect(toggleFavoriteId(["b", "a"], "b")).toEqual(["a"]);
    const ids = Array.from({ length: 100 }, (_, index) => String(index));
    const next = toggleFavoriteId(ids, "new");
    expect(next).toHaveLength(100);
    expect(next[0]).toBe("new");
    expect(next).not.toContain("99");
  });
});

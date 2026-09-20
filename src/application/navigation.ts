import type { TextKey } from "../core/i18n";

export type Screen =
  | "browse"
  | "favorites"
  | "post"
  | "mine"
  | "profile"
  | "detail"
  | "privacy"
  | "terms";

export type MainTab = Extract<
  Screen,
  "browse" | "favorites" | "post" | "mine" | "profile"
>;

export const mainTabs: { id: MainTab; icon: string; label: TextKey }[] = [
  { id: "browse", icon: "⌕", label: "buy" },
  { id: "favorites", icon: "♡", label: "favoritesTab" },
  { id: "post", icon: "⊕", label: "sell" },
  { id: "mine", icon: "▤", label: "mySales" },
  { id: "profile", icon: "○", label: "account" },
];

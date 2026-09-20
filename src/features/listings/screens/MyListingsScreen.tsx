import type { ReactNode } from "react";
import { Text } from "react-native";
import { Listing } from "../../../core/marketplace/domain";
import { Button, T, s } from "../../../shared/ui";
import { ListingCard } from "../components/ListingCard";

type Props = {
  t: T;
  signedIn: boolean;
  rows: Listing[];
  hasMore: boolean;
  loginCard: ReactNode;
  onPost: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onOpen: (item: Listing) => void;
};

export function MyListingsScreen({
  t,
  signedIn,
  rows,
  hasMore,
  loginCard,
  onPost,
  onRefresh,
  onLoadMore,
  onOpen,
}: Props) {
  return (
    <>
      <Text style={s.h1}>{t("mine")}</Text>
      {!signedIn ? (
        loginCard
      ) : (
        <>
          <Button label={`＋ ${t("post")}`} onPress={onPost} />
          <Button quiet label={t("refresh")} onPress={onRefresh} />
          {rows.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              own
              t={t}
              onPress={() => onOpen(item)}
            />
          ))}
          {!rows.length && <Text style={s.body}>{t("noMine")}</Text>}
          {hasMore && (
            <Button quiet label={t("loadMore")} onPress={onLoadMore} />
          )}
        </>
      )}
    </>
  );
}

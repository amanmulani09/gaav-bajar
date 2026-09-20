import { ActivityIndicator, Text, View } from "react-native";
import { Listing } from "../../../core/marketplace/domain";
import { Button, T, colors, s } from "../../../shared/ui";
import { ListingCard } from "../components/ListingCard";

type Props = {
  t: T;
  rows: Listing[];
  favoriteIds: string[];
  loading: boolean;
  onBrowse: () => void;
  onRefresh: () => void;
  onOpen: (item: Listing) => void;
  onToggleFavorite: (id: string) => void;
};

export function FavoritesScreen({
  t,
  rows,
  favoriteIds,
  loading,
  onBrowse,
  onRefresh,
  onOpen,
  onToggleFavorite,
}: Props) {
  return (
    <>
      <Text style={s.h1}>{t("favorites")}</Text>
      {loading && <ActivityIndicator size="large" color={colors.green} />}
      {!loading && !rows.length && (
        <View style={[s.card, { alignItems: "center", padding: 28 }]}>
          <Text style={{ fontSize: 42 }}>♡</Text>
          <Text style={s.h2}>{t("noFavorites")}</Text>
          <Text style={s.small}>{t("noFavoritesBody")}</Text>
          <Button label={t("buy")} onPress={onBrowse} />
        </View>
      )}
      {rows.map((item) => (
        <ListingCard
          key={item.id}
          item={item}
          t={t}
          favorite={favoriteIds.includes(item.id)}
          onPress={() => onOpen(item)}
          onToggleFavorite={() => onToggleFavorite(item.id)}
        />
      ))}
      {!!favoriteIds.length && !loading && (
        <Button quiet label={t("refresh")} onPress={onRefresh} />
      )}
    </>
  );
}

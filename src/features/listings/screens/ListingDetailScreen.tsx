import { Image } from "expo-image";
import { ScrollView, Text, View } from "react-native";
import { Listing, locationLabel } from "../../../core/marketplace/domain";
import { Button, T, s } from "../../../shared/ui";
import { listingStyles } from "../styles";
import { categoryIcons } from "../constants";
import { listingPrice } from "../components/ListingCard";
import { ListingShare } from "../components/ListingShare";

type Props = {
  t: T;
  item: Listing;
  own: boolean;
  signedIn: boolean;
  favorite: boolean;
  onBack: () => void;
  onEdit: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
  onContact: (channel: "call" | "whatsapp") => void;
  onReport: (kind: "listing" | "seller") => void;
  onBlock: () => void;
  onToggleFavorite: () => void;
};

export function ListingDetailScreen({
  t,
  item,
  own,
  signedIn,
  favorite,
  onBack,
  onEdit,
  onMarkSold,
  onDelete,
  onContact,
  onReport,
  onBlock,
  onToggleFavorite,
}: Props) {
  return (
    <>
      <Button quiet label={`← ${t("back")}`} onPress={onBack} />
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator
        contentContainerStyle={{ gap: 10 }}
      >
        {item.listing_photos.map((photo) => (
          <Image
            key={photo.path}
            source={{ uri: photo.url, cacheKey: photo.path }}
            style={listingStyles.detailPhoto}
            accessibilityLabel={item.title}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={150}
          />
        ))}
        {!item.listing_photos.length && (
          <View style={[listingStyles.detailPhoto, listingStyles.placeholder]}>
            <Text style={{ fontSize: 80 }}>{categoryIcons[item.category]}</Text>
          </View>
        )}
      </ScrollView>
      <Text style={listingStyles.category}>
        {t(item.category)} · {t(item.status)}
      </Text>
      <Text style={s.h1}>{item.title || t("draft")}</Text>
      <Text style={[listingStyles.price, { fontSize: 26 }]}>
        {listingPrice(item, t)}
      </Text>
      <Button
        quiet
        label={`${favorite ? "♥" : "♡"} ${t(
          favorite ? "removeFavorite" : "saveFavorite",
        )}`}
        onPress={onToggleFavorite}
      />
      <Text style={s.body}>{locationLabel(item)}</Text>
      <Text style={s.body}>{item.description}</Text>
      {item.status === "active" && <ListingShare key={item.id} item={item} t={t} />}
      <View style={s.card}>
        <Text style={s.small}>{t("seller")}</Text>
        <Text style={s.h2}>{item.seller_name}</Text>
        <Text style={s.badge}>✓ {t("verified")}</Text>
        <Text style={s.small}>{t("identityNote")}</Text>
      </View>
      {own ? (
        <>
          {["active", "pending", "draft"].includes(item.status) && (
            <Button label={t("edit")} onPress={onEdit} />
          )}
          {["active", "pending"].includes(item.status) && (
            <Button quiet label={t("markSold")} onPress={onMarkSold} />
          )}
          <Button danger label={t("delete")} onPress={onDelete} />
        </>
      ) : (
        <>
          <Button
            label={signedIn ? `☎ ${t("call")}` : t("loginContact")}
            onPress={() => onContact("call")}
          />
          <Button
            quiet
            label={t("whatsapp")}
            onPress={() => onContact("whatsapp")}
          />
          <View style={s.row}>
            <Button
              quiet
              label={t("reportListing")}
              onPress={() => onReport("listing")}
            />
            <Button
              quiet
              label={t("reportSeller")}
              onPress={() => onReport("seller")}
            />
          </View>
          <Button danger label={t("block")} onPress={onBlock} />
        </>
      )}
      <View style={listingStyles.safety}>
        <Text style={s.body}>{t("safetyBody")}</Text>
      </View>
      <Text selectable style={s.small}>
        {t("listingId")}: {item.id}
      </Text>
    </>
  );
}

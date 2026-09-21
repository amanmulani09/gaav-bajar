import { Image } from "expo-image";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import {
  Bid,
  BidDraft,
  Listing,
  locationLabel,
} from "../../../core/marketplace/domain";
import { Button, T, s } from "../../../shared/ui";
import { listingStyles } from "../styles";
import { categoryIcons } from "../constants";
import { listingPrice } from "../components/ListingCard";
import { ListingShare } from "../components/ListingShare";
import { BidSection } from "../components/BidSection";

type Props = {
  t: T;
  item: Listing;
  own: boolean;
  signedIn: boolean;
  favorite: boolean;
  bidDraft: BidDraft;
  bid: Bid | null;
  bids: Bid[];
  onBack: () => void;
  onEdit: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
  onContact: (channel: "call" | "whatsapp") => void;
  patchBidDraft: (update: Partial<BidDraft>) => void;
  onSubmitBid: () => void;
  onDecideBid: (buyerId: string, approve: boolean) => void;
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
  bidDraft,
  bid,
  bids,
  onBack,
  onEdit,
  onMarkSold,
  onDelete,
  onContact,
  patchBidDraft,
  onSubmitBid,
  onDecideBid,
  onReport,
  onBlock,
  onToggleFavorite,
}: Props) {
  const { width } = useWindowDimensions();
  const photoWidth = Math.min(width - 40, 680);

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
            style={[listingStyles.detailPhoto, { width: photoWidth }]}
            accessibilityLabel={item.title}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={150}
          />
        ))}
        {!item.listing_photos.length && (
          <View
            style={[
              listingStyles.detailPhoto,
              listingStyles.placeholder,
              { width: photoWidth },
            ]}
          >
            <Text style={{ fontSize: 80 }}>{categoryIcons[item.category]}</Text>
          </View>
        )}
      </ScrollView>
      <View style={listingStyles.detailSummary}>
        <Text style={listingStyles.category}>
          {t(item.category)} · {t(item.status)}
        </Text>
        <Text style={s.h1}>{item.title || t("draft")}</Text>
        <Text style={listingStyles.detailPrice}>{listingPrice(item, t)}</Text>
        <Text style={s.body}>📍 {locationLabel(item)}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.label}>{t("description")}</Text>
        <Text style={s.body}>{item.description}</Text>
      </View>
      {item.status === "active" && (
        <BidSection
          t={t}
          own={own}
          signedIn={signedIn}
          draft={bidDraft}
          bid={bid}
          bids={bids}
          patchDraft={patchBidDraft}
          onSubmit={onSubmitBid}
          onDecide={onDecideBid}
          onContact={onContact}
        />
      )}
      <View style={s.card}>
        <Text style={s.small}>{t("seller")}</Text>
        <Text style={s.h2}>{item.seller_name}</Text>
        <Text style={s.badge}>✓ {t("verified")}</Text>
        <Text style={s.small}>{t("identityNote")}</Text>
      </View>
      {!own && (
        <Button
          quiet
          label={`${favorite ? "♥" : "♡"} ${t(
            favorite ? "removeFavorite" : "saveFavorite",
          )}`}
          onPress={onToggleFavorite}
        />
      )}
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
      {item.status === "active" && (
        <ListingShare key={item.id} item={item} t={t} />
      )}
    </>
  );
}

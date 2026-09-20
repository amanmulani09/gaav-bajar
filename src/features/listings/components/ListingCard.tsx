import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { Listing, locationLabel } from "../../../core/marketplace/domain";
import { T, s } from "../../../shared/ui";
import { listingStyles } from "../styles";
import { categoryIcons } from "../constants";

type Props = {
  item: Listing;
  own?: boolean;
  favorite?: boolean;
  t: T;
  onPress: () => void;
  onToggleFavorite?: () => void;
};

export function listingPrice(item: Listing, t: T): string {
  return item.price
    ? `₹${Number(item.price).toLocaleString("en-IN")}`
    : t("contactPrice");
}

export function ListingCard({
  item,
  own = false,
  favorite = false,
  t,
  onPress,
  onToggleFavorite,
}: Props) {
  return (
    <View style={listingStyles.listing}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={listingStyles.cardMain}
      >
        {item.listing_photos[0]?.url ? (
          <Image
            source={{
              uri: item.listing_photos[0].url,
              cacheKey: item.listing_photos[0].path,
            }}
            style={listingStyles.thumbnail}
            accessibilityLabel={item.title}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[listingStyles.thumbnail, listingStyles.placeholder]}>
            <Text style={{ fontSize: 38 }}>{categoryIcons[item.category]}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={listingStyles.category}>
            {t(item.category)}
            {own ? ` · ${t(item.status)}` : ""}
          </Text>
          <Text style={listingStyles.listingTitle} numberOfLines={2}>
            {item.title || t("draft")}
          </Text>
          <Text style={listingStyles.price}>{listingPrice(item, t)}</Text>
          <Text style={s.small} numberOfLines={2}>
            {locationLabel(item)}
          </Text>
        </View>
      </Pressable>
      {onToggleFavorite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(favorite ? "removeFavorite" : "saveFavorite")}
          accessibilityState={{ selected: favorite }}
          onPress={onToggleFavorite}
          hitSlop={8}
          style={listingStyles.favoriteButton}
        >
          <Text style={listingStyles.favoriteIcon}>{favorite ? "♥" : "♡"}</Text>
        </Pressable>
      )}
    </View>
  );
}

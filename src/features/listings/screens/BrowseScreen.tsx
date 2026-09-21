import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  Category,
  Listing,
  categories,
  locations,
} from "../../../core/marketplace/domain";
import { Button, Field, Select, T, colors, s } from "../../../shared/ui";
import { listingStyles } from "../styles";
import { ListingCard } from "../components/ListingCard";
import { categoryIcons } from "../constants";

type Props = {
  t: T;
  rows: Listing[];
  favoriteIds: string[];
  loading: boolean;
  hasMore: boolean;
  query: string;
  category: string;
  district: string;
  taluka: string;
  search: string;
  setQuery: (value: string) => void;
  setCategory: (value: string) => void;
  setDistrict: (value: string) => void;
  setTaluka: (value: string) => void;
  setSearch: (value: string) => void;
  onToggleFavorite: (id: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onOpen: (item: Listing) => void;
  setupNotice?: string;
};

export function BrowseScreen({
  t,
  rows,
  favoriteIds,
  loading,
  hasMore,
  query,
  category,
  district,
  taluka,
  search,
  setQuery,
  setCategory,
  setDistrict,
  setTaluka,
  setSearch,
  onToggleFavorite,
  onRefresh,
  onLoadMore,
  onOpen,
  setupNotice,
}: Props) {
  const clearFilters = () => {
    setCategory("");
    setDistrict("");
    setTaluka("");
    setQuery("");
    setSearch("");
  };

  const header = (
    <View style={listingStyles.feedSection}>
      {setupNotice && (
        <View style={s.notice}>
          <Text style={s.body}>{setupNotice}</Text>
        </View>
      )}
      <View style={listingStyles.hero}>
        <Text style={listingStyles.eyebrow}>● {t("maharashtra")}</Text>
        <Text style={listingStyles.heroTitle}>{t("hero")}</Text>
        <Text style={listingStyles.heroBody}>{t("heroBody")}</Text>
      </View>
      <View style={listingStyles.searchBlock}>
        <Field
          label={t("search")}
          placeholder={t("titleHint")}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => setSearch(query)}
          maxLength={100}
        />
        <Button
          label={`🔍 ${t("searchAction")}`}
          onPress={() => setSearch(query)}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setCategory("")}
          style={[listingStyles.chip, !category && listingStyles.chipActive]}
        >
          <Text style={[listingStyles.chipText, !category && { color: "white" }]}>
            {t("all")}
          </Text>
        </Pressable>
        {categories.map((cat: Category) => (
          <Pressable
            key={cat}
            accessibilityRole="button"
            onPress={() => setCategory(category === cat ? "" : cat)}
            style={[
              listingStyles.chip,
              category === cat && listingStyles.chipActive,
            ]}
          >
            <Text
              style={[
                listingStyles.chipText,
                category === cat && { color: "white" },
              ]}
            >
              {categoryIcons[cat]} {t(cat)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={listingStyles.filterRow}>
        <View style={listingStyles.locationFilter}>
          <Select
            label={t("district")}
            value={district}
            options={[{ id: "", name: t("all") }, ...locations]}
            onChange={(value) => {
              setDistrict(value);
              setTaluka("");
            }}
            t={t}
          />
        </View>
        <View style={listingStyles.locationFilter}>
          <Select
            label={t("taluka")}
            value={taluka}
            options={[
              { id: "", name: t("all") },
              ...(locations.find((item) => item.id === district)?.talukas || []),
            ]}
            onChange={setTaluka}
            disabled={!district}
            t={t}
          />
        </View>
      </View>
      {(category || district || search) && (
        <Button quiet label={t("clearFilters")} onPress={clearFilters} />
      )}
      <View style={s.row}>
        <Text style={s.h2}>{t("latest")}</Text>
        <Text style={s.small}>↗ {t("maharashtra")}</Text>
      </View>
    </View>
  );
  const empty =
    !loading ? (
      <View style={[s.card, { alignItems: "center", padding: 28 }]}>
        <Text style={{ fontSize: 42 }}>🌱</Text>
        <Text style={s.h2}>{t("empty")}</Text>
        <Text style={s.small}>{t("emptyBody")}</Text>
        <Button quiet label={t("refresh")} onPress={onRefresh} />
      </View>
    ) : null;
  const footer = (
    <View style={listingStyles.feedSection}>
      {hasMore && (
        <Button
          quiet
          disabled={loading}
          label={t("loadMore")}
          onPress={onLoadMore}
        />
      )}
      <View style={listingStyles.safety}>
        <Text style={s.label}>✓ {t("safety")}</Text>
        <Text style={s.small}>{t("safetyBody")}</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ListingCard
          item={item}
          t={t}
          favorite={favoriteIds.includes(item.id)}
          onPress={() => onOpen(item)}
          onToggleFavorite={() => onToggleFavorite(item.id)}
        />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      contentContainerStyle={listingStyles.feedContent}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor={colors.green}
        />
      }
    />
  );
}

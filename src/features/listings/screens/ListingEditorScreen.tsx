import type { ReactNode } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import {
  Category,
  Draft,
  categories,
  locations,
} from "../../../core/marketplace/domain";
import { Button, Field, Select, T, s } from "../../../shared/ui";
import { listingStyles } from "../styles";

type Props = {
  t: T;
  draft: Draft;
  policyLinks: ReactNode;
  patchDraft: (update: Partial<Draft>) => void;
  onAddPhoto: () => void;
  onPublish: () => void;
  onDiscard: () => void;
};

export function ListingEditorScreen({
  t,
  draft,
  policyLinks,
  patchDraft,
  onAddPhoto,
  onPublish,
  onDiscard,
}: Props) {
  const district = locations.find((item) => item.id === draft.district_id);

  return (
    <>
      <Text style={s.h1}>{t("post")}</Text>
      <Text style={s.small}>{t("draftSaved")}</Text>
      <Field
        label={t("title")}
        value={draft.title}
        onChangeText={(title) => patchDraft({ title })}
        maxLength={100}
        placeholder={t("titleHint")}
      />
      <Select
        label={t("category")}
        value={draft.category}
        options={categories.map((id) => ({ id, name: t(id) }))}
        onChange={(value) => patchDraft({ category: value as Category })}
        t={t}
      />
      <Field
        label={t("description")}
        value={draft.description}
        onChangeText={(description) => patchDraft({ description })}
        maxLength={2000}
        multiline
        placeholder={t("descriptionHint")}
      />
      <Field
        label={t("price")}
        value={draft.price}
        onChangeText={(price) => patchDraft({ price })}
        keyboardType="decimal-pad"
        maxLength={14}
        placeholder={t("priceHint")}
      />
      <Select
        label={t("district")}
        value={draft.district_id}
        options={locations}
        onChange={(district_id) => patchDraft({ district_id, taluka_id: "" })}
        t={t}
      />
      {district?.talukas.length === 0 ? (
        <Text style={s.small}>{t("noTaluka")}</Text>
      ) : (
        <Select
          label={t("taluka")}
          value={draft.taluka_id}
          options={district?.talukas || []}
          onChange={(taluka_id) => patchDraft({ taluka_id })}
          t={t}
          disabled={!district}
        />
      )}
      <Field
        label={t("village")}
        value={draft.village}
        onChangeText={(village) => patchDraft({ village })}
        maxLength={80}
      />
      <Text style={s.label}>{t("photos")}</Text>
      <View style={listingStyles.photoRow}>
        {draft.photos.map((photo, index) => (
          <View key={photo.path} style={{ width: "30%", gap: 6 }}>
            <Image
              source={{
                uri: photo.base64
                  ? `data:image/jpeg;base64,${photo.base64}`
                  : photo.uri,
              }}
              style={listingStyles.editPhoto}
              contentFit="cover"
              cachePolicy="memory"
            />
            <Button
              quiet
              label={t("remove")}
              onPress={() =>
                patchDraft({
                  photos: draft.photos.filter((_, item) => item !== index),
                })
              }
            />
          </View>
        ))}
      </View>
      <Button
        quiet
        disabled={draft.photos.length >= 3}
        label={`＋ ${t("addPhoto")}`}
        onPress={onAddPhoto}
      />
      <Field
        label={t("phone")}
        value={draft.phone}
        onChangeText={(phone) => patchDraft({ phone })}
        keyboardType="phone-pad"
        maxLength={18}
      />
      <Field
        label={t("whatsappNumber")}
        value={draft.whatsapp}
        onChangeText={(whatsapp) => patchDraft({ whatsapp })}
        keyboardType="phone-pad"
        maxLength={18}
      />
      <View style={s.notice}>
        <Text style={s.small}>{t("listingContactNote")}</Text>
      </View>
      {policyLinks}
      <Button label={t("save")} onPress={onPublish} />
      <Button danger label={t("discard")} onPress={onDiscard} />
    </>
  );
}

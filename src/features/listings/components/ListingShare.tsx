import { useState } from "react";
import { Linking, Platform, Share, Text, View } from "react-native";
import { Listing } from "../../../core/marketplace/domain";
import { listingShareText, listingShareUrl, whatsappShareUrl } from "../../../core/marketplace/sharing";
import { T, Button, s } from "../../../shared/ui";
import { listingPrice } from "./ListingCard";

export function ListingShare({ item, t }: { item: Listing; t: T }) {
  const [notice, setNotice] = useState("");
  const url = listingShareUrl(item.id);
  const message = listingShareText(item, listingPrice(item, t), t("brand"));

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(t("linkCopied"));
    } catch {
      setNotice(t("shareCopyHint"));
    }
  }

  async function share() {
    if (Platform.OS === "web" && !navigator.share) {
      await copyLink();
      return;
    }
    try {
      await Share.share({ title: item.title, message });
    } catch (error) {
      if ((error as { name?: string }).name !== "AbortError")
        setNotice(t("shareFailed"));
    }
  }

  return (
    <View style={s.card}>
      <Text style={s.h2}>{t("shareListing")}</Text>
      <Button
        label={t("shareWhatsApp")}
        onPress={() => {
          void Linking.openURL(whatsappShareUrl(message)).catch(() => setNotice(t("shareFailed")));
        }}
      />
      <Button quiet label={t("shareOther")} onPress={() => void share()} />
      {Platform.OS === "web" && (
        <Button quiet label={t("copyLink")} onPress={() => void copyLink()} />
      )}
      <Text selectable style={s.small}>{url}</Text>
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.small}>{notice}</Text>}
    </View>
  );
}

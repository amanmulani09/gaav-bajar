import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Profile } from "../../../core/marketplace/domain";
import { Button, Check, Field, T, s } from "../../../shared/ui";

type Block = { id: string; name: string };

type Props = {
  t: T;
  email?: string;
  profile: Profile | null;
  name: string;
  referralCode: string;
  terms: boolean;
  dataConsent: boolean;
  blocks: Block[];
  loginCard: ReactNode;
  policyLinks: ReactNode;
  setName: (value: string) => void;
  setReferralCode: (value: string) => void;
  setTerms: (value: boolean) => void;
  setDataConsent: (value: boolean) => void;
  onSave: () => void;
  onUnblock: (id: string) => void;
  onSignOut: () => void;
  onDelete: () => void;
  onHelp: () => void;
  onDeclineConsent: () => void;
};

export function ProfileScreen({
  t,
  email,
  profile,
  name,
  referralCode,
  terms,
  dataConsent,
  blocks,
  loginCard,
  policyLinks,
  setName,
  setReferralCode,
  setTerms,
  setDataConsent,
  onSave,
  onUnblock,
  onSignOut,
  onDelete,
  onHelp,
  onDeclineConsent,
}: Props) {
  const needsConsent = !profile?.data_consent_at;
  return (
    <>
      <Text style={s.h1}>{t("profile")}</Text>
      {!email ? (
        loginCard
      ) : (
        <>
          <Text style={s.badge}>✓ {t("verified")}</Text>
          <Text style={s.body}>{email}</Text>
          <Text style={s.small}>{t("identityNote")}</Text>
          {(profile?.suspended || profile?.deleting) && (
            <View style={s.notice}>
              <Text style={s.body}>
                {t(profile.deleting ? "deleting" : "suspended")}
              </Text>
            </View>
          )}
          <Field
            label={t("name")}
            value={name}
            maxLength={80}
            onChangeText={setName}
          />
          {!profile && (
            <>
              <Field
                label={t("referralCode")}
                value={referralCode}
                maxLength={32}
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) =>
                  setReferralCode(value.toUpperCase().replace(/\s/g, ""))
                }
              />
              <Text style={s.small}>{t("referralHint")}</Text>
            </>
          )}
          {needsConsent && (
            <View style={s.card}>
              <Text style={s.h2}>{t("dataConsentTitle")}</Text>
              <Text style={s.body}>{t("dataConsentNotice")}</Text>
              <Text style={s.small}>{t("consentVersion")}</Text>
              <Check
                label={t("dataConsentAgree")}
                checked={dataConsent}
                onChange={setDataConsent}
              />
            </View>
          )}
          <Check
            label={t("termsAccept")}
            checked={terms}
            onChange={setTerms}
          />
          {policyLinks}
          <Button
            disabled={
              profile?.suspended ||
              profile?.deleting ||
              !terms ||
              (needsConsent && !dataConsent)
            }
            label={t("saveProfile")}
            onPress={onSave}
          />
          {needsConsent && (
            <Button
              quiet
              label={t("consentDecline")}
              onPress={onDeclineConsent}
            />
          )}
          <Text style={s.h2}>{t("blocked")}</Text>
          {!blocks.length && <Text style={s.small}>{t("noBlocks")}</Text>}
          {blocks.map((block) => (
            <View key={block.id} style={s.row}>
              <Text style={[s.body, { flex: 1 }]}>{block.name}</Text>
              <Button
                quiet
                label={t("unblock")}
                onPress={() => onUnblock(block.id)}
              />
            </View>
          ))}
          <Button quiet label={t("logout")} onPress={onSignOut} />
          <Button danger label={t("deleteAccount")} onPress={onDelete} />
        </>
      )}
      {!email && policyLinks}
      <Button quiet label={t("help")} onPress={onHelp} />
    </>
  );
}

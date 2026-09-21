import { Text, View } from "react-native";
import {
  Bid,
  BidDraft,
  locations,
} from "../../../core/marketplace/domain";
import { Button, Field, Select, T, s } from "../../../shared/ui";

type Props = {
  t: T;
  own: boolean;
  signedIn: boolean;
  draft: BidDraft;
  bid: Bid | null;
  bids: Bid[];
  patchDraft: (update: Partial<BidDraft>) => void;
  onSubmit: () => void;
  onDecide: (buyerId: string, approve: boolean) => void;
  onContact: (channel: "call" | "whatsapp") => void;
};

function money(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function place(bid: Bid) {
  const district = locations.find((item) => item.id === bid.district_id);
  const taluka = district?.talukas.find((item) => item.id === bid.taluka_id);
  return [bid.location, taluka?.name, district?.name].filter(Boolean).join(" · ");
}

function statusLabel(t: T, status: Bid["status"]) {
  return t(
    status === "accepted"
      ? "bidAccepted"
      : status === "rejected"
        ? "bidRejected"
        : "bidPending",
  );
}

export function BidSection({
  t,
  own,
  signedIn,
  draft,
  bid,
  bids,
  patchDraft,
  onSubmit,
  onDecide,
  onContact,
}: Props) {
  if (own) {
    return (
      <View style={s.stack}>
        <Text style={s.h2}>{t("receivedBids")}</Text>
        {!bids.length && <Text style={s.small}>{t("noBids")}</Text>}
        {bids.map((item) => (
          <View key={item.buyer_id} style={s.card}>
            <Text style={s.h2}>{money(item.amount)}</Text>
            <Text style={s.badge}>{statusLabel(t, item.status)}</Text>
            <Text style={s.body}>{item.buyer_name}</Text>
            <Text style={s.small}>{place(item)}</Text>
            {item.note ? <Text style={s.body}>{item.note}</Text> : null}
            {item.status === "pending" && (
              <>
                <Button
                  label={t("acceptBid")}
                  onPress={() => onDecide(item.buyer_id, true)}
                />
                <Button
                  danger
                  label={t("rejectBid")}
                  onPress={() => onDecide(item.buyer_id, false)}
                />
              </>
            )}
          </View>
        ))}
      </View>
    );
  }

  const district = locations.find((item) => item.id === draft.district_id);
  const accepted = bid?.status === "accepted";
  return (
    <View style={[s.card, s.stack]}>
      <Text style={s.h2}>{accepted ? t("bidAcceptedTitle") : t("makeBid")}</Text>
      {bid && (
        <View style={s.notice}>
          <Text style={s.body}>
            {t("yourBid")}: {money(bid.amount)} · {statusLabel(t, bid.status)}
          </Text>
        </View>
      )}
      {accepted ? (
        <>
          <Text style={s.small}>{t("contactUnlocked")}</Text>
          <Button label={`☎ ${t("call")}`} onPress={() => onContact("call")} />
          <Button quiet label={t("whatsapp")} onPress={() => onContact("whatsapp")} />
        </>
      ) : (
        <>
          <Text style={s.small}>{t("bidHelp")}</Text>
          <Field
            label={t("bidAmount")}
            value={draft.amount}
            onChangeText={(amount) => patchDraft({ amount })}
            keyboardType="decimal-pad"
            maxLength={14}
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
            label={t("bidLocation")}
            value={draft.location}
            onChangeText={(location) => patchDraft({ location })}
            maxLength={80}
          />
          <Field
            label={t("bidNote")}
            value={draft.note}
            onChangeText={(note) => patchDraft({ note })}
            multiline
            maxLength={500}
            placeholder={t("bidNoteHint")}
          />
          <Button
            label={signedIn ? t(bid ? "updateBid" : "sendBid") : t("loginToBid")}
            onPress={onSubmit}
          />
        </>
      )}
    </View>
  );
}

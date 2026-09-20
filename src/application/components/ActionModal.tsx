import { Modal, Text, View } from "react-native";
import { Button, T, s } from "../../shared/ui";
import { styles } from "../styles";

export type Confirmation = {
  text: string;
  action: () => Promise<void>;
};

export type ReportReason = "fraud" | "prohibited" | "abuse" | "other";

type Props = {
  t: T;
  notice: string | null;
  confirmation: Confirmation | null;
  reporting: boolean;
  onClose: () => void;
  onConfirm: (action: () => Promise<void>) => void;
  onReport: (reason: ReportReason) => void;
};

export function ActionModal({
  t,
  notice,
  confirmation,
  reporting,
  onClose,
  onConfirm,
  onReport,
}: Props) {
  return (
    <Modal
      visible={Boolean(notice || confirmation || reporting)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <View style={[s.card, styles.dialog]}>
          {notice ? (
            <>
              <Text style={s.body}>{notice}</Text>
              <Button label={t("ok")} onPress={onClose} />
            </>
          ) : confirmation ? (
            <>
              <Text style={s.body}>{confirmation.text}</Text>
              <Button
                danger
                label={t("confirm")}
                onPress={() => onConfirm(confirmation.action)}
              />
              <Button quiet label={t("cancel")} onPress={onClose} />
            </>
          ) : (
            reporting && (
              <>
                <Text style={s.h2}>{t("reportReason")}</Text>
                {(["fraud", "prohibited", "abuse", "other"] as const).map(
                  (reason) => (
                    <Button
                      key={reason}
                      quiet
                      label={t(reason)}
                      onPress={() => onReport(reason)}
                    />
                  ),
                )}
                <Button quiet label={t("cancel")} onPress={onClose} />
              </>
            )
          )}
        </View>
      </View>
    </Modal>
  );
}

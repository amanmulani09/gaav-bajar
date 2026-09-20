import { View } from "react-native";
import { Button, T, s } from "../../../shared/ui";

export function PolicyLinks({
  t,
  onOpen,
}: {
  t: T;
  onOpen: (target: "privacy" | "terms") => void;
}) {
  return (
    <View style={s.row}>
      <Button quiet label={t("terms")} onPress={() => onOpen("terms")} />
      <Button quiet label={t("privacy")} onPress={() => onOpen("privacy")} />
    </View>
  );
}

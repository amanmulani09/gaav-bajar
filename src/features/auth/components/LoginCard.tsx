import { Text, View } from "react-native";
import { Button, T, s } from "../../../shared/ui";

export function LoginCard({ t, onLogin }: { t: T; onLogin: () => void }) {
  return (
    <View style={s.card}>
      <Text style={s.h2}>{t("login")}</Text>
      <Text style={s.body}>{t("loginBody")}</Text>
      <Button label={t("login")} onPress={onLogin} />
    </View>
  );
}

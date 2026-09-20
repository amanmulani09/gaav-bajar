import { Image, Pressable, Text, View } from "react-native";
import { Language } from "../../core/marketplace/domain";
import { T, s } from "../../shared/ui";
import { styles } from "../styles";

export function AppHeader({
  t,
  language,
  onHome,
  onLanguageChange,
}: {
  t: T;
  language: Language;
  onHome: () => void;
  onLanguageChange: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        style={s.row}
        accessibilityRole="button"
        accessibilityLabel={`${t("brand")} — ${t("buy")}`}
        onPress={onHome}
      >
        <Image
          source={require("../../../assets/icon.png")}
          style={styles.logo}
          accessibilityLabel={t("brand")}
        />
        <View>
          <Text style={styles.brand}>{t("brand")}</Text>
          <Text style={s.small}>{t("tagline")}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="मराठी / हिन्दी / English"
        onPress={onLanguageChange}
        style={styles.language}
      >
        <Text style={styles.languageText}>
          {language === "mr" ? "हिन्दी" : language === "hi" ? "English" : "मराठी"} ⇄
        </Text>
      </Pressable>
    </View>
  );
}

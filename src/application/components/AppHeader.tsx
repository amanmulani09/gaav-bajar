import { Pressable, Text, View } from "react-native";
import { Language } from "../../core/marketplace/domain";
import { T, s } from "../../shared/ui";
import { styles } from "../styles";

export function AppHeader({
  t,
  language,
  onLanguageChange,
}: {
  t: T;
  language: Language;
  onLanguageChange: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={s.row}>
        <View style={styles.logo}>
          <Text style={{ fontSize: 25 }}>🌾</Text>
        </View>
        <View>
          <Text style={styles.brand}>{t("brand")}</Text>
          <Text style={s.small}>{t("tagline")}</Text>
        </View>
      </View>
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

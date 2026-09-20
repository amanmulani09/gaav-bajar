import { Text, View } from "react-native";
import { Language } from "../../../core/marketplace/domain";
import { Button, T, s } from "../../../shared/ui";
import legal from "../../../data/legal.json";

type LegalPage = "privacy" | "terms";

export function LegalScreen({
  t,
  language,
  page,
  onBack,
  onHelp,
}: {
  t: T;
  language: Language;
  page: LegalPage;
  onBack: () => void;
  onHelp: () => void;
}) {
  return (
    <>
      <Button quiet label={`← ${t("back")}`} onPress={onBack} />
      <Text style={s.h1}>{t(page)}</Text>
      <Text style={s.small}>
        Zero21 Studio · zero21studiocompany@gmail.com
      </Text>
      {legal[language][page].map(([heading, body]) => (
        <View key={heading} style={s.stack}>
          <Text style={s.h2}>{heading}</Text>
          <Text style={s.body}>{body}</Text>
        </View>
      ))}
      <Button quiet label={t("help")} onPress={onHelp} />
    </>
  );
}

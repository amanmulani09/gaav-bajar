import { Pressable, Text, View } from "react-native";
import { T, colors } from "../../shared/ui";
import { MainTab, Screen, mainTabs } from "../navigation";
import { styles } from "../styles";

export function BottomNavigation({
  t,
  screen,
  onNavigate,
}: {
  t: T;
  screen: Screen;
  onNavigate: (target: MainTab) => void;
}) {
  return (
    <View style={styles.nav}>
      {mainTabs.map((tab) => (
        <Pressable
          key={tab.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: screen === tab.id }}
          onPress={() => onNavigate(tab.id)}
          style={styles.navItem}
        >
          <Text
            style={[
              styles.navIcon,
              screen === tab.id && { color: colors.green },
            ]}
          >
            {tab.icon}
          </Text>
          <Text
            style={[
              styles.navLabel,
              screen === tab.id && {
                color: colors.green,
                fontWeight: "800",
              },
            ]}
          >
            {t(tab.label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

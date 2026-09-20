import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextKey } from "../../core/i18n";

export const colors = {
  green: "#214F37",
  dark: "#173B2B",
  cream: "#F7F6EE",
  ink: "#172E22",
  muted: "#626F63",
  line: "#DCE2D5",
  pale: "#EBF1E6",
  orange: "#F1BA66",
  red: "#A32D32",
  white: "#FFFFFF",
};
export type T = (key: TextKey) => string;
export function Button({
  label,
  onPress,
  quiet,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  quiet?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet && s.quiet,
        danger && { backgroundColor: "#FCEBEC" },
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          quiet && { color: colors.green },
          danger && { color: colors.red },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#7B857B"
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 120, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={s.checkRow}
    >
      <View style={[s.check, checked && { backgroundColor: colors.green }]}>
        <Text style={{ color: "white" }}>{checked ? "✓" : ""}</Text>
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </Pressable>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  t,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
  t: T;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={[s.input, s.select, disabled && { opacity: 0.5 }]}
      >
        <Text style={s.body}>
          {options.find((o) => o.id === value)?.name || t("choose")}
        </Text>
        <Text style={s.body}>⌄</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.row}>
            <Text style={s.h2}>{label}</Text>
            <Button quiet label={t("close")} onPress={() => setOpen(false)} />
          </View>
          <Field
            label={t("searchAction")}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {options
              .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
              .map((o) => (
                <Pressable
                  key={o.id}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  style={[
                    s.option,
                    value === o.id && { backgroundColor: colors.pale },
                  ]}
                >
                  <Text style={s.body}>{o.name}</Text>
                  {value === o.id && <Text>✓</Text>}
                </Pressable>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
export const s = StyleSheet.create({
  body: { fontSize: 16, color: colors.ink, lineHeight: 25 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 21 },
  badge: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 24,
  },
  h1: { fontSize: 28, fontWeight: "800", color: colors.ink, lineHeight: 40 },
  h2: { fontSize: 21, fontWeight: "700", color: colors.ink, lineHeight: 32 },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  stack: { gap: 16 },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    gap: 12,
  },
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.green,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: { backgroundColor: colors.pale },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  field: { gap: 7 },
  label: { fontSize: 14, color: colors.ink, fontWeight: "600", lineHeight: 22 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 13,
    fontSize: 16,
    color: colors.ink,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  check: {
    marginTop: 2,
    width: 25,
    height: 25,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { flex: 1, fontSize: 14, lineHeight: 23, color: colors.ink },
  modal: { flex: 1, backgroundColor: colors.cream, padding: 20, gap: 16 },
  option: {
    minHeight: 54,
    padding: 14,
    borderBottomWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  notice: { backgroundColor: "#FFF2D9", borderRadius: 14, padding: 16 },
});

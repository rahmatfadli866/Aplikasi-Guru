import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Dropdown } from "@/src/components/dropdown";
import { subjectKey } from "@/src/subject-utils";
import { makeStyles, useTheme } from "@/src/theme";

export function SubjectPicker({ value, subjects, onChange, disabled }: {
  value: string; subjects: string[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [custom, setCustom] = useState(false);
  const options = subjects.map((s) => ({ label: s, value: s }));
  const selected = subjects.find((s) => subjectKey(s) === subjectKey(value));
  return (
    <View style={styles.wrap}>
      {custom || subjects.length === 0 ? (
        <>
          <TextInput testID="input-mapel" accessibilityLabel="Mata pelajaran" style={styles.input}
            placeholder="Contoh: Matematika" placeholderTextColor={colors.muted}
            value={value} onChangeText={onChange} editable={!disabled} maxLength={100} />
          {subjects.length > 0 && (
            <Pressable testID="mapel-use-list" style={styles.link} disabled={disabled}
              onPress={() => { setCustom(false); onChange(""); }}>
              <Text testID="mapel-use-list-label" style={styles.linkText}>Pilih dari daftar mata pelajaran</Text>
            </Pressable>
          )}
        </>
      ) : (
        <Dropdown testID="dd-mapel" placeholder="Pilih Mata Pelajaran" value={selected}
          disabled={disabled} options={[...options, { label: "+ Mata pelajaran lain", value: "__new_subject__" }]}
          onChange={(v) => { if (v === "__new_subject__") { setCustom(true); onChange(""); } else onChange(v); }} />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14,
    minHeight: 48, fontSize: 15, backgroundColor: colors.surface, color: colors.onSurface },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { fontSize: 13, color: colors.brandPrimary, fontWeight: "600" },
}));
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { makeStyles, useTheme } from "@/src/theme";

type Option = { label: string; value: string };

export function Dropdown({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  testID,
}: {
  label?: string;
  placeholder: string;
  value?: string;
  options: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const styles = useStyles();
  const { colors } = useTheme();
  const sel = options.find((o) => o.value === value);

  return (
    <View>
      {label ? <Text testID={`${testID}-label`} style={styles.label}>{label}</Text> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => !disabled && setOpen(true)}
        style={[
          styles.field,
          disabled && { opacity: 0.5 },
        ]}
      >
        <Text testID={`${testID}-value`} style={sel ? styles.value : styles.placeholder} numberOfLines={1}>
          {sel ? sel.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color={colors.muted} />
      </Pressable>

      <Modal testID={`${testID}-modal`} visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable testID={`${testID}-backdrop`} style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable testID={`${testID}-sheet`} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text testID={`${testID}-title`} style={styles.sheetTitle}>{placeholder}</Text>
              <Pressable testID={`${testID}-close`} style={styles.closeBtn} onPress={() => setOpen(false)} hitSlop={12}>
                <Icon name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {options.length === 0 && (
                <Text testID={`${testID}-empty`} style={styles.empty}>Tidak ada pilihan tersedia</Text>
              )}
              {options.map((o) => {
                const isSel = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    testID={`${testID}-option-${o.value}`}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={[styles.option, isSel && { backgroundColor: colors.brandTertiary }]}
                  >
                    <Text testID={`${testID}-option-${o.value}-label`} style={[styles.optionText, isSel && { color: colors.brandPrimary, fontWeight: "700" }]}>
                      {o.label}
                    </Text>
                    {isSel && <Icon name="check" size={18} color={colors.brandPrimary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceSecondary, marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  value: { color: colors.onSurface, fontSize: 15, flexShrink: 1 },
  placeholder: { color: colors.muted, fontSize: 15, flexShrink: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingBottom: 8,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, flex: 1 },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: { fontSize: 15, color: colors.onSurface },
  empty: { textAlign: "center", padding: 20, color: colors.muted },
}));

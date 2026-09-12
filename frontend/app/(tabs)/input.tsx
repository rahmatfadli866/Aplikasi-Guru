import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { Dropdown } from "@/src/components/dropdown";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

const KELAS_OPTIONS = [1, 2, 3, 4, 5, 6].map((k) => ({ label: `Kelas ${k}`, value: String(k) }));

export default function InputScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const [kelas, setKelas] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [nilai, setNilai] = useState<string>("");

  const studentsQ = useQuery({
    queryKey: ["students", kelas ? Number(kelas) : undefined],
    queryFn: () => api.listStudents(kelas ? Number(kelas) : undefined),
    enabled: !!kelas,
  });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });

  const studentOptions = useMemo(
    () => (studentsQ.data || []).map((s) => ({ label: s.nama, value: s.id })),
    [studentsQ.data],
  );
  const catOptions = useMemo(
    () => (catsQ.data || []).map((c) => ({ label: c.nama, value: c.id })),
    [catsQ.data],
  );

  const saveMut = useMutation({
    mutationFn: () =>
      api.saveGrade({
        student_id: studentId,
        category_id: categoryId,
        nilai: Number(nilai),
      }),
    onSuccess: () => {
      toast.show("Nilai berhasil disimpan", "success");
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setNilai("");
    },
    onError: (e: any) => toast.show(e.message || "Gagal menyimpan", "error"),
  });

  const canSave =
    !!kelas &&
    !!studentId &&
    !!categoryId &&
    nilai !== "" &&
    !isNaN(Number(nilai)) &&
    Number(nilai) >= 0 &&
    Number(nilai) <= 100;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Input Nilai</Text>
        <Text style={styles.headerSub}>Isi kelas → siswa → jenis nilai → angka</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.step}>1. Pilih Kelas</Text>
            <Dropdown
              testID="dd-kelas"
              placeholder="Pilih Kelas"
              value={kelas}
              options={KELAS_OPTIONS}
              onChange={(v) => {
                setKelas(v);
                setStudentId("");
              }}
            />

            <View style={{ height: 16 }} />
            <Text style={styles.step}>2. Pilih Siswa</Text>
            <Dropdown
              testID="dd-siswa"
              placeholder={kelas ? "Pilih Siswa" : "Pilih kelas dulu"}
              value={studentId}
              options={studentOptions}
              onChange={setStudentId}
              disabled={!kelas}
            />

            <View style={{ height: 16 }} />
            <Text style={styles.step}>3. Jenis Nilai</Text>
            <Dropdown
              testID="dd-kategori"
              placeholder="Pilih Kategori"
              value={categoryId}
              options={catOptions}
              onChange={setCategoryId}
            />

            <View style={{ height: 16 }} />
            <Text style={styles.step}>4. Nilai (0 - 100)</Text>
            <TextInput
              testID="input-nilai"
              style={styles.input}
              value={nilai}
              onChangeText={(t) => setNilai(t.replace(/[^0-9.]/g, ""))}
              placeholder="Contoh: 85"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              maxLength={5}
            />
            {nilai !== "" && (Number(nilai) < 0 || Number(nilai) > 100) ? (
              <Text style={styles.errText}>Nilai harus di antara 0 dan 100</Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Pressable
            testID="btn-save"
            style={[styles.saveBtn, (!canSave || saveMut.isPending) && { opacity: 0.5 }]}
            disabled={!canSave || saveMut.isPending}
            onPress={() => saveMut.mutate()}
          >
            <Icon name="content-save" size={20} color="#FFFFFF" />
            <Text style={styles.saveTxt}>{saveMut.isPending ? "Menyimpan…" : "Simpan Nilai"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  step: { fontSize: 13, fontWeight: "700", color: colors.brandPrimary, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
  },
  errText: { color: colors.error, fontSize: 12, marginTop: 6 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.surfaceSecondary,
  },
  saveBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
}));

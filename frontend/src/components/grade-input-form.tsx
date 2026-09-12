import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ReactNode, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api, Schedule } from "@/src/api";
import { Dropdown } from "@/src/components/dropdown";
import { SubjectPicker } from "@/src/components/subject-picker";
import { ScheduleContext } from "@/src/components/schedule-context";
import { useToast } from "@/src/components/toast";
import { useSubjects } from "@/src/hooks/use-subjects";
import { cleanSubject } from "@/src/subject-utils";
import { makeStyles, useTheme } from "@/src/theme";

const KELAS_OPTIONS = [1, 2, 3, 4, 5, 6].map((k) => ({ label: `Kelas ${k}`, value: String(k) }));

export function GradeInputForm({ quick = false, schedule, scheduleClass }: {
  quick?: boolean; schedule?: Schedule | null; scheduleClass?: number | null;
}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const automatic = quick && !!schedule && !!scheduleClass;
  const [manualClass, setManualClass] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [studentId, setStudentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [nilai, setNilai] = useState("");
  const kelas = automatic ? String(scheduleClass) : manualClass;
  const subject = automatic ? schedule.mata_pelajaran : manualSubject;
  const { subjects } = useSubjects();
  const studentsQ = useQuery({ queryKey: ["students", kelas ? Number(kelas) : undefined],
    queryFn: () => api.listStudents(Number(kelas)), enabled: !!kelas });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const students = studentsQ.data || [];
  const categories = catsQ.data || [];
  const numericValue = Number(nilai);
  const invalidValue = nilai.trim() !== "" && (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100);
  const canSave = !!kelas && students.some((s) => s.id === studentId) && !!cleanSubject(subject)
    && categories.some((c) => c.id === categoryId) && nilai.trim() !== "" && !invalidValue;
  const saveMut = useMutation({
    mutationFn: () => {
      if (!canSave) throw new Error("Lengkapi data nilai terlebih dahulu");
      return api.saveGrade({ student_id: studentId, category_id: categoryId, mata_pelajaran: subject, nilai: numericValue });
    },
    onSuccess: () => {
      toast.show(`Nilai ${cleanSubject(subject)} berhasil disimpan`, "success");
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setNilai("");
    },
    onError: (error: Error) => toast.show(error.message || "Gagal menyimpan", "error"),
  });

  return (
    <View testID="grade-input-screen" style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          {quick && <Pressable testID="quick-grade-back" style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")}>
            <Icon name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>}
          <Text testID="grade-input-title" style={styles.title}>Input Nilai{quick ? " Cepat" : ""}</Text>
        </View>
        <Text testID="grade-input-steps" style={styles.subtitle}>{automatic
          ? "Isi siswa → jenis nilai → angka nilai"
          : "Isi kelas → siswa → mata pelajaran → jenis nilai → angka"}</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView testID="grade-input-scroll" contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {quick && <ScheduleContext schedule={schedule} kelas={scheduleClass} testID="quick-grade-context" />}
          {automatic && <Pressable testID="quick-grade-manual" style={styles.manual} onPress={() => router.replace("/(tabs)/input")}>
            <Text testID="quick-grade-manual-label" style={styles.manualText}>Input kelas / mata pelajaran lain</Text>
          </Pressable>}
          <View style={styles.card}>
            {!automatic && <Field label="1. Pilih Kelas" testID="grade-class-label">
              <Dropdown testID="dd-kelas" placeholder="Pilih Kelas" value={kelas} options={KELAS_OPTIONS}
                disabled={saveMut.isPending} onChange={(v) => { setManualClass(v); setStudentId(""); setCategoryId(""); setNilai(""); }} />
            </Field>}
            <Field label={`${automatic ? 1 : 2}. Pilih Siswa`} testID="grade-student-label">
              <Dropdown testID="dd-siswa" placeholder={kelas ? "Pilih Siswa" : "Pilih kelas dulu"}
                value={studentId} options={students.map((s) => ({ label: s.nama, value: s.id }))}
                disabled={!kelas || studentsQ.isLoading || saveMut.isPending}
                onChange={(v) => { setStudentId(v); setNilai(""); }} />
              {studentsQ.isLoading && <ActivityIndicator testID="grade-students-loading" color={colors.brandPrimary} />}
              {!!kelas && !studentsQ.isLoading && !studentsQ.isError && students.length === 0 && (
                <Pressable testID="grade-add-students" style={styles.manual} onPress={() => router.push("/master")}>
                  <Text testID="grade-no-students" style={styles.manualText}>Belum ada siswa. Tambahkan di Master Data.</Text>
                </Pressable>
              )}
              {studentsQ.isError && <Text testID="grade-students-error" style={styles.error}>Gagal membaca data siswa.</Text>}
            </Field>
            {!automatic && <Field label="3. Mata Pelajaran" testID="grade-subject-label">
              <SubjectPicker value={subject} subjects={subjects} disabled={!studentId || saveMut.isPending}
                onChange={(v) => { setManualSubject(v); setNilai(""); }} />
            </Field>}
            <Field label={`${automatic ? 2 : 4}. Jenis Nilai`} testID="grade-category-label">
              <Dropdown testID="dd-kategori" placeholder="Pilih Jenis Nilai" value={categoryId}
                options={categories.map((c) => ({ label: c.nama, value: c.id }))}
                disabled={!studentId || !cleanSubject(subject) || saveMut.isPending} onChange={(v) => { setCategoryId(v); setNilai(""); }} />
              {!catsQ.isLoading && categories.length === 0 && <Text testID="grade-no-categories" style={styles.note}>Tambahkan jenis nilai di Master Data.</Text>}
            </Field>
            <Field label={`${automatic ? 3 : 5}. Nilai (0–100)`} testID="grade-value-label">
              <TextInput testID="input-nilai" accessibilityLabel="Angka nilai" style={styles.input} value={nilai}
                onChangeText={(value) => setNilai(value.replace(",", ".").replace(/[^0-9.]/g, ""))}
                editable={!!categoryId && !saveMut.isPending} placeholder="Contoh: 85" placeholderTextColor={colors.muted}
                keyboardType="decimal-pad" maxLength={6} />
              {invalidValue && <Text testID="grade-value-error" style={styles.error}>Masukkan angka antara 0 dan 100.</Text>}
            </Field>
          </View>
          <Text testID="grade-offline-note" style={styles.note}>Nilai disimpan offline, terpisah untuk setiap mata pelajaran.</Text>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Pressable testID="btn-save" disabled={!canSave || saveMut.isPending} onPress={() => saveMut.mutate()}
            style={({ pressed }) => [styles.saveBtn, (!canSave || saveMut.isPending || pressed) && styles.dim]}>
            {saveMut.isPending ? <ActivityIndicator testID="grade-saving" color={colors.onBrandPrimary} />
              : <Icon name="content-save" size={20} color={colors.onBrandPrimary} />}
            <Text testID="grade-save-label" style={styles.saveText}>{saveMut.isPending ? "Menyimpan…" : "Simpan Nilai"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, testID, children }: { label: string; testID: string; children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.field}><Text testID={testID} style={styles.step}>{label}</Text>{children}</View>;
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface, flexShrink: 1 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 19 },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 24 },
  field: { gap: 8 },
  step: { fontSize: 13, fontWeight: "700", color: colors.brandPrimary },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, minHeight: 52, fontSize: 20, fontWeight: "700", color: colors.onSurface },
  error: { color: colors.error, fontSize: 12 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  manual: { minHeight: 44, justifyContent: "center" },
  manualText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "600" },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider, backgroundColor: colors.surfaceSecondary },
  saveBtn: { backgroundColor: colors.brandPrimary, borderRadius: 14, minHeight: 52,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  dim: { opacity: 0.5 },
}));
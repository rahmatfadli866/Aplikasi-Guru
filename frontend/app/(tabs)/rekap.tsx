import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";
import { api, Category, Grade, Student, Teacher } from "@/src/api";
import { useToast } from "@/src/components/toast";
import { Dropdown } from "@/src/components/dropdown";
import { useSubjects } from "@/src/hooks/use-subjects";
import { LEGACY_SUBJECT, LEGACY_SUBJECT_LABEL, subjectKey } from "@/src/subject-utils";
import { makeStyles, useTheme } from "@/src/theme";

const KELAS_LIST = [1, 2, 3, 4, 5, 6];
const COL_NAME_W = 160;
const COL_W = 90;

export default function RekapScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();

  const [kelas, setKelas] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState("");
  const subjectsQ = useSubjects();
  const [editing, setEditing] = useState<{ studentId: string; categoryId: string; subject: string; grade?: Grade } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const canSaveEdit = !!editing && editValue.trim() !== "" && Number.isFinite(Number(editValue))
    && Number(editValue) >= 0 && Number(editValue) <= 100;

  const catsQ = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const studentsQ = useQuery({
    queryKey: ["students", kelas],
    queryFn: () => api.listStudents(kelas),
  });
  const hasLegacy = subjectsQ.grades.some((g) => !subjectKey(g.mata_pelajaran)
    && studentsQ.data?.some((s) => s.id === g.student_id));
  const subjectOptions = [
    ...subjectsQ.subjects.map((s) => ({ label: s, value: s })),
    ...(hasLegacy ? [{ label: LEGACY_SUBJECT_LABEL, value: LEGACY_SUBJECT }] : []),
  ];
  const subject = subjectOptions.find((o) => o.value === selectedSubject)?.value || subjectOptions[0]?.value || "";
  const subjectLabel = subject === LEGACY_SUBJECT ? LEGACY_SUBJECT_LABEL : subject;
  const gradesQ = useQuery({
    queryKey: ["grades", "kelas", kelas, subjectKey(subject)],
    queryFn: () => api.listGrades({ kelas, mata_pelajaran: subject === LEGACY_SUBJECT ? null : subject }),
    enabled: !!subject,
  });
  const teacherQ = useQuery({ queryKey: ["teacher"], queryFn: api.getTeacher });
  const attSumQ = useQuery({
    queryKey: ["attendance", "summary", kelas],
    queryFn: () => api.attendanceSummary(kelas),
  });

  const categories = useMemo(() => catsQ.data || [], [catsQ.data]);
  const students = useMemo(() => studentsQ.data || [], [studentsQ.data]);
  const grades = useMemo(() => gradesQ.data || [], [gradesQ.data]);

  const gradeMap = useMemo(() => {
    const m = new Map<string, Grade>();
    grades.forEach((g) => m.set(`${g.student_id}_${g.category_id}`, g));
    return m;
  }, [grades]);

  const rows = useMemo(() => {
    const computed = students.map((s) => {
      const values = categories.map((c) => gradeMap.get(`${s.id}_${c.id}`)?.nilai);
      const nums = values.filter((v): v is number => typeof v === "number");
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = nums.length ? sum / nums.length : 0;
      return { student: s, values, sum, avg, count: nums.length, rank: 0 };
    });
    // Compute rank only for students with at least one grade, higher avg = better rank
    const scored = computed
      .filter((r) => r.count > 0)
      .sort((a, b) => b.avg - a.avg);
    scored.forEach((r, i) => {
      r.rank = i + 1;
    });
    return computed;
  }, [students, categories, gradeMap]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!editing || !canSaveEdit) throw new Error("Isi angka antara 0 dan 100 terlebih dahulu");
      const val = Number(editValue);
      if (!editValue.trim() || !Number.isFinite(val) || val < 0 || val > 100) throw new Error("Nilai harus 0-100");
      if (editing.grade) return api.updateGrade(editing.grade.id, val);
      return api.saveGrade({ student_id: editing.studentId, category_id: editing.categoryId, mata_pelajaran: editing.subject, nilai: val });
    },
    onSuccess: () => {
      toast.show("Nilai diperbarui", "success");
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setEditing(null);
      setEditValue("");
    },
    onError: (e: any) => toast.show(e.message || "Gagal", "error"),
  });

  const closeEdit = () => {
    if (saveMut.isPending) return;
    setEditing(null);
    setEditValue("");
  };

  const openEdit = (studentId: string, categoryId: string) => {
    const g = gradeMap.get(`${studentId}_${categoryId}`);
    if (!subject) return;
    if (subject === LEGACY_SUBJECT && !g) {
      toast.show("Pilih mata pelajaran untuk menambahkan nilai baru", "info");
      return;
    }
    setEditing({ studentId, categoryId, subject, grade: g });
    setEditValue(g ? String(g.nilai) : "");
  };

  const runExport = async (operation: () => Promise<void>) => {
    setExportOpen(false);
    try { await operation(); } catch (error) {
      toast.show(error instanceof Error ? error.message : "Ekspor gagal. Coba kembali.", "error");
    }
  };

  return (
    <View testID="rekap-screen" style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text testID="rekap-title" style={styles.headerTitle}>Rekap Nilai</Text>
            <Text testID="rekap-summary" style={styles.headerSub}>Kelas {kelas} • {rows.length} siswa</Text>
          </View>
          <Pressable
            testID="btn-export"
            disabled={!subject || gradesQ.isLoading || studentsQ.isLoading}
            onPress={() => setExportOpen(true)}
            style={styles.exportBtn}
          >
            <Icon name="export-variant" size={18} color="#FFFFFF" />
            <Text style={styles.exportTxt}>Export</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {KELAS_LIST.map((k) => {
            const active = kelas === k;
            return (
              <Pressable
                key={k}
                testID={`chip-kelas-${k}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setKelas(k)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>Kelas {k}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.subjectFilter}>
          <Dropdown testID="rekap-dd-mapel" label="Mata Pelajaran" placeholder="Pilih Mata Pelajaran"
            value={subject} options={subjectOptions} onChange={setSelectedSubject} />
        </View>
        <Text testID="rekap-subject-summary" style={styles.headerSub}>{subjectLabel || "Belum ada mata pelajaran"}</Text>
        {subject === LEGACY_SUBJECT && <Text testID="rekap-legacy-notice" style={styles.headerSub}>
          Data lama tetap utuh dan tidak dicampurkan dengan nilai mata pelajaran baru.
        </Text>}
      </View>

      {(catsQ.isLoading || studentsQ.isLoading || gradesQ.isLoading || subjectsQ.isLoading) && (
        <View style={styles.center}><ActivityIndicator testID="rekap-loading" color={colors.brandPrimary} /></View>
      )}

      {!studentsQ.isLoading && students.length === 0 ? (
        <View style={styles.center}>
          <Icon name="notebook-outline" size={64} color={colors.muted} />
          <Text testID="rekap-no-students" style={styles.emptyTxt}>Belum ada siswa di kelas ini</Text>
        </View>
      ) : null}

      {!subject && !subjectsQ.isLoading && students.length > 0 && <View style={styles.center}>
        <Text testID="rekap-no-subject" style={styles.emptyTxt}>Isi nilai atau tambahkan jadwal untuk memilih mata pelajaran.</Text>
        <Pressable testID="rekap-go-input" style={styles.exportBtn} onPress={() => router.push("/(tabs)/input")}>
          <Text style={styles.exportTxt}>Input Nilai</Text>
        </Pressable>
      </View>}
      {!!subject && !gradesQ.isLoading && students.length > 0 && (
        <ScrollView testID="rekap-table" style={{ flex: 1 }}>
          <Text testID="rekap-attendance-note" style={styles.attendanceNote}>Kehadiran harian berlaku untuk semua mata pelajaran.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* header row */}
              <View style={styles.tblHeaderRow}>
                <View style={[styles.cell, styles.nameHeaderCell, { width: COL_NAME_W }]}>
                  <Text style={styles.hCellTxt}>No · Nama Siswa</Text>
                </View>
                {categories.map((c) => (
                  <View key={c.id} style={[styles.cell, styles.headerCell, { width: COL_W }]}>
                    <Text style={styles.hCellTxt} numberOfLines={2}>{c.nama}</Text>
                  </View>
                ))}
                <View style={[styles.cell, styles.headerCell, { width: COL_W, backgroundColor: colors.brandTertiary }]}>
                  <Text style={[styles.hCellTxt, { color: colors.brandPrimary }]}>Jumlah</Text>
                </View>
                <View style={[styles.cell, styles.headerCell, { width: COL_W, backgroundColor: colors.brandTertiary }]}>
                  <Text style={[styles.hCellTxt, { color: colors.brandPrimary }]}>Rata²</Text>
                </View>
              </View>

              {rows.map((r, idx) => {
                const isPass = r.avg > 75;
                const bgAvg = isPass ? colors.successSoft : r.count === 0 ? colors.surfaceTertiary : colors.errorSoft;
                const fgAvg = isPass ? colors.success : r.count === 0 ? colors.muted : colors.error;
                const att = attSumQ.data?.[r.student.id];
                return (
                  <View key={r.student.id} style={styles.tblRow}>
                    <View style={[styles.cell, styles.nameCell, { width: COL_NAME_W }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.rowNo}>{idx + 1}.</Text>
                        <Text testID={`rekap-student-${r.student.id}`} style={styles.rowName} numberOfLines={2}>{r.student.nama}</Text>
                      </View>
                      {att ? (
                        <View style={styles.attRow} testID={`att-${r.student.id}`}>
                          <View style={[styles.attChip, { backgroundColor: colors.successSoft }]}>
                            <Text style={[styles.attTxt, { color: colors.success }]}>H {att.hadir}</Text>
                          </View>
                          <View style={[styles.attChip, { backgroundColor: colors.warningSoft }]}>
                            <Text style={[styles.attTxt, { color: colors.warning }]}>S {att.sakit}</Text>
                          </View>
                          <View style={[styles.attChip, { backgroundColor: "#DBEAFE" }]}>
                            <Text style={[styles.attTxt, { color: colors.info }]}>I {att.izin}</Text>
                          </View>
                          <View style={[styles.attChip, { backgroundColor: colors.errorSoft }]}>
                            <Text style={[styles.attTxt, { color: colors.error }]}>A {att.alpa}</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.attEmpty}>Belum ada presensi</Text>
                      )}
                    </View>
                    {categories.map((c, ci) => {
                      const v = r.values[ci];
                      const has = typeof v === "number";
                      return (
                        <Pressable
                          key={c.id}
                          testID={`cell-${r.student.id}-${c.id}`}
                          onPress={() => openEdit(r.student.id, c.id)}
                          style={[styles.cell, { width: COL_W }]}
                        >
                          <Text testID={`grade-value-${r.student.id}-${c.id}`} style={[styles.cellTxt, !has && { color: colors.muted }]}>
                            {has ? v : "—"}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <View style={[styles.cell, { width: COL_W, backgroundColor: colors.brandTertiary }]}>
                      <Text testID={`grade-sum-${r.student.id}`} style={[styles.cellTxt, { color: colors.brandPrimary, fontWeight: "700" }]}>
                        {r.sum.toFixed(0)}
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: COL_W, backgroundColor: bgAvg, flexDirection: "row", gap: 4 }]}>
                      <Text testID={`grade-average-${r.student.id}`} style={[styles.cellTxt, { color: fgAvg, fontWeight: "800" }]}>
                        {r.count === 0 ? "—" : r.avg.toFixed(1)}
                      </Text>
                      {r.count > 0 && (
                        <Icon
                          name={isPass ? "emoticon-happy" : "alert"}
                          size={16}
                          color={fgAvg}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Edit modal */}
      <Modal testID="rekap-edit-modal" visible={!!editing} transparent animationType="fade" onRequestClose={closeEdit}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <Pressable testID="rekap-edit-backdrop" style={styles.backdrop} onPress={closeEdit}>
          <Pressable testID="rekap-edit-sheet" style={[styles.editSheet, { paddingBottom: Math.max(insets.bottom, 20) }]} onPress={(e) => e.stopPropagation()}>
            <Text testID="rekap-edit-title" style={styles.editTitle}>Edit Nilai</Text>
            <Text testID="rekap-edit-context" style={styles.editSub}>
              {students.find((s) => s.id === editing?.studentId)?.nama} •{" "}
              {categories.find((c) => c.id === editing?.categoryId)?.nama} • {subjectLabel}
            </Text>
            <TextInput
              testID="edit-input"
              style={styles.editInput}
              value={editValue}
              editable={!saveMut.isPending}
              onChangeText={(t) => setEditValue(t.replace(",", ".").replace(/[^0-9.]/g, ""))}
              keyboardType="numeric"
              autoFocus
              placeholder="0 - 100"
              placeholderTextColor={colors.muted}
            />
            {!canSaveEdit && <Text testID="rekap-edit-validation" style={styles.editValidation}>Isi angka antara 0 dan 100 untuk menyimpan.</Text>}
            <View style={styles.editActions}>
              <Pressable testID="rekap-edit-cancel" accessibilityRole="button" disabled={saveMut.isPending}
                style={[styles.editBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={closeEdit}>
                <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Batal</Text>
              </Pressable>
              <Pressable
                testID="edit-save"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSaveEdit || saveMut.isPending, busy: saveMut.isPending }}
                style={[styles.editBtn, { backgroundColor: colors.brandPrimary }, (!canSaveEdit || saveMut.isPending) && styles.disabledButton]}
                onPress={() => { if (canSaveEdit && !saveMut.isPending) saveMut.mutate(); }}
                disabled={!canSaveEdit || saveMut.isPending}
              >
                {saveMut.isPending ? <ActivityIndicator testID="rekap-edit-saving" color={colors.onBrandPrimary} />
                  : <Text testID="rekap-edit-save-label" style={{ color: colors.onBrandPrimary, fontWeight: "700" }}>Simpan</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Export bottom sheet */}
      <Modal testID="rekap-export-modal" visible={exportOpen} transparent animationType="fade" onRequestClose={() => setExportOpen(false)}>
        <Pressable testID="rekap-export-backdrop" style={styles.backdrop} onPress={() => setExportOpen(false)}>
          <Pressable testID="rekap-export-sheet" style={[styles.editSheet, { paddingBottom: Math.max(insets.bottom, 24) }]} onPress={(e) => e.stopPropagation()}>
            <Text testID="rekap-export-title" style={styles.editTitle}>Export Data</Text>
            <Text testID="rekap-export-context" style={styles.editSub}>Kelas {kelas} • {subjectLabel}</Text>
            <ExportButton
              icon="file-pdf-box"
              label="PDF (Landscape)"
              testID="export-pdf"
              color={colors.error}
              onPress={() => runExport(async () => {
                await exportPdf({ kelas, subject: subjectLabel, teacher: teacherQ.data, categories, rows, share: true });
                toast.show("PDF siap dibagikan", "success");
              })}
            />
            <ExportButton
              icon="file-excel"
              label="Excel (.xlsx)"
              testID="export-xlsx"
              color={colors.success}
              onPress={() => runExport(async () => {
                await exportExcel({ kelas, subject: subjectLabel, categories, rows });
                toast.show("Excel berhasil diekspor", "success");
              })}
            />
            <ExportButton
              icon="printer"
              label="Print / Bagikan Cetakan"
              testID="export-print"
              color={colors.info}
              onPress={() => runExport(() => exportPrint({ kelas, subject: subjectLabel, teacher: teacherQ.data, categories, rows }))}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ExportButton({
  icon, label, onPress, color, testID,
}: { icon: string; label: string; onPress: () => void; color: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        padding: 14, borderRadius: 12, backgroundColor: colors.surfaceTertiary, marginTop: 10,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon as any} size={20} color="#FFFFFF" />
      </View>
      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.onSurface, flex: 1 }}>{label}</Text>
      <Icon name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

// ---------- Export helpers ----------

type ExportInput = {
  kelas: number;
  subject: string;
  teacher?: Teacher;
  categories: Category[];
  rows: { student: Student; values: (number | undefined)[]; sum: number; avg: number; count: number }[];
};

function buildHtml({ kelas, subject, teacher, categories, rows }: ExportInput) {
  const th = categories.map((c) => `<th>${escape(c.nama)}</th>`).join("");
  const trs = rows
    .map((r, i) => {
      const cells = r.values
        .map((v) => `<td>${typeof v === "number" ? v : "—"}</td>`)
        .join("");
      const passClass = r.count === 0 ? "" : r.avg > 75 ? "pass" : "fail";
      return `<tr>
          <td class="idx">${i + 1}</td>
          <td class="nm">${escape(r.student.nama)}</td>
          ${cells}
          <td class="sum">${r.sum.toFixed(0)}</td>
          <td class="avg ${passClass}">${r.count === 0 ? "—" : r.avg.toFixed(1)}</td>
        </tr>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page { size: A4 landscape; margin: 16mm; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827; }
    h1 { font-size: 20px; margin: 0 0 4px; color:#1D4ED8; }
    .meta { font-size: 12px; color:#374151; margin-bottom: 12px; }
    .meta b { color:#111827; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #D1D5DB; padding: 6px 8px; text-align: center; }
    th { background:#EFF6FF; color:#1D4ED8; font-weight: 700; }
    td.nm { text-align: left; font-weight: 600; }
    td.sum { background:#EFF6FF; color:#1D4ED8; font-weight: 700; }
    td.avg { font-weight: 800; }
    td.avg.pass { background:#D1FAE5; color:#059669; }
    td.avg.fail { background:#FEE2E2; color:#DC2626; }
    tr:nth-child(even) td:not(.avg):not(.sum) { background:#F9FAFB; }
  </style></head><body>
    <h1>Rekap Nilai Siswa - Kelas ${kelas}</h1>
    <div class="meta">
      <b>Guru:</b> ${escape(teacher?.nama || "-")} &nbsp;·&nbsp;
      <b>NIP:</b> ${escape(teacher?.nip || "-")} &nbsp;·&nbsp;
      <b>Mata Pelajaran:</b> ${escape(subject)}
    </div>
    <table>
      <thead>
        <tr>
          <th>No</th><th>Nama Siswa</th>${th}<th>Jumlah</th><th>Rata²</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>
  </body></html>`;
}

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

async function exportPdf(input: ExportInput & { share?: boolean }) {
  const html = buildHtml(input);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Bagikan PDF" });
  }
}

async function exportPrint(input: ExportInput) {
  const html = buildHtml(input);
  await Print.printAsync({ html });
}

async function exportExcel({ kelas, subject, categories, rows }: ExportInput) {
  const headers = ["No", "Nama Siswa", ...categories.map((c) => c.nama), "Jumlah", "Rata-rata"];
  const data = rows.map((r, i) => [
    i + 1,
    r.student.nama,
    ...r.values.map((v) => (typeof v === "number" ? v : "")),
    r.sum,
    r.count === 0 ? "" : Number(r.avg.toFixed(2)),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([[`Rekap Nilai Kelas ${kelas}`, subject], [], headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Kelas ${kelas}`);
  const filename = `rekap-kelas-${kelas}-${subject.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 80)}.xlsx`;

  if (Platform.OS === "web") {
    XLSX.writeFile(wb, filename);
    return;
  }
  const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Bagikan Excel",
    });
  }
}

const useStyles = makeStyles((colors) => ({
  disabledButton: { opacity: 0.45 },
  editValidation: { color: colors.muted, fontSize: 12, marginTop: 8 },
  flex: { flex: 1 },
  subjectFilter: { marginTop: 16, marginBottom: 4 },
  attendanceNote: { fontSize: 12, color: colors.muted, padding: 12 },
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  exportBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandPrimary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  exportTxt: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    height: 44, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceSecondary },
  chipTxtActive: { color: "#FFFFFF" },

  tblHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.brandSecondary,
    borderTopWidth: 1, borderColor: colors.border,
  },
  tblRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  cell: {
    minHeight: 48,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8, paddingVertical: 8,
  },
  headerCell: { backgroundColor: colors.brandSecondary },
  nameHeaderCell: { backgroundColor: colors.brandSecondary, alignItems: "flex-start" },
  nameCell: { alignSelf: "stretch", justifyContent: "center", alignItems: "flex-start", gap: 6 },
  attRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  attChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  attTxt: { fontSize: 10, fontWeight: "700" },
  attEmpty: { fontSize: 10, color: colors.muted, fontStyle: "italic" },
  hCellTxt: { fontSize: 12, fontWeight: "700", color: colors.onBrandSecondary, textAlign: "center" },
  rowNo: { fontSize: 12, color: colors.muted, fontWeight: "700" },
  rowName: { fontSize: 13, fontWeight: "600", color: colors.onSurface, flexShrink: 1 },
  cellTxt: { fontSize: 14, fontWeight: "600", color: colors.onSurface },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTxt: { color: colors.muted, fontSize: 14, textAlign: "center" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  editSheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
  },
  editTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  editSub: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 14 },
  editInput: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12,
    padding: 14, fontSize: 22, fontWeight: "700", color: colors.onSurface, textAlign: "center",
  },
  editActions: { flexDirection: "row", gap: 12, marginTop: 14 },
  editBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12,
  },
}));

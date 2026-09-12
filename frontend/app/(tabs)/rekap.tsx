import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { api, Category, Grade, Student, Teacher } from "@/src/api";
import { useToast } from "@/src/components/toast";
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

  const [kelas, setKelas] = useState<number>(1);
  const [editing, setEditing] = useState<{ studentId: string; categoryId: string; grade?: Grade } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const catsQ = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const studentsQ = useQuery({
    queryKey: ["students", kelas],
    queryFn: () => api.listStudents(kelas),
  });
  const gradesQ = useQuery({
    queryKey: ["grades", "kelas", kelas],
    queryFn: () => api.listGrades({ kelas }),
  });
  const teacherQ = useQuery({ queryKey: ["teacher"], queryFn: api.getTeacher });
  const attSumQ = useQuery({
    queryKey: ["attendance", "summary", kelas],
    queryFn: () => api.attendanceSummary(kelas),
  });

  const categories = catsQ.data || [];
  const students = studentsQ.data || [];
  const grades = gradesQ.data || [];

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
      if (!editing) return;
      const val = Number(editValue);
      if (isNaN(val) || val < 0 || val > 100) throw new Error("Nilai harus 0-100");
      if (editing.grade) return api.updateGrade(editing.grade.id, val);
      return api.saveGrade({ student_id: editing.studentId, category_id: editing.categoryId, nilai: val });
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

  const openEdit = (studentId: string, categoryId: string) => {
    const g = gradeMap.get(`${studentId}_${categoryId}`);
    setEditing({ studentId, categoryId, grade: g });
    setEditValue(g ? String(g.nilai) : "");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Rekap Nilai</Text>
            <Text style={styles.headerSub}>Kelas {kelas} • {rows.length} siswa</Text>
          </View>
          <Pressable
            testID="btn-export"
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
                onPress={() => setKelas(k)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>Kelas {k}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {(catsQ.isLoading || studentsQ.isLoading || gradesQ.isLoading) && (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      )}

      {!studentsQ.isLoading && students.length === 0 ? (
        <View style={styles.center}>
          <Icon name="notebook-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyTxt}>Belum ada siswa di kelas ini</Text>
        </View>
      ) : null}

      {students.length > 0 && (
        <ScrollView style={{ flex: 1 }}>
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
                        <Text style={styles.rowName} numberOfLines={2}>{r.student.nama}</Text>
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
                          <Text style={[styles.cellTxt, !has && { color: colors.muted }]}>
                            {has ? v : "—"}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <View style={[styles.cell, { width: COL_W, backgroundColor: colors.brandTertiary }]}>
                      <Text style={[styles.cellTxt, { color: colors.brandPrimary, fontWeight: "700" }]}>
                        {r.sum.toFixed(0)}
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: COL_W, backgroundColor: bgAvg, flexDirection: "row", gap: 4 }]}>
                      <Text style={[styles.cellTxt, { color: fgAvg, fontWeight: "800" }]}>
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
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.editSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.editTitle}>Edit Nilai</Text>
            <Text style={styles.editSub}>
              {students.find((s) => s.id === editing?.studentId)?.nama} •{" "}
              {categories.find((c) => c.id === editing?.categoryId)?.nama}
            </Text>
            <TextInput
              testID="edit-input"
              style={styles.editInput}
              value={editValue}
              onChangeText={(t) => setEditValue(t.replace(/[^0-9.]/g, ""))}
              keyboardType="numeric"
              autoFocus
              placeholder="0 - 100"
              placeholderTextColor={colors.muted}
            />
            <View style={styles.editActions}>
              <Pressable style={[styles.editBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={() => setEditing(null)}>
                <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Batal</Text>
              </Pressable>
              <Pressable
                testID="edit-save"
                style={[styles.editBtn, { backgroundColor: colors.brandPrimary }]}
                onPress={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  {saveMut.isPending ? "..." : "Simpan"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Export bottom sheet */}
      <Modal visible={exportOpen} transparent animationType="fade" onRequestClose={() => setExportOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setExportOpen(false)}>
          <Pressable style={[styles.editSheet, { paddingBottom: 24 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.editTitle}>Export Data</Text>
            <Text style={styles.editSub}>Pilih format ekspor untuk Kelas {kelas}</Text>
            <ExportButton
              icon="file-pdf-box"
              label="PDF (Landscape)"
              testID="export-pdf"
              color={colors.error}
              onPress={async () => {
                setExportOpen(false);
                await exportPdf({ kelas, teacher: teacherQ.data, categories, rows, share: true });
                toast.show("PDF siap dibagikan", "success");
              }}
            />
            <ExportButton
              icon="file-excel"
              label="Excel (.xlsx)"
              testID="export-xlsx"
              color={colors.success}
              onPress={async () => {
                setExportOpen(false);
                await exportExcel({ kelas, categories, rows });
                toast.show("Excel berhasil diekspor", "success");
              }}
            />
            <ExportButton
              icon="printer"
              label="Print / Bagikan Cetakan"
              testID="export-print"
              color={colors.info}
              onPress={async () => {
                setExportOpen(false);
                await exportPrint({ kelas, teacher: teacherQ.data, categories, rows });
              }}
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
  teacher?: Teacher;
  categories: Category[];
  rows: { student: Student; values: (number | undefined)[]; sum: number; avg: number; count: number }[];
};

function buildHtml({ kelas, teacher, categories, rows }: ExportInput) {
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
      <b>Mata Pelajaran:</b> ${escape(teacher?.mata_pelajaran || "-")}
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
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (Platform.OS === "web") {
    // On web, open the PDF in new tab
    window.open(uri, "_blank");
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Bagikan PDF" });
  }
}

async function exportPrint(input: ExportInput) {
  const html = buildHtml(input);
  await Print.printAsync({ html });
}

async function exportExcel({ kelas, categories, rows }: ExportInput) {
  const headers = ["No", "Nama Siswa", ...categories.map((c) => c.nama), "Jumlah", "Rata-rata"];
  const data = rows.map((r, i) => [
    i + 1,
    r.student.nama,
    ...r.values.map((v) => (typeof v === "number" ? v : "")),
    r.sum,
    r.count === 0 ? "" : Number(r.avg.toFixed(2)),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Kelas ${kelas}`);

  if (Platform.OS === "web") {
    XLSX.writeFile(wb, `rekap-kelas-${kelas}.xlsx`);
    return;
  }
  const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const uri = `${dir}rekap-kelas-${kelas}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Bagikan Excel",
    });
  }
}

const useStyles = makeStyles((colors) => ({
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
    height: 36, paddingHorizontal: 14, borderRadius: 999,
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { api, Schedule } from "@/src/api";
import { Dropdown } from "@/src/components/dropdown";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";
import { DAY_NAMES } from "@/src/schedule-utils";

// Urutan tampil: Senin dulu, Minggu terakhir.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_OPTIONS = DISPLAY_ORDER.map((d) => ({ label: DAY_NAMES[d], value: String(d) }));
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  label: String(h).padStart(2, "0"),
  value: String(h).padStart(2, "0"),
}));
const MIN_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const m = String(i * 5).padStart(2, "0");
  return { label: m, value: m };
});

type FormState = {
  id: string | null;
  hari: string;
  mulaiH: string;
  mulaiM: string;
  selesaiH: string;
  selesaiM: string;
  mapel: string;
  kelas: string;
};

const emptyForm: FormState = {
  id: null,
  hari: "1",
  mulaiH: "07",
  mulaiM: "00",
  selesaiH: "08",
  selesaiM: "00",
  mapel: "",
  kelas: "",
};

export default function JadwalScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const schedulesQ = useQuery({ queryKey: ["schedules"], queryFn: () => api.listSchedules() });
  const schedules = schedulesQ.data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["schedules"] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        hari: parseInt(form.hari, 10),
        jam_mulai: `${form.mulaiH}:${form.mulaiM}`,
        jam_selesai: `${form.selesaiH}:${form.selesaiM}`,
        mata_pelajaran: form.mapel,
        kelas: form.kelas,
      };
      return form.id ? api.updateSchedule(form.id, payload) : api.createSchedule(payload);
    },
    onSuccess: () => {
      toast.show(form.id ? "Jadwal diperbarui" : "Jadwal ditambahkan", "success");
      invalidate();
      setFormOpen(false);
    },
    onError: (e: any) => toast.show(e?.message || "Gagal menyimpan jadwal", "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteSchedule(id),
    onSuccess: () => {
      toast.show("Jadwal dihapus", "success");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.show(e?.message || "Gagal menghapus", "error"),
  });

  const openAdd = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (s: Schedule) => {
    const [mh, mm] = s.jam_mulai.split(":");
    const [sh, sm] = s.jam_selesai.split(":");
    setForm({
      id: s.id,
      hari: String(s.hari),
      mulaiH: mh,
      mulaiM: mm,
      selesaiH: sh,
      selesaiM: sm,
      mapel: s.mata_pelajaran,
      kelas: s.kelas,
    });
    setFormOpen(true);
  };

  const grouped = DISPLAY_ORDER.map((d) => ({
    hari: d,
    items: schedules.filter((s) => s.hari === d),
  })).filter((g) => g.items.length > 0);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
            <Icon name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Jadwal Mengajar</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.headerSub}>Jadwal berulang setiap minggu</Text>
      </View>

      {schedulesQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : grouped.length === 0 ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.emptyWrap} testID="jadwal-empty">
            <View style={styles.emptyIcon}>
              <Icon name="calendar-blank-outline" size={44} color={colors.brandPrimary} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
            <Text style={styles.emptySub}>
              Tambahkan jadwal mengajar agar tampil otomatis di Beranda sesuai hari & jam.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {grouped.map((g) => (
            <View key={g.hari} style={styles.daySection}>
              <Text style={styles.dayLabel}>{DAY_NAMES[g.hari]}</Text>
              {g.items.map((s) => (
                <View key={s.id} style={styles.itemCard} testID={`jadwal-item-${s.id}`}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>{s.jam_mulai}</Text>
                    <View style={styles.timeSepLine} />
                    <Text style={styles.timeText}>{s.jam_selesai}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemMapel} numberOfLines={2}>{s.mata_pelajaran}</Text>
                    <View style={styles.itemKelasRow}>
                      <Icon name="google-classroom" size={14} color={colors.muted} />
                      <Text style={styles.itemKelas}>{s.kelas}</Text>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable onPress={() => openEdit(s)} hitSlop={8} testID={`edit-${s.id}`} style={styles.actionBtn}>
                      <Icon name="pencil" size={18} color={colors.brandPrimary} />
                    </Pressable>
                    <Pressable onPress={() => setDeleteTarget(s)} hitSlop={8} testID={`delete-${s.id}`} style={styles.actionBtn}>
                      <Icon name="trash-can-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={openAdd}
        testID="add-jadwal-btn"
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Tambah Jadwal</Text>
      </Pressable>

      {/* Form modal */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.mBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !saveMut.isPending && setFormOpen(false)} />
          <View style={styles.formSheet}>
            <View style={styles.formHandle} />
            <Text style={styles.formTitle}>{form.id ? "Edit Jadwal" : "Tambah Jadwal"}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 14 }}>
                <Dropdown
                  label="Hari"
                  placeholder="Pilih hari"
                  value={form.hari}
                  options={DAY_OPTIONS}
                  onChange={(v) => set({ hari: v })}
                  testID="dd-hari"
                />
              </View>

              <Text style={styles.fieldLabel}>Jam Mulai</Text>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Dropdown placeholder="Jam" value={form.mulaiH} options={HOUR_OPTIONS} onChange={(v) => set({ mulaiH: v })} testID="dd-mulai-h" />
                </View>
                <Text style={styles.colon}>:</Text>
                <View style={{ flex: 1 }}>
                  <Dropdown placeholder="Menit" value={form.mulaiM} options={MIN_OPTIONS} onChange={(v) => set({ mulaiM: v })} testID="dd-mulai-m" />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Jam Selesai</Text>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Dropdown placeholder="Jam" value={form.selesaiH} options={HOUR_OPTIONS} onChange={(v) => set({ selesaiH: v })} testID="dd-selesai-h" />
                </View>
                <Text style={styles.colon}>:</Text>
                <View style={{ flex: 1 }}>
                  <Dropdown placeholder="Menit" value={form.selesaiM} options={MIN_OPTIONS} onChange={(v) => set({ selesaiM: v })} testID="dd-selesai-m" />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Mata Pelajaran</Text>
              <TextInput
                testID="jadwal-in-mapel"
                style={styles.input}
                value={form.mapel}
                onChangeText={(v) => set({ mapel: v })}
                placeholder="cth. Matematika"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.fieldLabel}>Kelas</Text>
              <TextInput
                testID="jadwal-in-kelas"
                style={styles.input}
                value={form.kelas}
                onChangeText={(v) => set({ kelas: v })}
                placeholder="cth. Kelas 4A"
                placeholderTextColor={colors.muted}
              />
            </ScrollView>

            <View style={styles.formActions}>
              <Pressable
                testID="form-cancel"
                style={[styles.formBtn, { backgroundColor: colors.surfaceTertiary }]}
                onPress={() => setFormOpen(false)}
                disabled={saveMut.isPending}
              >
                <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Batal</Text>
              </Pressable>
              <Pressable
                testID="form-save"
                style={[styles.formBtn, { backgroundColor: colors.brandPrimary }, saveMut.isPending && { opacity: 0.5 }]}
                onPress={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Simpan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => !deleteMut.isPending && setDeleteTarget(null)}>
          <Pressable style={styles.confirmSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmIcon}>
              <Icon name="trash-can-outline" size={32} color={colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Hapus Jadwal?</Text>
            <Text style={styles.confirmBody}>
              {deleteTarget ? `${deleteTarget.mata_pelajaran} (${deleteTarget.kelas}) • ${DAY_NAMES[deleteTarget.hari]} ${deleteTarget.jam_mulai}-${deleteTarget.jam_selesai}` : ""}
            </Text>
            <View style={styles.formActions}>
              <Pressable
                testID="del-cancel"
                style={[styles.formBtn, { backgroundColor: colors.surfaceTertiary }]}
                onPress={() => setDeleteTarget(null)}
                disabled={deleteMut.isPending}
              >
                <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Batal</Text>
              </Pressable>
              <Pressable
                testID="del-confirm"
                style={[styles.formBtn, { backgroundColor: colors.error }, deleteMut.isPending && { opacity: 0.5 }]}
                onPress={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Hapus</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  headerSub: { fontSize: 12, color: colors.muted, marginTop: 6, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },

  daySection: { marginBottom: 20 },
  dayLabel: { fontSize: 14, fontWeight: "800", color: colors.brandPrimary, marginBottom: 10, letterSpacing: 0.3 },
  itemCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  timeBadge: {
    backgroundColor: colors.brandTertiary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
    alignItems: "center", minWidth: 62,
  },
  timeText: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary, fontVariant: ["tabular-nums"] },
  timeSepLine: { width: 14, height: 1.5, backgroundColor: colors.borderStrong, marginVertical: 3 },
  itemMapel: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  itemKelasRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  itemKelas: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  itemActions: { flexDirection: "row", gap: 4 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },

  fab: {
    position: "absolute", right: 16, left: 16,
    backgroundColor: colors.brandPrimary, borderRadius: 16, minHeight: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  fabText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  mBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  formSheet: {
    backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 28,
  },
  formHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 14 },
  formTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceSecondary, marginBottom: 6, marginTop: 4 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  colon: { fontSize: 20, fontWeight: "800", color: colors.muted },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.onSurface, marginBottom: 14,
  },
  formActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  formBtn: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 12 },

  confirmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmSheet: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 },
  confirmIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.errorSoft,
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12,
  },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, textAlign: "center", marginBottom: 8 },
  confirmBody: { fontSize: 14, color: colors.onSurfaceSecondary, textAlign: "center", marginBottom: 16, lineHeight: 20 },
}));

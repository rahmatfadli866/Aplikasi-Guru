import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api, Attendance } from "@/src/api";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

type Status = "hadir" | "sakit" | "izin" | "alpa";
const STATUS_OPTS: { key: Status; label: string; icon: string; color: (c: any) => string; soft: (c: any) => string }[] = [
  { key: "hadir", label: "H", icon: "check", color: (c) => c.success, soft: (c) => c.successSoft },
  { key: "sakit", label: "S", icon: "medical-bag", color: (c) => c.warning, soft: (c) => c.warningSoft },
  { key: "izin", label: "I", icon: "email-outline", color: (c) => c.info, soft: (c) => "#DBEAFE" },
  { key: "alpa", label: "A", icon: "close", color: (c) => c.error, soft: (c) => c.errorSoft },
];

const KELAS_LIST = [1, 2, 3, 4, 5, 6];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateID(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function shiftDate(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function KehadiranScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [kelas, setKelas] = useState<number>(1);
  const [tanggal, setTanggal] = useState<string>(todayISO());

  const studentsQ = useQuery({
    queryKey: ["students", kelas],
    queryFn: () => api.listStudents(kelas),
  });
  const attQ = useQuery({
    queryKey: ["attendance", kelas, tanggal],
    queryFn: () => api.listAttendance({ kelas, tanggal }),
  });

  const attMap = useMemo(() => {
    const m = new Map<string, Attendance>();
    (attQ.data || []).forEach((a) => m.set(a.student_id, a));
    return m;
  }, [attQ.data]);

  const summaryQ = useQuery({
    queryKey: ["attendance", "summary", kelas],
    queryFn: () => api.attendanceSummary(kelas),
  });

  const saveMut = useMutation({
    mutationFn: (p: { student_id: string; status: Status }) =>
      api.saveAttendance({ student_id: p.student_id, tanggal, status: p.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: any) => toast.show(e.message || "Gagal", "error"),
  });

  const students = studentsQ.data || [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
            <Icon name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Catatan Kehadiran</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Date navigator */}
        <View style={styles.dateRow}>
          <Pressable
            testID="date-prev"
            onPress={() => setTanggal((t) => shiftDate(t, -1))}
            style={styles.dateBtn}
          >
            <Icon name="chevron-left" size={22} color={colors.brandPrimary} />
          </Pressable>
          <View style={styles.dateCenter}>
            <Text style={styles.dateTxt} testID="date-label">{formatDateID(tanggal)}</Text>
            {tanggal !== todayISO() && (
              <Pressable onPress={() => setTanggal(todayISO())} testID="date-today">
                <Text style={styles.todayTxt}>Kembali ke hari ini</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            testID="date-next"
            onPress={() => setTanggal((t) => shiftDate(t, 1))}
            style={styles.dateBtn}
          >
            <Icon name="chevron-right" size={22} color={colors.brandPrimary} />
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

      {studentsQ.isLoading && (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      )}

      {!studentsQ.isLoading && students.length === 0 ? (
        <View style={styles.center}>
          <Icon name="account-multiple-outline" size={56} color={colors.muted} />
          <Text style={styles.emptyTxt}>Belum ada siswa di Kelas {kelas}</Text>
          <Text style={[styles.emptyTxt, { fontSize: 12 }]}>Tambahkan siswa lewat Master Data</Text>
        </View>
      ) : null}

      <FlatList
        data={students}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item, index }) => {
          const current = attMap.get(item.id)?.status;
          const summary = summaryQ.data?.[item.id];
          return (
            <View style={styles.card} testID={`kehadiran-row-${item.id}`}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nameTxt} numberOfLines={1}>{item.nama}</Text>
                  {summary ? (
                    <Text style={styles.summaryTxt}>
                      H {summary.hadir} · S {summary.sakit} · I {summary.izin} · A {summary.alpa}
                    </Text>
                  ) : (
                    <Text style={styles.summaryTxt}>Belum ada riwayat</Text>
                  )}
                </View>
              </View>
              <View style={styles.statusRow}>
                {STATUS_OPTS.map((opt) => {
                  const isSel = current === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      testID={`status-${item.id}-${opt.key}`}
                      onPress={() => saveMut.mutate({ student_id: item.id, status: opt.key })}
                      style={[
                        styles.statusBtn,
                        {
                          backgroundColor: isSel ? opt.color(colors) : opt.soft(colors),
                          borderColor: isSel ? opt.color(colors) : "transparent",
                        },
                      ]}
                    >
                      <Icon
                        name={opt.icon as any}
                        size={16}
                        color={isSel ? "#FFFFFF" : opt.color(colors)}
                      />
                      <Text
                        style={[
                          styles.statusLbl,
                          { color: isSel ? "#FFFFFF" : opt.color(colors) },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },

  dateRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.brandTertiary, borderRadius: 14, padding: 8, marginBottom: 10,
  },
  dateBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  dateCenter: { flex: 1, alignItems: "center" },
  dateTxt: { fontSize: 14, fontWeight: "700", color: colors.brandPrimary },
  todayTxt: { fontSize: 11, color: colors.muted, marginTop: 2, textDecorationLine: "underline" },

  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    height: 36, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceSecondary },
  chipTxtActive: { color: "#FFFFFF" },

  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  avatarTxt: { color: colors.brandPrimary, fontWeight: "800" },
  nameTxt: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  summaryTxt: { fontSize: 12, color: colors.muted, marginTop: 2 },

  statusRow: { flexDirection: "row", gap: 8 },
  statusBtn: {
    flex: 1, minHeight: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6,
    borderWidth: 1.5,
  },
  statusLbl: { fontSize: 13, fontWeight: "800" },

  center: { alignItems: "center", justifyContent: "center", padding: 48, gap: 8 },
  emptyTxt: { color: colors.muted, fontSize: 14, textAlign: "center" },
}));

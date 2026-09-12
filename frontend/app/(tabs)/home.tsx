import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { makeStyles, useTheme } from "@/src/theme";
import {
  formatClock,
  formatFullDate,
  resolveCurrentSchedule,
  type ScheduleState,
} from "@/src/schedule-utils";

const HERO_BG =
  "https://images.unsplash.com/photo-1639548538099-6f7f9aec3b92?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzY2hvb2wlMjBjbGFzc3Jvb20lMjBiYWNrZ3JvdW5kJTIwYmx1cnxlbnwwfHx8fDE3ODkxOTIwMzN8MA&ixlib=rb-4.1.0&q=85";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  const teacherQ = useQuery({ queryKey: ["teacher"], queryFn: api.getTeacher });
  const schedulesQ = useQuery({ queryKey: ["schedules"], queryFn: () => api.listSchedules() });

  const teacher = teacherQ.data;
  const schedules = schedulesQ.data ?? [];

  // Live clock — update setiap detik untuk cek jam perangkat real-time.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const state = resolveCurrentSchedule(schedules, now);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        testID="home-scroll"
      >
        {/* Hero teacher card */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: HERO_BG }} style={styles.heroBg} contentFit="cover" />
          <LinearGradient
            colors={["rgba(29,78,216,0.85)", "rgba(29,78,216,0.95)"]}
            style={styles.heroScrim}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatar}>
                {teacher?.photo_path ? (
                  <Image
                    source={{ uri: api.fileUrl(teacher.photo_path) }}
                    style={styles.avatarImg}
                    contentFit="cover"
                    testID="teacher-photo"
                  />
                ) : (
                  <Icon name="account-tie" size={36} color="#FFFFFF" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Selamat Datang</Text>
                <Text style={styles.heroName} numberOfLines={1} testID="teacher-nama">
                  {teacher?.nama || "Guru"}
                </Text>
              </View>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroInfoRow}>
              <View style={styles.heroInfoItem}>
                <Text style={styles.heroInfoLabel}>NIP</Text>
                <Text style={styles.heroInfoValue} numberOfLines={1} testID="teacher-nip">
                  {teacher?.nip || "-"}
                </Text>
              </View>
              <View style={styles.heroInfoItem}>
                <Text style={styles.heroInfoLabel}>Mata Pelajaran</Text>
                <Text style={styles.heroInfoValue} numberOfLines={1} testID="teacher-mapel">
                  {teacher?.mata_pelajaran || "-"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Jadwal Mengajar Saat Ini */}
        <ScheduleCard
          state={state}
          now={now}
          loading={schedulesQ.isLoading}
          onManage={() => router.push("/jadwal")}
        />

        {/* Shortcuts */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.shortcuts}>
          <Pressable
            testID="shortcut-input"
            style={[styles.shortcut, { backgroundColor: colors.brandPrimary }]}
            onPress={() => router.push("/(tabs)/input")}
          >
            <Icon name="pencil-plus" size={28} color="#FFFFFF" />
            <Text style={styles.shortcutTitle}>Input Nilai</Text>
            <Text style={styles.shortcutSub}>Masukkan nilai siswa</Text>
          </Pressable>
          <Pressable
            testID="shortcut-rekap"
            style={[styles.shortcut, { backgroundColor: colors.success }]}
            onPress={() => router.push("/(tabs)/rekap")}
          >
            <Icon name="table-large" size={28} color="#FFFFFF" />
            <Text style={styles.shortcutTitle}>Lihat Rekap</Text>
            <Text style={styles.shortcutSub}>Tabel nilai & ekspor</Text>
          </Pressable>
        </View>

        <Pressable
          testID="shortcut-kehadiran"
          style={styles.masterCard}
          onPress={() => router.push("/kehadiran")}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}>
            <Icon name="calendar-check" size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.masterTitle}>Catatan Kehadiran</Text>
            <Text style={styles.masterSub}>Presensi harian siswa</Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.muted} />
        </Pressable>

        <Pressable
          testID="shortcut-master"
          style={styles.masterCard}
          onPress={() => router.push("/master")}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.brandTertiary }]}>
            <Icon name="database-cog" size={22} color={colors.brandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.masterTitle}>Master Data</Text>
            <Text style={styles.masterSub}>Kelola data siswa & kategori nilai</Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ScheduleCard({
  state,
  now,
  loading,
  onManage,
}: {
  state: ScheduleState;
  now: Date;
  loading: boolean;
  onManage: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  const ongoing = state.kind === "ongoing";

  useEffect(() => {
    if (!ongoing) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ongoing, pulse]);

  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });

  return (
    <View style={styles.schedCard} testID="jadwal-card">
      <View style={styles.schedHeaderRow}>
        <View style={styles.schedHeaderLeft}>
          <View style={styles.schedIcon}>
            <Icon name="calendar-clock" size={20} color={colors.brandPrimary} />
          </View>
          <Text style={styles.schedTitle}>Jadwal Mengajar Saat Ini</Text>
        </View>
      </View>

      <View style={styles.schedDateRow}>
        <Text style={styles.schedDate} testID="jadwal-tanggal">{formatFullDate(now)}</Text>
        <View style={styles.clockPill}>
          <Icon name="clock-outline" size={13} color={colors.brandPrimary} />
          <Text style={styles.clockText} testID="jadwal-jam-sekarang">{formatClock(now)}</Text>
        </View>
      </View>

      <View style={styles.schedDivider} />

      {loading ? (
        <Text style={styles.schedEmpty}>Memuat jadwal…</Text>
      ) : state.kind === "done" ? (
        <View style={styles.schedDone} testID="jadwal-selesai">
          <Icon name="coffee" size={30} color={colors.success} />
          <Text style={styles.schedDoneText}>
            Jadwal hari ini telah selesai.{"\n"}Selamat beristirahat!
          </Text>
        </View>
      ) : (
        <View>
          {ongoing ? (
            <View style={[styles.statusChip, { backgroundColor: colors.successSoft }]} testID="jadwal-status-berlangsung">
              <Animated.View style={[styles.liveDot, { opacity: dotOpacity }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>Sedang Berlangsung</Text>
            </View>
          ) : (
            <View style={[styles.statusChip, { backgroundColor: colors.brandTertiary }]} testID="jadwal-status-selanjutnya">
              <Icon name="arrow-right-circle" size={14} color={colors.brandPrimary} />
              <Text style={[styles.statusText, { color: colors.brandPrimary }]}>Selanjutnya</Text>
            </View>
          )}

          <Text style={styles.schedMapel} numberOfLines={2} testID="jadwal-mapel">
            {state.schedule.mata_pelajaran}
          </Text>

          <View style={styles.schedMetaRow}>
            <View style={styles.schedMetaItem}>
              <Icon name="clock-time-four-outline" size={16} color={colors.muted} />
              <Text style={styles.schedMetaText} testID="jadwal-waktu">
                {state.schedule.jam_mulai} – {state.schedule.jam_selesai}
              </Text>
            </View>
            <View style={styles.schedMetaItem}>
              <Icon name="google-classroom" size={16} color={colors.muted} />
              <Text style={styles.schedMetaText} testID="jadwal-kelas">{state.schedule.kelas}</Text>
            </View>
          </View>
        </View>
      )}

      <Pressable style={styles.schedManage} onPress={onManage} testID="jadwal-manage-btn">
        <Icon name="cog-outline" size={15} color={colors.brandPrimary} />
        <Text style={styles.schedManageText}>Atur Jadwal Mengajar</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  heroWrap: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 180,
  },
  heroBg: { ...(({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const)) },
  heroScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { padding: 20 },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" },
  heroName: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 16 },
  heroInfoRow: { flexDirection: "row", gap: 20 },
  heroInfoItem: { flex: 1 },
  heroInfoLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 4, fontWeight: "600", letterSpacing: 0.3 },
  heroInfoValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 16 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  schedCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  schedHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  schedHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  schedIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  schedTitle: { fontSize: 15, fontWeight: "800", color: colors.onSurface, flexShrink: 1 },
  schedDateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  schedDate: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceSecondary, flexShrink: 1 },
  clockPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  clockText: { fontSize: 13, fontWeight: "700", color: colors.brandPrimary, fontVariant: ["tabular-nums"] },
  schedDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 14 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
  statusText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  schedMapel: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 12 },
  schedMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 10 },
  schedMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  schedMetaText: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceSecondary },
  schedEmpty: { fontSize: 14, color: colors.muted, paddingVertical: 12, textAlign: "center" },
  schedDone: { alignItems: "center", gap: 10, paddingVertical: 10 },
  schedDoneText: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 20 },
  schedManage: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  schedManageText: { fontSize: 13, fontWeight: "700", color: colors.brandPrimary },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  shortcuts: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  shortcut: { flex: 1, borderRadius: 16, padding: 16, minHeight: 120, justifyContent: "space-between" },
  shortcutTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginTop: 8 },
  shortcutSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  masterCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  masterTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  masterSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
}));

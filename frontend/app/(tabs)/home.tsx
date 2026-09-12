import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { makeStyles, useTheme } from "@/src/theme";

const HERO_BG =
  "https://images.unsplash.com/photo-1639548538099-6f7f9aec3b92?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzY2hvb2wlMjBjbGFzc3Jvb20lMjBiYWNrZ3JvdW5kJTIwYmx1cnxlbnwwfHx8fDE3ODkxOTIwMzN8MA&ixlib=rb-4.1.0&q=85";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  const teacherQ = useQuery({ queryKey: ["teacher"], queryFn: api.getTeacher });
  const statsQ = useQuery({ queryKey: ["stats"], queryFn: api.getStats });

  const teacher = teacherQ.data;
  const stats = statsQ.data;

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
                <Icon name="account-tie" size={36} color="#FFFFFF" />
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

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard} testID="stat-siswa">
            <View style={[styles.statIcon, { backgroundColor: colors.brandTertiary }]}>
              <Icon name="account-group" size={22} color={colors.brandPrimary} />
            </View>
            <Text style={styles.statValue}>{stats?.total_students ?? 0}</Text>
            <Text style={styles.statLabel}>Total Siswa</Text>
          </View>
          <View style={styles.statCard} testID="stat-kelas">
            <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}>
              <Icon name="school" size={22} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{stats?.kelas_aktif ?? 0}</Text>
            <Text style={styles.statLabel}>Kelas Aktif</Text>
          </View>
          <View style={styles.statCard} testID="stat-nilai">
            <View style={[styles.statIcon, { backgroundColor: colors.warningSoft }]}>
              <Icon name="clipboard-list" size={22} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{stats?.total_grades ?? 0}</Text>
            <Text style={styles.statLabel}>Total Nilai</Text>
          </View>
        </View>

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
  },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" },
  heroName: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 16 },
  heroInfoRow: { flexDirection: "row", gap: 20 },
  heroInfoItem: { flex: 1 },
  heroInfoLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 4, fontWeight: "600", letterSpacing: 0.3 },
  heroInfoValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: "500" },

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

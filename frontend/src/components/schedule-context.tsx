import { Text, View } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { Schedule } from "@/src/api";
import { makeStyles, useTheme } from "@/src/theme";

export function ScheduleContext({ schedule, kelas, testID }: { schedule?: Schedule | null; kelas?: number | null; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const active = !!schedule && !!kelas;
  return (
    <View testID={testID} style={styles.card}>
      <Icon name={active ? "calendar-check" : "information-outline"} size={22} color={colors.brandPrimary} />
      <View style={styles.content}>
        <Text testID={`${testID}-title`} style={styles.title}>
          {active ? `Kelas ${kelas} · ${schedule.mata_pelajaran}` : "Pilih kelas secara manual"}
        </Text>
        <Text testID={`${testID}-detail`} style={styles.detail}>
          {active ? `Mengikuti jadwal aktif · ${schedule.jam_mulai}–${schedule.jam_selesai}`
            : schedule ? `Kelas “${schedule.kelas}” belum cocok dengan Master Data (1–6).`
              : "Tidak ada jadwal yang sedang berlangsung."}
        </Text>
        {active && /[1-6]\s*[a-z]$/i.test(schedule.kelas) && (
          <Text testID={`${testID}-class-note`} style={styles.detail}>Data siswa memakai tingkat Kelas {kelas}, belum dibagi rombel.</Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.brandTertiary, borderRadius: 14, padding: 16, flexDirection: "row", gap: 12 },
  content: { flex: 1, gap: 5 },
  title: { color: colors.brandPrimary, fontSize: 15, fontWeight: "700" },
  detail: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 18 },
}));
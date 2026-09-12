import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GradeInputForm } from "@/src/components/grade-input-form";
import { useActiveSchedule } from "@/src/hooks/use-active-schedule";
import { makeStyles, useTheme } from "@/src/theme";

export default function QuickInputScreen() {
  const { schedule, kelas, isLoading, isError } = useActiveSchedule();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  if (isLoading) return <View style={styles.center}><ActivityIndicator testID="quick-grade-loading" color={colors.brandPrimary} /></View>;
  if (isError) return <View style={styles.center}>
    <Text testID="quick-grade-error" style={styles.error}>Gagal membaca jadwal. Anda tetap bisa mengisi secara manual.</Text>
    <Pressable testID="quick-grade-error-manual" style={styles.button} onPress={() => router.replace("/(tabs)/input")}>
      <Text testID="quick-grade-error-manual-label" style={styles.buttonText}>Input Manual</Text>
    </Pressable>
  </View>;
  return <GradeInputForm key={`${schedule?.id || "manual"}-${kelas}-${schedule?.mata_pelajaran}`}
    quick schedule={schedule} scheduleClass={kelas} />;
}

const useStyles = makeStyles((colors) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.surface },
  error: { color: colors.error, textAlign: "center" },
  button: { minHeight: 48, justifyContent: "center", paddingHorizontal: 20, marginTop: 16, borderRadius: 12, backgroundColor: colors.brandPrimary },
  buttonText: { color: colors.onBrandPrimary, fontWeight: "700" },
}));
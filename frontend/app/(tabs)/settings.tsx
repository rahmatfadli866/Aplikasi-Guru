import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();

  const teacherQ = useQuery({ queryKey: ["teacher"], queryFn: api.getTeacher });
  const [nama, setNama] = useState("");
  const [nip, setNip] = useState("");
  const [mapel, setMapel] = useState("");

  useEffect(() => {
    if (teacherQ.data) {
      setNama(teacherQ.data.nama);
      setNip(teacherQ.data.nip);
      setMapel(teacherQ.data.mata_pelajaran);
    }
  }, [teacherQ.data]);

  const mut = useMutation({
    mutationFn: () => api.updateTeacher({ nama, nip, mata_pelajaran: mapel }),
    onSuccess: () => {
      toast.show("Profil guru berhasil disimpan", "success");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    },
    onError: (e: any) => toast.show(e.message || "Gagal menyimpan", "error"),
  });

  const [uploading, setUploading] = useState(false);
  const teacher = teacherQ.data;
  const photoUri = teacher?.photo_path ? api.fileUrl(teacher.photo_path) : "";

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          toast.show("Izin galeri ditolak. Buka Pengaturan.", "error");
          Linking.openSettings();
        } else {
          toast.show("Izin galeri diperlukan", "error");
        }
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploading(true);

      let localUri = asset.uri;
      if (Platform.OS === "web") {
        // On web store as data URL so it survives reloads (no persistent FS).
        const blob = await (await fetch(asset.uri)).blob();
        localUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Copy picker temp file into persistent app document directory.
        const dir = FileSystem.documentDirectory;
        if (dir) {
          const ext = (asset.mimeType?.split("/")[1] || "jpg").replace("jpeg", "jpg");
          const dest = `${dir}teacher-photo-${Date.now()}.${ext}`;
          try {
            await FileSystem.copyAsync({ from: asset.uri, to: dest });
            localUri = dest;
          } catch {
            // fall back to raw uri if copy fails
          }
        }
      }

      await api.setTeacherPhoto(localUri);
      toast.show("Foto profil diperbarui", "success");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e: any) {
      toast.show(e?.message || "Gagal memilih foto", "error");
    } finally {
      setUploading(false);
    }
  };

  const removeMut = useMutation({
    mutationFn: () => api.removeTeacherPhoto(),
    onSuccess: () => {
      toast.show("Foto profil dihapus", "success");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    },
    onError: (e: any) => toast.show(e.message || "Gagal", "error"),
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <Text style={styles.headerSub}>Kelola profil guru & data aplikasi</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.section}>PROFIL GURU</Text>
          <View style={styles.photoWrap}>
            <Pressable
              testID="btn-pick-photo"
              onPress={pickPhoto}
              style={styles.photoAvatar}
              disabled={uploading}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} contentFit="cover" />
              ) : (
                <Icon name="account" size={54} color={colors.brandPrimary} />
              )}
              <View style={styles.photoBadge}>
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Icon name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
            <View style={styles.photoActions}>
              <Pressable testID="btn-photo-change" onPress={pickPhoto} disabled={uploading}>
                <Text style={styles.photoLink}>
                  {photoUri ? "Ganti Foto Profil" : "Unggah Foto Profil"}
                </Text>
              </Pressable>
              {!!photoUri && (
                <Pressable
                  testID="btn-photo-remove"
                  onPress={() => removeMut.mutate()}
                  disabled={removeMut.isPending}
                >
                  <Text style={[styles.photoLink, { color: colors.error, marginTop: 6 }]}>
                    Hapus Foto
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.card}>
            <Field label="Nama Lengkap" value={nama} onChange={setNama} placeholder="cth. Ibu Ratna Sari, S.Pd" testID="in-nama" />
            <View style={styles.sep} />
            <Field label="NIP" value={nip} onChange={setNip} placeholder="cth. 198705122010012001" testID="in-nip" keyboardType="numeric" />
            <View style={styles.sep} />
            <Field label="Mata Pelajaran" value={mapel} onChange={setMapel} placeholder="cth. Matematika" testID="in-mapel" />
          </View>

          <Pressable
            testID="btn-save-profile"
            style={[styles.saveBtn, mut.isPending && { opacity: 0.5 }]}
            disabled={mut.isPending}
            onPress={() => mut.mutate()}
          >
            <Icon name="content-save" size={20} color="#FFFFFF" />
            <Text style={styles.saveTxt}>{mut.isPending ? "Menyimpan…" : "Simpan Profil"}</Text>
          </Pressable>

          <Text style={styles.section}>DATA APLIKASI</Text>
          <View style={styles.card}>
            <Pressable
              testID="row-master"
              style={styles.row}
              onPress={() => router.push("/master")}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
                <Icon name="database-cog" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Master Data</Text>
                <Text style={styles.rowSub}>Kelola siswa & kategori nilai</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={styles.section}>TENTANG APLIKASI</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
                <Icon name="information-outline" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Sistem Manajemen Nilai Siswa</Text>
                <Text style={styles.rowSub}>100% offline • Data tersimpan di perangkat</Text>
              </View>
            </View>
            <View style={styles.sep} />
            <View style={styles.aboutRow}>
              <View style={[styles.rowIcon, { backgroundColor: colors.successSoft }]}>
                <Icon name="tag-outline" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Versi Aplikasi</Text>
                <Text style={styles.rowSub}>1.0.0</Text>
              </View>
            </View>
            <View style={styles.sep} />
            <View style={styles.aboutRow}>
              <View style={[styles.rowIcon, { backgroundColor: colors.warningSoft }]}>
                <Icon name="account-tie" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Oleh</Text>
                <Text style={styles.rowSub} testID="about-author">Rahmat Fadli, M.Pd.,Gr</Text>
              </View>
            </View>
          </View>

          <Text style={styles.footerNote}>© 2026 Sistem Manajemen Nilai Siswa</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, testID, keyboardType,
}: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; testID?: string;
  keyboardType?: "default" | "numeric";
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  section: {
    fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.6,
    marginTop: 16, marginBottom: 8, paddingHorizontal: 4,
  },
  photoWrap: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  photoAvatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  },
  photoImg: { width: "100%", height: "100%" },
  photoBadge: {
    position: "absolute", right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surfaceSecondary,
  },
  photoActions: { flex: 1 },
  photoLink: { color: colors.brandPrimary, fontWeight: "700", fontSize: 14 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
  },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  label: { fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 6 },
  input: {
    fontSize: 15, color: colors.onSurface, paddingVertical: 6, fontWeight: "500",
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginHorizontal: 14 },

  saveBtn: {
    backgroundColor: colors.brandPrimary, borderRadius: 14, minHeight: 52,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 16,
  },
  saveTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  aboutRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  footerNote: { textAlign: "center", color: colors.muted, marginTop: 24, fontSize: 12 },
}));

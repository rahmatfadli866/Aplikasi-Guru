import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api, Category, Student } from "@/src/api";
import { Dropdown } from "@/src/components/dropdown";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

const KELAS_OPTIONS = [1, 2, 3, 4, 5, 6].map((k) => ({ label: `Kelas ${k}`, value: String(k) }));

export default function MasterScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<"siswa" | "kategori">("siswa");

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
            <Icon name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Master Data</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.segmentWrap}>
          <SegmentButton
            active={tab === "siswa"}
            label="Data Siswa"
            onPress={() => setTab("siswa")}
            testID="seg-siswa"
          />
          <SegmentButton
            active={tab === "kategori"}
            label="Kategori Nilai"
            onPress={() => setTab("kategori")}
            testID="seg-kategori"
          />
        </View>
      </View>

      {tab === "siswa" ? <SiswaList /> : <KategoriList />}
    </View>
  );
}

function SegmentButton({ active, label, onPress, testID }: { active: boolean; label: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
        backgroundColor: active ? colors.surfaceSecondary : "transparent",
        ...(active ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
          elevation: 2,
        } : {}),
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: active ? colors.brandPrimary : colors.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}

// --------- Siswa ---------

function SiswaList() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["students"], queryFn: () => api.listStudents() });
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; item: Student } | null>(null);
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");

  const openCreate = () => { setModal({ mode: "create" }); setNama(""); setKelas(""); };
  const openEdit = (item: Student) => { setModal({ mode: "edit", item }); setNama(item.nama); setKelas(String(item.kelas)); };
  const close = () => setModal(null);

  const saveMut = useMutation({
    mutationFn: () => {
      if (!modal) throw new Error("no modal");
      const data = { nama: nama.trim(), kelas: Number(kelas) };
      return modal.mode === "create" ? api.createStudent(data) : api.updateStudent(modal.item.id, data);
    },
    onSuccess: () => {
      toast.show(modal?.mode === "edit" ? "Siswa diperbarui" : "Siswa ditambahkan", "success");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      close();
    },
    onError: (e: any) => toast.show(e.message || "Gagal", "error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.deleteStudent(id),
    onSuccess: () => {
      toast.show("Siswa dihapus", "success");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const canSave = !!nama.trim() && !!kelas;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={q.data || []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="account-multiple-outline" size={56} color={colors.muted} />
            <Text style={styles.emptyTxt}>Belum ada data siswa</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemAvatar}>
              <Text style={styles.itemAvatarTxt}>{item.nama.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.nama}</Text>
              <Text style={styles.itemSub}>Kelas {item.kelas}</Text>
            </View>
            <Pressable
              testID={`edit-siswa-${item.id}`}
              onPress={() => openEdit(item)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Icon name="pencil" size={18} color={colors.brandPrimary} />
            </Pressable>
            <Pressable
              testID={`delete-siswa-${item.id}`}
              onPress={() => delMut.mutate(item.id)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Icon name="trash-can-outline" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}
      />
      <Pressable
        testID="add-siswa"
        onPress={openCreate}
        style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 16 }]}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
        <Text style={styles.fabTxt}>Tambah Siswa</Text>
      </Pressable>

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={close}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{modal?.mode === "edit" ? "Edit Siswa" : "Tambah Siswa"}</Text>
              <Text style={styles.mLbl}>Nama Siswa</Text>
              <TextInput
                testID="siswa-nama"
                style={styles.mInput}
                value={nama}
                onChangeText={setNama}
                placeholder="Nama lengkap"
                placeholderTextColor={colors.muted}
              />
              <View style={{ height: 12 }} />
              <Dropdown
                testID="siswa-kelas"
                label="Kelas"
                placeholder="Pilih Kelas"
                value={kelas}
                options={KELAS_OPTIONS}
                onChange={setKelas}
              />
              <View style={styles.sheetActions}>
                <Pressable style={[styles.sBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={close}>
                  <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Batal</Text>
                </Pressable>
                <Pressable
                  testID="siswa-save"
                  style={[styles.sBtn, { backgroundColor: colors.brandPrimary }, (!canSave || saveMut.isPending) && { opacity: 0.5 }]}
                  disabled={!canSave || saveMut.isPending}
                  onPress={() => saveMut.mutate()}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{saveMut.isPending ? "..." : "Simpan"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// --------- Kategori ---------

function KategoriList() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; item: Category } | null>(null);
  const [nama, setNama] = useState("");

  const openCreate = () => { setModal({ mode: "create" }); setNama(""); };
  const openEdit = (item: Category) => { setModal({ mode: "edit", item }); setNama(item.nama); };
  const close = () => setModal(null);

  const saveMut = useMutation({
    mutationFn: () => {
      if (!modal) throw new Error("no modal");
      const data = { nama: nama.trim() };
      return modal.mode === "create" ? api.createCategory(data) : api.updateCategory(modal.item.id, data);
    },
    onSuccess: () => {
      toast.show(modal?.mode === "edit" ? "Kategori diperbarui" : "Kategori ditambahkan", "success");
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      close();
    },
    onError: (e: any) => toast.show(e.message || "Gagal", "error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      toast.show("Kategori dihapus", "success");
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["grades"] });
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={q.data || []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="tag-multiple-outline" size={56} color={colors.muted} />
            <Text style={styles.emptyTxt}>Belum ada kategori</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={[styles.itemAvatar, { backgroundColor: colors.brandTertiary }]}>
              <Icon name="tag" size={18} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.nama}</Text>
              <Text style={styles.itemSub}>{item.is_default ? "Bawaan" : "Kustom"}</Text>
            </View>
            <Pressable
              testID={`edit-kat-${item.id}`}
              onPress={() => openEdit(item)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Icon name="pencil" size={18} color={colors.brandPrimary} />
            </Pressable>
            <Pressable
              testID={`delete-kat-${item.id}`}
              onPress={() => delMut.mutate(item.id)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Icon name="trash-can-outline" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}
      />
      <Pressable
        testID="add-kategori"
        onPress={openCreate}
        style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 16 }]}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
        <Text style={styles.fabTxt}>Tambah Kategori</Text>
      </Pressable>

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={close}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{modal?.mode === "edit" ? "Edit Kategori" : "Tambah Kategori"}</Text>
              <Text style={styles.mLbl}>Nama Kategori</Text>
              <TextInput
                testID="kat-nama"
                style={styles.mInput}
                value={nama}
                onChangeText={setNama}
                placeholder="cth. Bab 11, PR 1, Praktikum"
                placeholderTextColor={colors.muted}
              />
              <View style={styles.sheetActions}>
                <Pressable style={[styles.sBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={close}>
                  <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Batal</Text>
                </Pressable>
                <Pressable
                  testID="kat-save"
                  style={[styles.sBtn, { backgroundColor: colors.brandPrimary }, (!nama.trim() || saveMut.isPending) && { opacity: 0.5 }]}
                  disabled={!nama.trim() || saveMut.isPending}
                  onPress={() => saveMut.mutate()}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{saveMut.isPending ? "..." : "Simpan"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  segmentWrap: {
    flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: 12, padding: 4, marginTop: 8, gap: 4,
  },

  itemCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surfaceSecondary, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  itemAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  itemAvatarTxt: { color: colors.brandPrimary, fontWeight: "800", fontSize: 15 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  itemSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
  },

  empty: { alignItems: "center", justifyContent: "center", padding: 48, gap: 8 },
  emptyTxt: { color: colors.muted, fontSize: 14 },

  fab: {
    position: "absolute", right: 16,
    backgroundColor: colors.brandPrimary, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999,
    flexDirection: "row", alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  fabTxt: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginBottom: 16 },
  mLbl: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceSecondary, marginBottom: 6 },
  mInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: colors.onSurface, minHeight: 48,
  },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 18 },
  sBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12 },
}));

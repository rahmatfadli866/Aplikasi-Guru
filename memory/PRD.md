# Sistem Manajemen Nilai Siswa - PRD

## Overview
Aplikasi mobile React Native / Expo untuk guru Indonesia mengelola nilai siswa Kelas 1–6. **100% offline** — semua data tersimpan lokal di perangkat via AsyncStorage. Tidak perlu koneksi internet / login / sinkronisasi. Bahasa Indonesia, tema biru edukasi + aksen hijau.

## Fitur Utama
1. **Beranda**: Kartu profil guru (foto, Nama, NIP, Mata Pelajaran), stats (Total Siswa, Kelas Aktif, Total Nilai), Aksi Cepat (Input Nilai, Lihat Rekap), shortcut Catatan Kehadiran & Master Data.
2. **Master Data** (`/master`): CRUD Siswa (nama + kelas 1–6) dan CRUD Kategori Nilai (default: Bab 1–10, Quiz, UTS, US).
3. **Input Nilai**: Dependent dropdown Kelas → Siswa → Kategori → nilai 0–100 dengan validasi + toast sukses. Upsert (satu nilai per pasangan siswa+kategori).
4. **Rekap**: Filter chip Kelas 1–6, tabel horizontal-scroll (Nama + ringkasan presensi, kategori..., Jumlah, Rata²). Rata² > 75 hijau + ikon smile, ≤ 75 merah + ikon alert. Inline edit tap cell → modal.
5. **Catatan Kehadiran** (`/kehadiran`): navigasi tanggal, filter kelas, tombol H/S/I/A per siswa dengan upsert real-time, ringkasan riwayat H·S·I·A.
6. **Export** (dari Rekap): PDF landscape, Excel .xlsx, Print/Share — semua dibuat di device.
7. **Pengaturan**: Foto profil guru (unggah dari galeri, disimpan lokal di `documentDirectory`), edit Nama/NIP/Mapel, navigasi ke Master Data, Tentang Aplikasi (Versi 1.0.0, Oleh: Rahmat Fadli, M.Pd.,Gr).

## Arsitektur Offline
- **Storage**: `@react-native-async-storage/async-storage` (native) / IndexedDB via AsyncStorage-web shim.
- **Koleksi**: `smns:teacher`, `smns:students`, `smns:categories`, `smns:grades`, `smns:attendance` — masing-masing disimpan sebagai JSON string.
- **ID**: UUID lokal (`uid()` di `local-store.ts`).
- **Foto Profil**: Native → di-copy ke `FileSystem.documentDirectory` sebagai `file://`; Web → disimpan sebagai `data:` URL.
- **Interface**: `src/api.ts` mempertahankan API `api.*` yang sama (kompat backward), tapi delegasinya ke `local-store.ts` — screens tidak berubah.
- **Backend FastAPI**: ada tapi tidak dipakai frontend (siap dipakai kalau nanti butuh multi-device sync).

## Frontend Stack
- Expo Router (tabs group + `/master`, `/kehadiran` stack)
- React Query untuk cache in-memory + invalidation
- expo-image, expo-linear-gradient, expo-print, expo-sharing, expo-file-system, expo-image-picker
- xlsx, @react-native-vector-icons/material-design-icons
- Theme di `src/theme.ts` diisi dari `design_guidelines.json`

## Testing
- Backend: 15/15 pytest passed (siap dipakai lagi jika mode online dibutuhkan).
- Frontend: alur offline CRUD (guru profil, siswa, nilai, kehadiran, rekap) tervalidasi dengan network `/api/**` diblok.

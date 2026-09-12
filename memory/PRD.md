# Sistem Manajemen Nilai Siswa - PRD

## Overview
Aplikasi mobile React Native / Expo untuk guru Indonesia mengelola nilai siswa Kelas 1–6. **100% offline** — semua data tersimpan lokal di perangkat via AsyncStorage (IndexedDB di web). Tidak perlu koneksi internet / login / sinkronisasi. Bahasa Indonesia, tema biru edukasi + aksen hijau.

## Fitur Utama
1. **Beranda**: Kartu profil guru (foto, Nama, NIP, Mata Pelajaran) + kartu **"Jadwal Mengajar Saat Ini"** (real-time). Aksi Cepat (Input Nilai, Lihat Rekap), shortcut Catatan Kehadiran & Master Data.
2. **Master Data** (`/master`): CRUD Siswa (nama + kelas 1–6) dan CRUD Kategori Nilai (default: Bab 1–10, Quiz, UTS, US).
3. **Input Nilai**: Dependent dropdown Kelas → Siswa → Kategori → nilai 0–100 dengan validasi + toast sukses. Upsert.
4. **Rekap**: Filter chip Kelas 1–6, tabel horizontal-scroll, rata² > 75 hijau / ≤ 75 merah. Inline edit.
5. **Catatan Kehadiran** (`/kehadiran`): navigasi tanggal, filter kelas, H/S/I/A per siswa, ringkasan.
6. **Export** (dari Rekap): PDF landscape, Excel .xlsx, Print/Share — di device.
7. **Pengaturan**: Foto profil guru, edit Nama/NIP/Mapel, **Pengaturan Jadwal Mengajar**, Master Data, Hapus Data Siswa, Tentang.

## Fitur Jadwal Mengajar (BARU — Juni 2026)
- **Kartu Beranda "Jadwal Mengajar Saat Ini"**: menggantikan 3 kotak statistik lama. Menampilkan Hari & Tanggal (real-time), jam berjalan (live clock, update tiap detik via `setInterval`), Mata Pelajaran, Kelas, dan rentang jam.
- **Logika dinamis** (`src/schedule-utils.ts` → `resolveCurrentSchedule`):
  - Jam sekarang di dalam rentang jadwal → label **"Sedang Berlangsung"** (chip hijau + titik berkedip halus / Animated pulse).
  - Ada jadwal berikutnya hari ini → label **"Selanjutnya"** (chip biru).
  - Semua jadwal hari itu selesai / kosong → pesan **"Jadwal hari ini telah selesai. Selamat beristirahat!"**
- **Pengaturan Jadwal Mengajar** (`/jadwal`): CRUD jadwal berulang mingguan. Form: Hari (Senin–Minggu), Jam Mulai, Jam Selesai, Mata Pelajaran, Kelas. Jam dipilih via dropdown jam (00–23) + menit (kelipatan 5). Daftar dikelompokkan per hari, edit & hapus per item.
- **Penyimpanan offline**: koleksi `smns:schedules` di local-store (AsyncStorage/IndexedDB), sama seperti data lain. `hari` disimpan 0–6 (selaras `Date.getDay()`), jam format "HH:MM".

## Arsitektur Offline
- **Storage**: `@/src/utils/storage` (AsyncStorage native / IndexedDB web).
- **Koleksi**: `smns:teacher`, `smns:students`, `smns:categories`, `smns:grades`, `smns:attendance`, `smns:schedules`.
- **Interface**: `src/api.ts` mendelegasikan ke `local-store.ts`.
- **Backend FastAPI**: ada tapi tidak dipakai frontend.

## Frontend Stack
- Expo Router (tabs group + `/master`, `/kehadiran`, `/jadwal` stack)
- React Query untuk cache + invalidation (queryKey `["schedules"]`)
- expo-image, expo-linear-gradient, Animated (pulse), expo-print, xlsx, material-design-icons
- Theme di `src/theme.ts`

## Backlog / Next
- P1: Notifikasi lokal sebelum jam pelajaran mulai.
- P2: Tampilkan seluruh jadwal hari ini (bukan hanya yang aktif) di kartu Beranda opsional.
- P2: Ekspor/impor jadwal.

## Testing
- Frontend: alur offline CRUD tervalidasi. Jadwal Mengajar (CRUD + logika real-time) divalidasi via testing agent.

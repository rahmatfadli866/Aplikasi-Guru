# Sistem Manajemen Nilai Siswa - PRD

## Overview
Aplikasi mobile React Native / Expo untuk guru Indonesia mengelola nilai siswa Kelas 1–6. **100% offline** — semua data tersimpan lokal di perangkat via AsyncStorage (IndexedDB di web). Tidak perlu koneksi internet / login / sinkronisasi. Bahasa Indonesia, tema biru edukasi + aksen hijau.

## Fitur Utama
1. **Beranda**: Kartu profil guru (foto, Nama, NIP, Mata Pelajaran) + kartu **"Jadwal Mengajar Saat Ini"** (real-time). Aksi Cepat **Input Nilai** dan **Input Absensi**, otomatis mengikuti jadwal yang sedang berlangsung. Shortcut Catatan Kehadiran & Master Data tetap tersedia.
2. **Master Data** (`/master`): CRUD Siswa (nama + kelas 1–6) dan CRUD Kategori Nilai (default: Bab 1–10, Quiz, UTS, US).
3. **Input Nilai**: Kelas → Siswa → Mata Pelajaran → Jenis Nilai → angka 0–100. Pilih mapel dari jadwal/profil/riwayat nilai atau tulis mapel baru. Upsert berdasarkan **siswa + mata pelajaran + jenis nilai**.
4. **Rekap**: Filter Kelas 1–6 dan **Mata Pelajaran**, tabel horizontal-scroll, jumlah/rata-rata per mapel, rata² > 75 hijau / ≤ 75 merah. Inline edit hanya memengaruhi mapel terpilih. Nilai kosong tidak dapat disimpan sebagai 0.
5. **Catatan Kehadiran** (`/kehadiran`): navigasi tanggal, filter kelas, H/S/I/A per siswa, ringkasan.
6. **Export** (dari Rekap): PDF landscape, Excel .xlsx, Print/Share — di device. Isi dan metadata mengikuti kelas serta mapel terpilih; nama file Excel menyertakan mapel.
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

## Nilai per Mapel & Aksi Cepat (September 2026)
### Permintaan pengguna
- Pisahkan input dan rekap nilai sesuai mata pelajaran dengan urutan kelas → siswa → mapel → jenis → angka.
- Aksi cepat nilai mengikuti kelas/mapel jadwal **sedang berlangsung**, cukup siswa → jenis → angka.
- Ganti kotak aksi cepat Lihat Rekap dengan Input Absensi yang otomatis mengikuti kelas aktif.
- Disetujui: saat tidak ada jadwal aktif, pilih kelas/mapel secara manual. Tetap 100% offline.

### Implementasi
- `Grade.mata_pelajaran?: string`: optional hanya untuk data lama. `GradeInput` mewajibkan mapel baru. Normalisasi trim/spasi/case untuk pencocokan/upsert tanpa menimpa mapel lain.
- Nilai lama tanpa mapel tidak dimigrasi secara asumtif atau dihapus; tersedia di filter **Nilai lama (belum ada mata pelajaran)**. Bisa mengedit nilai lama yang sudah ada, tetapi tidak membuat nilai baru tanpa mapel.
- `src/components/grade-input-form.tsx`: formulir bersama manual/cepat. `subject-picker.tsx`: pilihan mapel + input nama baru.
- `/input-cepat`: route stack terpisah dari tab Input, sehingga form manual tidak terkunci parameter jadwal. Banner menampilkan kelas/mapel otomatis; tombol pindah manual tersedia.
- `src/hooks/use-active-schedule.ts`: interval per detik, cek saat fokus dan kembali dari background; timer/listener dibersihkan. Hanya `ongoing`, tidak memakai `next`. Form cepat direset saat ID jadwal/kelas/mapel berubah.
- `scheduleClassNumber`: `4`, `Kelas 4`, angka Romawi I–VI, serta `Kelas 4A` dipetakan ke tingkat 1–6. Untuk rombel diberi penjelasan bahwa master siswa belum dibagi rombel. Label tidak dikenali → pilih manual, bukan default Kelas 1.
- `/kehadiran?cepat=1`: kelas aktif + tanggal perangkat hari ini otomatis, tombol status H/S/I/A. Tidak ada jadwal → pilih kelas dahulu. Catatan Kehadiran manual tetap memiliki navigasi tanggal/kelas.
- Write lock koleksi nilai/absensi mencegah overwrite akibat ketukan cepat; kegagalan penulisan ditampilkan sebagai error.
- `use-subjects.ts`, `subject-utils.ts`, `schedule-context.tsx` menangani daftar mapel dan konteks bersama.
- Kompatibilitas dependensi aktual: Expo **57** sesuai package.json (tidak diturunkan); API FileSystem lama memakai `/legacy`. Theme menangani `unspecified` dengan fallback.

## Frontend Stack
- Expo Router (tabs group + `/master`, `/kehadiran`, `/jadwal`, `/input-cepat` stack)
- React Query untuk cache + invalidation (queryKey `["schedules"]`)
- expo-image, expo-linear-gradient, Animated (pulse), expo-print, xlsx, material-design-icons
- Theme di `src/theme.ts`

## Backlog / Next
- P0: Tidak ada bug fungsional terbuka pada alur yang diuji; menunggu verifikasi pengguna di perangkat.
- P1: Verifikasi PDF/Print/Share dan keyboard native di Android/iOS nyata (browser tidak bisa menguji native share sheet).
- P1: Rekap absensi bulanan.
- P1: Notifikasi lokal sebelum jam pelajaran mulai.
- P2: Tampilkan seluruh jadwal hari ini (bukan hanya yang aktif) di kartu Beranda opsional.
- P2: Ekspor/impor jadwal.

## Testing
- Frontend: alur offline CRUD tervalidasi. Jadwal Mengajar (CRUD + logika real-time) divalidasi via testing agent.
- Nilai/mapel dan aksi cepat: `/app/test_reports/iteration_3.json` mencakup isolasi mapel+kelas, legacy, Excel, jadwal aktif/gap/pergantian, offline persistence, viewport 390/320.
- Temuan edit kosong: guard penyimpanan sudah menolak blank, tetapi status disabled tombol kurang jelas bagi aksesibilitas/pengujian. Ditambah role/state eksplisit, gaya nonaktif, validasi bersama, reset modal, dan guard onPress.
- Self-retest lulus via UI: sel kosong disabled; 101/1..2 disabled; 0/100 valid; 0 disimpan eksplisit; cancel/reopen reset dan nilai lama tetap utuh. Lihat `/app/test_reports/iteration_3_retest.json`.
- ESLint seluruh app/src dan TypeScript lulus. Native sharing belum diuji pada perangkat; backend sengaja tidak diuji karena tidak dipakai.
- Setelah restart terakhir, tampilan Home/Input diverifikasi ulang; bundle Metro **Android** (12.1 MB) dan **iOS** (11.7 MB) berhasil dihasilkan HTTP 200. Ini memverifikasi kompilasi, bukan pengujian runtime native di perangkat.

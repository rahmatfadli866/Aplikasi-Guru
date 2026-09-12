# Sistem Manajemen Nilai Siswa - PRD

## Overview
Mobile app (React Native / Expo) untuk guru Indonesia mengelola nilai siswa Kelas 1–6. Single-user, tanpa login. Bahasa Indonesia, tema biru edukasi + aksen hijau.

## Fitur Utama
1. **Beranda**: Kartu profil guru (Nama, NIP, Mata Pelajaran), stats (Total Siswa, Kelas Aktif, Total Nilai), Aksi Cepat (Input Nilai, Lihat Rekap), pintasan Master Data.
2. **Master Data** (route `/master`): CRUD Siswa (nama + kelas 1–6) dan CRUD Kategori Nilai (default: Bab 1–10, Quiz, UTS, US).
3. **Input Nilai**: Dependent dropdown Kelas → Siswa → Kategori → nilai 0–100 dengan validasi + toast sukses. Upsert (satu nilai per pasangan siswa+kategori).
4. **Rekap**: Filter chip Kelas 1–6, tabel horizontal-scroll (Nama, kategori..., Jumlah, Rata²). Rata² > 75 hijau + ikon smile, ≤ 75 merah + ikon alert. Inline edit tap cell → modal.
5. **Export** (dari Rekap): PDF landscape (expo-print + expo-sharing), Excel .xlsx (xlsx + expo-file-system), Print/Share.
6. **Pengaturan**: Edit profil guru (Nama, NIP, Mata Pelajaran) + navigasi ke Master Data.

## Backend (FastAPI + MongoDB)
Base URL: `/api`
- `GET/PUT /teacher` – singleton profil guru
- `GET/POST/PUT/DELETE /students` (validasi kelas 1..6)
- `GET/POST/PUT/DELETE /categories`
- `GET /grades?kelas=` `POST /grades` (upsert by student+category, validasi 0–100), `PUT/DELETE /grades/{id}`
- `GET /stats` – total_students, kelas_aktif, total_grades, total_categories
- `POST /init` – idempotent seed (14 siswa sample, 13 kategori default, ~56 nilai contoh, profil guru default)

## Frontend Stack
- Expo Router (tabs group + `/master` stack), React Query, expo-image, expo-linear-gradient, expo-print, expo-sharing, expo-file-system, xlsx, @react-native-vector-icons/material-design-icons.
- Theme di `src/theme.ts` diisi dari `design_guidelines.json`.

## Testing
- Backend: 11/11 pytest passed (`/app/backend/tests/backend_test.py`).
- Frontend: semua alur utama verified by testing agent.

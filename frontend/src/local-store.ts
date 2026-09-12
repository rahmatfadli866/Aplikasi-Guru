// Local-first offline data store.
// All data lives on-device. No backend dependency.
// Collections are serialised as JSON strings via `@/src/utils/storage`.

import { storage } from "@/src/utils/storage";
import { cleanSubject, subjectKey } from "@/src/subject-utils";

const K = {
  teacher: "smns:teacher",
  students: "smns:students",
  categories: "smns:categories",
  grades: "smns:grades",
  attendance: "smns:attendance",
  schedules: "smns:schedules",
  initialized: "smns:initialized",
};

// Simple RFC4122-ish UUID for local IDs.
export function uid(): string {
  const rnd = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

async function readList<T>(key: string): Promise<T[]> {
  const raw = await storage.getItem(key, "");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw as string);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

async function writeList<T>(key: string, list: T[]): Promise<void> {
  const saved = await storage.setItem(key, JSON.stringify(list));
  if (!saved) throw new Error("Data gagal disimpan. Periksa ruang penyimpanan perangkat.");
}

// Serialise read-modify-write operations, including rapid attendance taps.
const pendingWrites = new Map<string, Promise<unknown>>();
function withWriteLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = pendingWrites.get(key) || Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  pendingWrites.set(key, next);
  const release = () => { if (pendingWrites.get(key) === next) pendingWrites.delete(key); };
  next.then(release, release);
  return next;
}

// ---- Types ----
export type Teacher = {
  id: string;
  nama: string;
  nip: string;
  mata_pelajaran: string;
  photo_path: string; // local file:// URI or data URL
  updated_at: string;
};
export type Student = { id: string; nama: string; kelas: number; created_at: string };
export type Category = { id: string; nama: string; urutan: number; is_default: boolean };
// Optional only for pre-existing records. Every newly created grade requires a subject.
export type Grade = { id: string; student_id: string; category_id: string; mata_pelajaran?: string; nilai: number; updated_at: string };
export type GradeInput = { student_id: string; category_id: string; mata_pelajaran: string; nilai: number };
export type GradeFilter = { student_id?: string; kelas?: number; mata_pelajaran?: string | null };
export type Attendance = {
  id: string;
  student_id: string;
  tanggal: string;
  status: "hadir" | "sakit" | "izin" | "alpa";
  updated_at: string;
};
// hari: 0=Minggu, 1=Senin, ... 6=Sabtu (selaras dengan Date.getDay())
// jam_mulai / jam_selesai: format "HH:MM" (24 jam)
export type Schedule = {
  id: string;
  hari: number;
  jam_mulai: string;
  jam_selesai: string;
  mata_pelajaran: string;
  kelas: string;
  created_at: string;
};
export type Stats = { total_students: number; kelas_aktif: number; total_grades: number; total_categories: number };
export type AttendanceSummary = Record<
  string,
  { hadir: number; sakit: number; izin: number; alpa: number; total: number }
>;

// ---- Initial seed ----
export async function ensureInitialized(): Promise<void> {
  const done = await storage.getItem(K.initialized, "");
  if (done) return;
  // Teacher
  const teacherRaw = await storage.getItem(K.teacher, "");
  if (!teacherRaw) {
    const t: Teacher = {
      id: uid(),
      nama: "",
      nip: "",
      mata_pelajaran: "",
      photo_path: "",
      updated_at: nowIso(),
    };
    await storage.setItem(K.teacher, JSON.stringify(t));
  }
  // Categories default
  const cats = await readList<Category>(K.categories);
  if (cats.length === 0) {
    const names = [...Array(10)].map((_, i) => `Bab ${i + 1}`).concat(["Quiz", "UTS", "US"]);
    const seeded: Category[] = names.map((n, i) => ({
      id: uid(),
      nama: n,
      urutan: i,
      is_default: true,
    }));
    await writeList(K.categories, seeded);
  }
  await storage.setItem(K.initialized, "1");
}

// ---- Teacher ----
export async function getTeacher(): Promise<Teacher> {
  const raw = await storage.getItem(K.teacher, "");
  if (!raw) {
    await ensureInitialized();
    const r2 = await storage.getItem(K.teacher, "");
    return JSON.parse(r2 as string);
  }
  return JSON.parse(raw as string);
}

export async function updateTeacher(data: { nama: string; nip: string; mata_pelajaran: string }): Promise<Teacher> {
  const t = await getTeacher();
  const next: Teacher = { ...t, ...data, updated_at: nowIso() };
  await storage.setItem(K.teacher, JSON.stringify(next));
  return next;
}

export async function setTeacherPhoto(photo_path: string): Promise<Teacher> {
  const t = await getTeacher();
  const next: Teacher = { ...t, photo_path, updated_at: nowIso() };
  await storage.setItem(K.teacher, JSON.stringify(next));
  return next;
}

// ---- Students ----
export async function listStudents(kelas?: number): Promise<Student[]> {
  const all = await readList<Student>(K.students);
  const filtered = kelas ? all.filter((s) => s.kelas === kelas) : all;
  return [...filtered].sort((a, b) => a.kelas - b.kelas || a.nama.localeCompare(b.nama));
}

export async function createStudent(data: { nama: string; kelas: number }): Promise<Student> {
  if (data.kelas < 1 || data.kelas > 6) throw new Error("Kelas harus 1..6");
  const all = await readList<Student>(K.students);
  const s: Student = { id: uid(), nama: data.nama, kelas: data.kelas, created_at: nowIso() };
  all.push(s);
  await writeList(K.students, all);
  return s;
}

export async function updateStudent(id: string, data: { nama: string; kelas: number }): Promise<Student> {
  if (data.kelas < 1 || data.kelas > 6) throw new Error("Kelas harus 1..6");
  const all = await readList<Student>(K.students);
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Siswa tidak ditemukan");
  all[idx] = { ...all[idx], nama: data.nama, kelas: data.kelas };
  await writeList(K.students, all);
  return all[idx];
}

export async function deleteStudent(id: string): Promise<void> {
  const [ss, gg, aa] = await Promise.all([
    readList<Student>(K.students),
    readList<Grade>(K.grades),
    readList<Attendance>(K.attendance),
  ]);
  await Promise.all([
    writeList(K.students, ss.filter((s) => s.id !== id)),
    writeList(K.grades, gg.filter((g) => g.student_id !== id)),
    writeList(K.attendance, aa.filter((a) => a.student_id !== id)),
  ]);
}

// ---- Categories ----
export async function listCategories(): Promise<Category[]> {
  const all = await readList<Category>(K.categories);
  return [...all].sort((a, b) => a.urutan - b.urutan);
}

export async function createCategory(data: { nama: string; urutan?: number }): Promise<Category> {
  const all = await readList<Category>(K.categories);
  const maxOrd = all.reduce((m, c) => Math.max(m, c.urutan), -1);
  const c: Category = {
    id: uid(),
    nama: data.nama,
    urutan: data.urutan ?? maxOrd + 1,
    is_default: false,
  };
  all.push(c);
  await writeList(K.categories, all);
  return c;
}

export async function updateCategory(id: string, data: { nama: string; urutan?: number }): Promise<Category> {
  const all = await readList<Category>(K.categories);
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Kategori tidak ditemukan");
  all[idx] = { ...all[idx], nama: data.nama, ...(data.urutan !== undefined ? { urutan: data.urutan } : {}) };
  await writeList(K.categories, all);
  return all[idx];
}

export async function deleteCategory(id: string): Promise<void> {
  const [cc, gg] = await Promise.all([readList<Category>(K.categories), readList<Grade>(K.grades)]);
  await Promise.all([
    writeList(K.categories, cc.filter((c) => c.id !== id)),
    writeList(K.grades, gg.filter((g) => g.category_id !== id)),
  ]);
}

// ---- Grades ----
export async function listGrades(params?: GradeFilter): Promise<Grade[]> {
  const all = await readList<Grade>(K.grades);
  if (!params) return all;
  let filtered = all;
  if (params.student_id) filtered = filtered.filter((g) => g.student_id === params.student_id);
  if (params.mata_pelajaran !== undefined) {
    filtered = filtered.filter((g) => subjectKey(g.mata_pelajaran) === subjectKey(params.mata_pelajaran));
  }
  if (params.kelas !== undefined) {
    const ss = await readList<Student>(K.students);
    const ids = new Set(ss.filter((s) => s.kelas === params.kelas).map((s) => s.id));
    filtered = filtered.filter((g) => ids.has(g.student_id));
  }
  return filtered;
}

export async function saveGrade(data: GradeInput): Promise<Grade> {
  if (!Number.isFinite(data.nilai) || data.nilai < 0 || data.nilai > 100) throw new Error("Nilai harus 0..100");
  const mata_pelajaran = cleanSubject(data.mata_pelajaran);
  if (!mata_pelajaran) throw new Error("Mata pelajaran wajib diisi");
  const [students, categories] = await Promise.all([listStudents(), listCategories()]);
  if (!students.some((s) => s.id === data.student_id)) throw new Error("Siswa tidak ditemukan");
  if (!categories.some((c) => c.id === data.category_id)) throw new Error("Jenis nilai tidak ditemukan");
  return withWriteLock(K.grades, async () => {
  const all = await readList<Grade>(K.grades);
  const idx = all.findIndex((g) => g.student_id === data.student_id && g.category_id === data.category_id
    && subjectKey(g.mata_pelajaran) === subjectKey(mata_pelajaran));
  if (idx >= 0) {
    all[idx] = { ...all[idx], nilai: data.nilai, updated_at: nowIso() };
  } else {
    all.push({ id: uid(), ...data, mata_pelajaran, updated_at: nowIso() });
  }
  await writeList(K.grades, all);
  return idx >= 0 ? all[idx] : all[all.length - 1];
  });
}

export async function updateGrade(id: string, nilai: number): Promise<Grade> {
  if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100) throw new Error("Nilai harus 0..100");
  return withWriteLock(K.grades, async () => {
  const all = await readList<Grade>(K.grades);
  const idx = all.findIndex((g) => g.id === id);
  if (idx < 0) throw new Error("Nilai tidak ditemukan");
  all[idx] = { ...all[idx], nilai, updated_at: nowIso() };
  await writeList(K.grades, all);
  return all[idx];
  });
}

export async function deleteGrade(id: string): Promise<void> {
  const all = await readList<Grade>(K.grades);
  await writeList(K.grades, all.filter((g) => g.id !== id));
}

// ---- Attendance ----
export async function listAttendance(params: {
  kelas?: number;
  tanggal?: string;
  student_id?: string;
}): Promise<Attendance[]> {
  const all = await readList<Attendance>(K.attendance);
  let filtered = all;
  if (params.student_id) filtered = filtered.filter((a) => a.student_id === params.student_id);
  if (params.tanggal) filtered = filtered.filter((a) => a.tanggal === params.tanggal);
  if (params.kelas !== undefined) {
    const ss = await readList<Student>(K.students);
    const ids = new Set(ss.filter((s) => s.kelas === params.kelas).map((s) => s.id));
    filtered = filtered.filter((a) => ids.has(a.student_id));
  }
  return filtered;
}

export async function saveAttendance(data: {
  student_id: string;
  tanggal: string;
  status: string;
}): Promise<Attendance> {
  const status = data.status.toLowerCase().trim() as Attendance["status"];
  if (!["hadir", "sakit", "izin", "alpa"].includes(status)) throw new Error("Status tidak valid");
  if (!data.tanggal || data.tanggal.length !== 10) throw new Error("Tanggal tidak valid");
  return withWriteLock(K.attendance, async () => {
  const all = await readList<Attendance>(K.attendance);
  const idx = all.findIndex((a) => a.student_id === data.student_id && a.tanggal === data.tanggal);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status, updated_at: nowIso() };
  } else {
    all.push({ id: uid(), student_id: data.student_id, tanggal: data.tanggal, status, updated_at: nowIso() });
  }
  await writeList(K.attendance, all);
  return idx >= 0 ? all[idx] : all[all.length - 1];
  });
}

export async function attendanceSummary(kelas?: number): Promise<AttendanceSummary> {
  const all = await readList<Attendance>(K.attendance);
  const ss = await readList<Student>(K.students);
  const idSet =
    kelas !== undefined ? new Set(ss.filter((s) => s.kelas === kelas).map((s) => s.id)) : null;
  const out: AttendanceSummary = {};
  for (const a of all) {
    if (idSet && !idSet.has(a.student_id)) continue;
    const row = out[a.student_id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
    row[a.status] = (row[a.status] || 0) + 1;
    row.total += 1;
    out[a.student_id] = row;
  }
  return out;
}

// ---- Stats ----
export async function getStats(): Promise<Stats> {
  const [ss, cs, gs] = await Promise.all([
    readList<Student>(K.students),
    readList<Category>(K.categories),
    readList<Grade>(K.grades),
  ]);
  const kelasSet = new Set(ss.map((s) => s.kelas));
  return {
    total_students: ss.length,
    kelas_aktif: kelasSet.size,
    total_grades: gs.length,
    total_categories: cs.length,
  };
}

// ---- Schedules (Jadwal Mengajar) ----
function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export async function listSchedules(hari?: number): Promise<Schedule[]> {
  const all = await readList<Schedule>(K.schedules);
  const filtered = hari === undefined ? all : all.filter((s) => s.hari === hari);
  return [...filtered].sort(
    (a, b) => a.hari - b.hari || timeToMin(a.jam_mulai) - timeToMin(b.jam_mulai),
  );
}

function validateSchedule(data: { hari: number; jam_mulai: string; jam_selesai: string; mata_pelajaran: string; kelas: string }) {
  if (data.hari < 0 || data.hari > 6) throw new Error("Hari tidak valid");
  if (!/^\d{2}:\d{2}$/.test(data.jam_mulai) || !/^\d{2}:\d{2}$/.test(data.jam_selesai))
    throw new Error("Format jam harus HH:MM");
  if (timeToMin(data.jam_selesai) <= timeToMin(data.jam_mulai))
    throw new Error("Jam selesai harus setelah jam mulai");
  if (!data.mata_pelajaran.trim()) throw new Error("Mata pelajaran wajib diisi");
  if (!data.kelas.trim()) throw new Error("Kelas wajib diisi");
}

export async function createSchedule(data: {
  hari: number; jam_mulai: string; jam_selesai: string; mata_pelajaran: string; kelas: string;
}): Promise<Schedule> {
  validateSchedule(data);
  const all = await readList<Schedule>(K.schedules);
  const s: Schedule = {
    id: uid(),
    hari: data.hari,
    jam_mulai: data.jam_mulai,
    jam_selesai: data.jam_selesai,
    mata_pelajaran: data.mata_pelajaran.trim(),
    kelas: data.kelas.trim(),
    created_at: nowIso(),
  };
  all.push(s);
  await writeList(K.schedules, all);
  return s;
}

export async function updateSchedule(id: string, data: {
  hari: number; jam_mulai: string; jam_selesai: string; mata_pelajaran: string; kelas: string;
}): Promise<Schedule> {
  validateSchedule(data);
  const all = await readList<Schedule>(K.schedules);
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Jadwal tidak ditemukan");
  all[idx] = {
    ...all[idx],
    hari: data.hari,
    jam_mulai: data.jam_mulai,
    jam_selesai: data.jam_selesai,
    mata_pelajaran: data.mata_pelajaran.trim(),
    kelas: data.kelas.trim(),
  };
  await writeList(K.schedules, all);
  return all[idx];
}

export async function deleteSchedule(id: string): Promise<void> {
  const all = await readList<Schedule>(K.schedules);
  await writeList(K.schedules, all.filter((s) => s.id !== id));
}

// ---- Reset (danger) ----
export async function resetStudentsData(): Promise<void> {
  await Promise.all([
    storage.removeItem(K.students),
    storage.removeItem(K.grades),
    storage.removeItem(K.attendance),
  ]);
}

export async function resetAll(): Promise<void> {
  await Promise.all([
    storage.removeItem(K.teacher),
    storage.removeItem(K.students),
    storage.removeItem(K.categories),
    storage.removeItem(K.grades),
    storage.removeItem(K.attendance),
    storage.removeItem(K.initialized),
  ]);
  await ensureInitialized();
}

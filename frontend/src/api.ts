const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${t || res.statusText}`);
  }
  if (res.status === 204) return undefined as any;
  return (await res.json()) as T;
}

export type Teacher = { id: string; nama: string; nip: string; mata_pelajaran: string; photo_path: string; updated_at: string };
export type Student = { id: string; nama: string; kelas: number; created_at: string };
export type Category = { id: string; nama: string; urutan: number; is_default: boolean };
export type Grade = { id: string; student_id: string; category_id: string; nilai: number; updated_at: string };
export type Attendance = { id: string; student_id: string; tanggal: string; status: "hadir" | "sakit" | "izin" | "alpa"; updated_at: string };
export type AttendanceSummary = Record<string, { hadir: number; sakit: number; izin: number; alpa: number; total: number }>;
export type Stats = { total_students: number; kelas_aktif: number; total_grades: number; total_categories: number };

export const api = {
  getTeacher: () => req<Teacher>("/teacher"),
  updateTeacher: (data: { nama: string; nip: string; mata_pelajaran: string }) =>
    req<Teacher>("/teacher", { method: "PUT", body: JSON.stringify(data) }),

  listStudents: (kelas?: number) => req<Student[]>(kelas ? `/students?kelas=${kelas}` : "/students"),
  createStudent: (data: { nama: string; kelas: number }) =>
    req<Student>("/students", { method: "POST", body: JSON.stringify(data) }),
  updateStudent: (id: string, data: { nama: string; kelas: number }) =>
    req<Student>(`/students/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteStudent: (id: string) => req<{ ok: true }>(`/students/${id}`, { method: "DELETE" }),

  listCategories: () => req<Category[]>("/categories"),
  createCategory: (data: { nama: string; urutan?: number }) =>
    req<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: string, data: { nama: string; urutan?: number }) =>
    req<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id: string) => req<{ ok: true }>(`/categories/${id}`, { method: "DELETE" }),

  listGrades: (params?: { student_id?: string; kelas?: number }) => {
    const q = new URLSearchParams();
    if (params?.student_id) q.append("student_id", params.student_id);
    if (params?.kelas !== undefined) q.append("kelas", String(params.kelas));
    const s = q.toString();
    return req<Grade[]>(`/grades${s ? `?${s}` : ""}`);
  },
  saveGrade: (data: { student_id: string; category_id: string; nilai: number }) =>
    req<Grade>("/grades", { method: "POST", body: JSON.stringify(data) }),
  updateGrade: (id: string, nilai: number) =>
    req<Grade>(`/grades/${id}`, { method: "PUT", body: JSON.stringify({ nilai }) }),
  deleteGrade: (id: string) => req<{ ok: true }>(`/grades/${id}`, { method: "DELETE" }),

  getStats: () => req<Stats>("/stats"),

  // Attendance
  listAttendance: (params: { kelas?: number; tanggal?: string; student_id?: string }) => {
    const q = new URLSearchParams();
    if (params.kelas !== undefined) q.append("kelas", String(params.kelas));
    if (params.tanggal) q.append("tanggal", params.tanggal);
    if (params.student_id) q.append("student_id", params.student_id);
    const s = q.toString();
    return req<Attendance[]>(`/attendance${s ? `?${s}` : ""}`);
  },
  saveAttendance: (data: { student_id: string; tanggal: string; status: string }) =>
    req<Attendance>("/attendance", { method: "POST", body: JSON.stringify(data) }),
  attendanceSummary: (kelas?: number) => {
    const s = kelas !== undefined ? `?kelas=${kelas}` : "";
    return req<AttendanceSummary>(`/attendance/summary${s}`);
  },

  // Teacher photo
  fileUrl: (path: string) => (path ? `${BASE}/api/files/${path}` : ""),
  removeTeacherPhoto: () => req<Teacher>("/teacher/photo", { method: "DELETE" }),
};

export const BACKEND_URL = BASE;

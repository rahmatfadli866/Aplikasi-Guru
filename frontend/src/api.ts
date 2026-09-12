// Compatibility layer: keeps the previous `api.*` surface but delegates
// to the local-first store. Fully offline, no network calls.

import * as local from "@/src/local-store";

export type {
  Teacher,
  Student,
  Category,
  Grade,
  Attendance,
  AttendanceSummary,
  Stats,
} from "@/src/local-store";

export const api = {
  ensureInitialized: local.ensureInitialized,

  getTeacher: () => local.getTeacher(),
  updateTeacher: (data: { nama: string; nip: string; mata_pelajaran: string }) => local.updateTeacher(data),
  setTeacherPhoto: (uri: string) => local.setTeacherPhoto(uri),
  removeTeacherPhoto: () => local.setTeacherPhoto(""),

  listStudents: (kelas?: number) => local.listStudents(kelas),
  createStudent: (data: { nama: string; kelas: number }) => local.createStudent(data),
  updateStudent: (id: string, data: { nama: string; kelas: number }) => local.updateStudent(id, data),
  deleteStudent: (id: string) => local.deleteStudent(id).then(() => ({ ok: true as const })),

  listCategories: () => local.listCategories(),
  createCategory: (data: { nama: string; urutan?: number }) => local.createCategory(data),
  updateCategory: (id: string, data: { nama: string; urutan?: number }) => local.updateCategory(id, data),
  deleteCategory: (id: string) => local.deleteCategory(id).then(() => ({ ok: true as const })),

  listGrades: (params?: { student_id?: string; kelas?: number }) => local.listGrades(params),
  saveGrade: (data: { student_id: string; category_id: string; nilai: number }) => local.saveGrade(data),
  updateGrade: (id: string, nilai: number) => local.updateGrade(id, nilai),
  deleteGrade: (id: string) => local.deleteGrade(id).then(() => ({ ok: true as const })),

  resetStudentsData: () => local.resetStudentsData(),

  listAttendance: (params: { kelas?: number; tanggal?: string; student_id?: string }) => local.listAttendance(params),
  saveAttendance: (data: { student_id: string; tanggal: string; status: string }) => local.saveAttendance(data),
  attendanceSummary: (kelas?: number) => local.attendanceSummary(kelas),

  getStats: () => local.getStats(),

  // Photo path is now a local file:// URI or data: URL — return it as-is for <Image />.
  fileUrl: (path: string) => path || "",
};

// Preserved for older imports; unused in the offline build.
export const BACKEND_URL = "";

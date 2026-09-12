import type { Schedule } from "@/src/local-store";

// 0=Minggu ... 6=Sabtu, sesuai Date.getDay()
export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatFullDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatClock(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// Student master data uses grades 1–6, not separate classroom sections.
export function scheduleClassNumber(label: string): number | null {
  const text = label.trim().replace(/^kelas\s*/i, "");
  const match = text.match(/^([1-6])(?:\s*[a-z])?$/i);
  if (match) return Number(match[1]);
  const romans = ["I", "II", "III", "IV", "V", "VI"];
  const index = romans.indexOf(text.toUpperCase());
  return index >= 0 ? index + 1 : null;
}

export type ScheduleState =
  | { kind: "ongoing"; schedule: Schedule }
  | { kind: "next"; schedule: Schedule }
  | { kind: "done" };

// Tentukan jadwal yang relevan untuk waktu `now`:
// - "ongoing": now berada di dalam rentang jam pelajaran
// - "next": pelajaran berikutnya yang belum dimulai hari ini
// - "done": tidak ada jadwal tersisa hari ini
export function resolveCurrentSchedule(schedules: Schedule[], now: Date): ScheduleState {
  const today = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const todays = schedules
    .filter((s) => s.hari === today)
    .sort((a, b) => timeToMinutes(a.jam_mulai) - timeToMinutes(b.jam_mulai));

  const ongoing = todays.find(
    (s) => nowMin >= timeToMinutes(s.jam_mulai) && nowMin < timeToMinutes(s.jam_selesai),
  );
  if (ongoing) return { kind: "ongoing", schedule: ongoing };

  const next = todays.find((s) => timeToMinutes(s.jam_mulai) > nowMin);
  if (next) return { kind: "next", schedule: next };

  return { kind: "done" };
}

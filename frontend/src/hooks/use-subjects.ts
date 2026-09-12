import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { uniqueSubjects } from "@/src/subject-utils";

export function useSubjects() {
  const schedules = useQuery({ queryKey: ["schedules"], queryFn: () => api.listSchedules() });
  const teacher = useQuery({ queryKey: ["teacher"], queryFn: api.getTeacher });
  const grades = useQuery({ queryKey: ["grades", "all"], queryFn: () => api.listGrades() });
  return {
    subjects: uniqueSubjects([
      ...(schedules.data || []).map((s) => s.mata_pelajaran),
      ...(grades.data || []).map((g) => g.mata_pelajaran),
      teacher.data?.mata_pelajaran,
    ]),
    grades: grades.data || [],
    isLoading: schedules.isLoading || teacher.isLoading || grades.isLoading,
  };
}
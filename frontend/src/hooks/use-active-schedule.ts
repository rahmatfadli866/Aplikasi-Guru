import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { api } from "@/src/api";
import { resolveCurrentSchedule, scheduleClassNumber } from "@/src/schedule-utils";

export function useActiveSchedule() {
  const query = useQuery({ queryKey: ["schedules"], queryFn: () => api.listSchedules() });
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => { setNow(new Date()); }, []));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  const state = resolveCurrentSchedule(query.data || [], now);
  const schedule = state.kind === "ongoing" ? state.schedule : null;
  return { schedule, kelas: schedule ? scheduleClassNumber(schedule.kelas) : null, now,
    isLoading: query.isLoading, isError: query.isError };
}
import type { DayStats } from "@/lib/stats";

/** A day with at least one entry of any type. */
export function isActiveDay(s: DayStats): boolean {
  return s.workoutCount > 0 || s.workoutMin > 0 || s.studyMin > 0 || s.sleepH > 0 || s.kcal > 0 || s.mood !== null;
}

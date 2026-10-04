import type { DayStats } from "@/lib/stats";
import type { Targets } from "@/lib/targets";
import { addDays, weekStartKey } from "@/lib/time";

export type CellState = "none" | "partial" | "met";
export type Metric = "workout" | "study" | "sleep" | "calories" | "mood";
export type WeekRow = {
  metric: Metric;
  cells: { day: string; state: CellState; future: boolean }[];
};

const reached = (value: number, target: number): CellState =>
  value >= target ? "met" : value > 0 ? "partial" : "none";

function stateFor(metric: Metric, s: DayStats, t: Targets): CellState {
  switch (metric) {
    case "workout":
      return s.workoutCount >= 1 ? "met" : "none";
    case "study":
      return reached(s.studyMin, t.studyMin);
    case "sleep":
      return reached(s.sleepH, t.sleepH);
    case "calories":
      // Integer comparison so 90% and 110% are exact: kcal/target in [0.9, 1.1].
      if (s.kcal <= 0) return "none";
      return s.kcal * 10 >= t.kcal * 9 && s.kcal * 10 <= t.kcal * 11 ? "met" : "partial";
    case "mood":
      return s.mood === null ? "none" : "met";
  }
}

const METRICS: Metric[] = ["workout", "study", "sleep", "calories", "mood"];

/** Monday-to-Sunday of the week containing `todayKey`; future days are always none. */
export function weekGrid(stats: DayStats[], targets: Targets, todayKey: string): WeekRow[] {
  const start = weekStartKey(todayKey);
  const byDay = new Map(stats.map((s) => [s.day, s]));
  return METRICS.map((metric) => ({
    metric,
    cells: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const future = day > todayKey;
      const s = byDay.get(day);
      return { day, future, state: future || !s ? "none" : stateFor(metric, s, targets) };
    }),
  }));
}

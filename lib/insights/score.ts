import { stateFor } from "@/lib/plan/weekGrid";
import type { DayStats } from "@/lib/stats";
import type { Targets } from "@/lib/targets";
import { addDays, rangeKeys } from "@/lib/time";
import { isActiveDay } from "./activeDay";

export type ScoreParts = { targets: number; workouts: number; todos: number; logging: number };

const WEIGHTS = { targets: 0.35, workouts: 0.25, todos: 0.25, logging: 0.15 } as const;

/** Rolling 7 days ending today. Each part is a 0 to 1 fraction; the score is the weighted blend as 0 to 100. */
export function disciplineScore(input: {
  stats: DayStats[];
  targets: Targets;
  todos: { dueDate: string | null; done: boolean }[];
  todayKey: string;
}): { score: number; parts: ScoreParts } {
  const { stats, targets, todos, todayKey } = input;
  const days = rangeKeys(todayKey, 7);
  const byDay = new Map(stats.map((s) => [s.day, s]));
  const rows = days.map((d) => byDay.get(d));

  let met = 0;
  for (const r of rows) {
    if (!r) continue;
    for (const metric of ["study", "sleep", "calories"] as const) {
      if (stateFor(metric, r, targets) === "met") met += 1;
    }
  }
  const workouts = rows.reduce((sum, r) => sum + (r?.workoutCount ?? 0), 0);
  const due = todos.filter((t) => t.dueDate !== null && t.dueDate >= days[0] && t.dueDate <= todayKey);
  const activeDays = rows.filter((r) => r && isActiveDay(r)).length;

  const parts: ScoreParts = {
    targets: met / 21,
    workouts: targets.workoutsPerWeek > 0 ? Math.min(workouts / targets.workoutsPerWeek, 1) : 0,
    todos: due.length === 0 ? 1 : due.filter((t) => t.done).length / due.length,
    logging: activeDays / 7,
  };
  const score = Math.round(
    100 *
      (WEIGHTS.targets * parts.targets +
        WEIGHTS.workouts * parts.workouts +
        WEIGHTS.todos * parts.todos +
        WEIGHTS.logging * parts.logging),
  );
  return { score, parts };
}

/** Consecutive active days back from today (or from yesterday if today has no entries yet). */
export function loggingStreak(stats: DayStats[], todayKey: string): number {
  const active = new Set(stats.filter(isActiveDay).map((s) => s.day));
  let cursor = active.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

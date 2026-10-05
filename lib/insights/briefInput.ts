import type { DayStats } from "@/lib/stats";
import { daysBetween } from "@/lib/time";
import type { ProblemFindings } from "./flaws";

const GOAL_HORIZON_DAYS = 7;

/** The active, unfinished goal whose deadline is nearest within the next 7 days (today included). */
export function nearestDueGoal(
  goals: { title: string; deadline: string | null; pct: number; status: "ACTIVE" | "DONE" | "PAUSED" }[],
  todayKey: string,
): { title: string; daysLeft: number; pct: number } | null {
  let best: { title: string; daysLeft: number; pct: number } | null = null;
  for (const g of goals) {
    if (g.status !== "ACTIVE" || g.deadline === null || g.pct >= 100) continue;
    const daysLeft = daysBetween(todayKey, g.deadline);
    if (daysLeft < 0 || daysLeft > GOAL_HORIZON_DAYS) continue;
    if (!best || daysLeft < best.daysLeft) best = { title: g.title, daysLeft, pct: g.pct };
  }
  return best;
}

/** Days since the last workout (0 = today), or null when none is in the data. */
export function daysSinceWorkout(stats: DayStats[], todayKey: string): number | null {
  const last = [...stats].reverse().find((s) => s.workoutCount > 0);
  return last ? daysBetween(last.day, todayKey) : null;
}

/** The single finding with the largest absolute change across all problems, or null. */
export function strongestFlaw(
  items: ProblemFindings[],
): { title: string; metric: "sleep" | "study" | "mood"; changePct: number } | null {
  let best: { title: string; metric: "sleep" | "study" | "mood"; changePct: number } | null = null;
  for (const item of items) {
    for (const f of item.findings) {
      if (!best || Math.abs(f.changePct) > Math.abs(best.changePct)) {
        best = { title: item.title, metric: f.metric, changePct: f.changePct };
      }
    }
  }
  return best;
}

/**
 * Last night's sleep hours. A sleep entry belongs to the day you wake up (Stage 1 rule), so it
 * is today's row; if nothing is logged for today yet it is unknown rather than yesterday's row.
 */
export function lastNightSleep(stats: DayStats[], todayKey: string): number | null {
  const today = stats.find((s) => s.day === todayKey);
  return today && today.sleepH > 0 ? today.sleepH : null;
}

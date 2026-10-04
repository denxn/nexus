import type { EntryLike } from "@/lib/stats";
import { dayKey } from "@/lib/time";

export type GoalLike = {
  kind: "MANUAL" | "MEASURED";
  progress: number | null;
  measuredType: "WORKOUT" | "STUDY" | "SLEEP" | "MEAL" | null;
  targetValue: number | null;
  startDate: string | null;
};

/** `value` is the measured sum (or the manual percent); `pct` is whole-number and uncapped. */
export function goalProgress(
  goal: GoalLike,
  entries: EntryLike[],
): { value: number; pct: number } {
  if (goal.kind === "MANUAL") {
    const p = goal.progress ?? 0;
    return { value: p, pct: p };
  }
  if (!goal.measuredType || !goal.startDate || !goal.targetValue || goal.targetValue <= 0) {
    return { value: 0, pct: 0 };
  }
  const { measuredType, startDate, targetValue } = goal;
  const value = entries
    .filter((e) => e.type === measuredType && dayKey(e.occurredAt) >= startDate)
    .reduce((sum, e) => sum + e.value, 0);
  return { value, pct: Math.round((value / targetValue) * 100) };
}

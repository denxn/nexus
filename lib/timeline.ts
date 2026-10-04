import type { DayStats } from "./stats";
import type { Targets } from "./targets";

export type TimelinePoint = {
  day: string;
  workout: number;
  study: number;
  sleep: number;
  calories: number;
  mood: number | null;
  raw: DayStats;
};

/** Minutes of workout per day that map to a full 10 on the timeline. */
const WORKOUT_REFERENCE_MIN = 60;

const scale = (value: number, reference: number) =>
  reference > 0 ? Math.min(value / reference, 1) * 10 : 0;

/** Normalizes each metric to 0..10 so they can share one chart. */
export function toTimelineSeries(
  stats: DayStats[],
  targets: Targets,
): TimelinePoint[] {
  return stats.map((s) => ({
    day: s.day,
    workout: scale(s.workoutMin, WORKOUT_REFERENCE_MIN),
    study: scale(s.studyMin, targets.studyMin),
    sleep: scale(s.sleepH, targets.sleepH),
    calories: scale(s.kcal, targets.kcal),
    mood: s.mood,
    raw: s,
  }));
}

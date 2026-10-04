import type { Targets } from "./targets";
import { addDays, dayKey, rangeKeys, weekStartKey } from "./time";

export type EntryLike = {
  type: "WORKOUT" | "STUDY" | "SLEEP" | "MEAL" | "MOOD";
  occurredAt: Date;
  value: number;
};

export type DayStats = {
  day: string;
  workoutMin: number;
  workoutCount: number;
  studyMin: number;
  sleepH: number;
  kcal: number;
  mood: number | null; // average of the day's mood entries
};

export type CardSummary = {
  value: number;
  target: number;
  pct: number; // whole number, uncapped
  week: number[]; // last 7 days
};

const pct = (value: number, target: number) =>
  target > 0 ? Math.round((value / target) * 100) : 0;

/** One zero-filled row per requested day key. */
export function aggregateDaily(
  entries: EntryLike[],
  days: string[],
): DayStats[] {
  const rows = new Map<string, DayStats & { moodSum: number; moodN: number }>(
    days.map((day) => [
      day,
      {
        day,
        workoutMin: 0,
        workoutCount: 0,
        studyMin: 0,
        sleepH: 0,
        kcal: 0,
        mood: null,
        moodSum: 0,
        moodN: 0,
      },
    ]),
  );
  for (const entry of entries) {
    const row = rows.get(dayKey(entry.occurredAt));
    if (!row) continue;
    switch (entry.type) {
      case "WORKOUT":
        row.workoutMin += entry.value;
        row.workoutCount += 1;
        break;
      case "STUDY":
        row.studyMin += entry.value;
        break;
      case "SLEEP":
        row.sleepH += entry.value;
        break;
      case "MEAL":
        row.kcal += entry.value;
        break;
      case "MOOD":
        row.moodSum += entry.value;
        row.moodN += 1;
        break;
    }
  }
  return days.map((day) => {
    const { moodSum, moodN, ...row } = rows.get(day)!;
    return { ...row, mood: moodN ? moodSum / moodN : null };
  });
}

/** Summaries for the four stat cards; the last row of `stats` is today. */
export function summarizeCards(stats: DayStats[], targets: Targets) {
  const today = stats[stats.length - 1];
  const last7 = stats.slice(-7);
  const weekStart = today ? weekStartKey(today.day) : "";
  const weekWorkouts = stats
    .filter((s) => s.day >= weekStart)
    .reduce((sum, s) => sum + s.workoutCount, 0);

  const card = (
    value: number,
    target: number,
    pick: (s: DayStats) => number,
  ): CardSummary => ({
    value,
    target,
    pct: pct(value, target),
    week: last7.map(pick),
  });

  return {
    workout: card(weekWorkouts, targets.workoutsPerWeek, (s) => s.workoutMin),
    study: card(today?.studyMin ?? 0, targets.studyMin, (s) => s.studyMin),
    sleep: card(today?.sleepH ?? 0, targets.sleepH, (s) => s.sleepH),
    calories: card(today?.kcal ?? 0, targets.kcal, (s) => s.kcal),
  };
}

/** Daily stats for the last `days` days ending today (Europe/Rome). */
export async function getDailyStats(days: number): Promise<DayStats[]> {
  const { prisma } = await import("./db");
  const keys = rangeKeys(dayKey(new Date()), days);
  // One extra day each side so DST offsets cannot drop entries; aggregateDaily filters by dayKey.
  const from = new Date(`${addDays(keys[0], -1)}T00:00:00Z`);
  const entries = await prisma.entry.findMany({
    where: { occurredAt: { gte: from } },
    select: { type: true, occurredAt: true, value: true },
  });
  return aggregateDaily(entries, keys);
}

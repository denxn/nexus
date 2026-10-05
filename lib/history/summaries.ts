import type { Targets } from "@/lib/targets";
import { dayKey, romeMinutesOfDay, weekStartKey } from "@/lib/time";
import { labelBreakdown } from "./labels";

export type Entry = {
  type: "WORKOUT" | "STUDY" | "SLEEP" | "MEAL" | "MOOD";
  occurredAt: Date;
  value: number;
  label: string | null;
};

const ofType = (entries: Entry[], type: Entry["type"]) => entries.filter((e) => e.type === type);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Sum of values per Rome day, as [day, total] pairs sorted by day ascending. */
function dailyTotals(entries: Entry[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const day = dayKey(e.occurredAt);
    totals.set(day, (totals.get(day) ?? 0) + e.value);
  }
  // Round away float noise (0.6 + 4.1 + 3.3 is 7.999999999999999) so "exactly the target" compares correctly.
  for (const [day, total] of totals) totals.set(day, Math.round(total * 1e6) / 1e6);
  return [...totals.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The day with the largest (or smallest) total; ties go to the earlier day. */
function extreme(days: [string, number][], pick: "max" | "min"): [string, number] | null {
  let best: [string, number] | null = null;
  for (const d of days) {
    if (!best || (pick === "max" ? d[1] > best[1] : d[1] < best[1])) best = d;
  }
  return best;
}

export function summarizeWorkouts(entries: Entry[], windowDays: number, targets: Targets, todayKey: string) {
  const sessions = ofType(entries, "WORKOUT");
  const totalMin = sessions.reduce((sum, e) => sum + e.value, 0);
  const weekStart = weekStartKey(todayKey);
  return {
    sessions: sessions.length,
    totalMin,
    avgMin: sessions.length ? totalMin / sessions.length : 0,
    longestMin: sessions.reduce((max, e) => Math.max(max, e.value), 0),
    perWeek: windowDays > 0 ? round1(sessions.length / (windowDays / 7)) : 0,
    weekCount: sessions.filter((e) => {
      const day = dayKey(e.occurredAt);
      return day >= weekStart && day <= todayKey;
    }).length,
    weekTarget: targets.workoutsPerWeek,
  };
}

export function summarizeStudy(entries: Entry[], targets: Targets) {
  const study = ofType(entries, "STUDY");
  const days = dailyTotals(study).filter(([, minutes]) => minutes > 0);
  const totalMin = days.reduce((sum, [, m]) => sum + m, 0);
  const best = extreme(days, "max");
  return {
    totalMin,
    studyDays: days.length,
    avgPerStudyDay: days.length ? totalMin / days.length : 0,
    best: best ? { day: best[0], minutes: best[1] } : null,
    daysMetTarget: days.filter(([, m]) => m >= targets.studyMin).length,
    subjects: labelBreakdown(study, 5),
  };
}

export function summarizeSleep(entries: Entry[], targets: Targets) {
  const sleep = ofType(entries, "SLEEP");
  const days = dailyTotals(sleep).filter(([, hours]) => hours > 0);
  const best = extreme(days, "max");
  const worst = extreme(days, "min");
  return {
    days: days.length,
    avgHours: days.length ? days.reduce((sum, [, h]) => sum + h, 0) / days.length : 0,
    best: best ? { day: best[0], hours: best[1] } : null,
    worst: worst ? { day: worst[0], hours: worst[1] } : null,
    daysMetTarget: days.filter(([, h]) => h >= targets.sleepH).length,
    debtHours: days.reduce((sum, [, h]) => sum + Math.max(0, targets.sleepH - h), 0),
    // A plain mean of clock times: fine for normal wake-ups, unsuitable for waking near midnight.
    avgWakeMinutes: sleep.length ? sleep.reduce((sum, e) => sum + romeMinutesOfDay(e.occurredAt), 0) / sleep.length : null,
  };
}

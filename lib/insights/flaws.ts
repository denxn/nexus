import type { DayStats } from "@/lib/stats";
import { addDays, dayKey, rangeKeys, weekStartKey } from "@/lib/time";
import { metricValue } from "./correlation";

export type ProblemInput = { id: string; title: string; occurrences: Date[] };
export type FlawMetric = "sleep" | "study" | "mood";
export type Finding = { metric: FlawMetric; changePct: number; n: number };
export type ProblemFindings = {
  problemId: string;
  title: string;
  occurrenceCount: number;
  findings: Finding[];
  weekly: number[]; // occurrence counts for the 4 Monday-start weeks ending with the current one
  direction: "up" | "down" | "flat";
};

const WINDOW_DAYS = 90;
const MIN_OCCURRENCES = 3;
const MIN_DAYS = 3;
const MIN_ABS_CHANGE = 15;
const METRICS: FlawMetric[] = ["sleep", "study", "mood"];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * For each problem with >= 3 occurrences in the last 90 days: how sleep, study and mood
 * on the days after an occurrence compare with all other days, plus a 4-week trend.
 * Today is never an after-day or an "other" day (it is incomplete).
 */
export function flawsAnalytics(stats: DayStats[], problems: ProblemInput[], todayKey: string): ProblemFindings[] {
  const windowKeys = rangeKeys(todayKey, WINDOW_DAYS);
  const windowStart = windowKeys[0];
  const byDay = new Map(stats.map((s) => [s.day, s]));
  const pastKeys = windowKeys.filter((d) => d < todayKey);

  const weekStart = weekStartKey(todayKey);
  const weekStarts = [-21, -14, -7, 0].map((n) => addDays(weekStart, n));

  const results: ProblemFindings[] = [];
  for (const p of problems) {
    const inWindow = p.occurrences.filter((o) => {
      const k = dayKey(o);
      return k >= windowStart && k <= todayKey;
    });
    if (inWindow.length < MIN_OCCURRENCES) continue;

    const afterDays = new Set(
      inWindow.map((o) => addDays(dayKey(o), 1)).filter((d) => d >= windowStart && d < todayKey),
    );

    const findings: Finding[] = [];
    for (const metric of METRICS) {
      const valueOn = (day: string) => {
        const s = byDay.get(day);
        return s ? metricValue(metric, s) : null;
      };
      const after = [...afterDays].map(valueOn).filter((v): v is number => v !== null);
      const other = pastKeys.filter((d) => !afterDays.has(d)).map(valueOn).filter((v): v is number => v !== null);
      if (after.length < MIN_DAYS || other.length < MIN_DAYS) continue;
      const otherMean = mean(other);
      if (otherMean <= 0) continue;
      const changePct = Math.round(((mean(after) - otherMean) / otherMean) * 100);
      if (Math.abs(changePct) >= MIN_ABS_CHANGE) findings.push({ metric, changePct, n: after.length });
    }

    const weekly = weekStarts.map(() => 0);
    for (const o of p.occurrences) {
      const idx = weekStarts.indexOf(weekStartKey(dayKey(o)));
      if (idx >= 0) weekly[idx] += 1;
    }
    const recent = weekly[2] + weekly[3];
    const before = weekly[0] + weekly[1];

    results.push({
      problemId: p.id,
      title: p.title,
      occurrenceCount: inWindow.length,
      findings,
      weekly,
      direction: recent < before ? "down" : recent > before ? "up" : "flat",
    });
  }
  return results;
}

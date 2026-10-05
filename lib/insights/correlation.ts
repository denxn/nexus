import type { DayStats } from "@/lib/stats";
import { addDays } from "@/lib/time";
import { isActiveDay } from "./activeDay";
import type { CorrMetric } from "./params";

export type Pair = { day: string; x: number; y: number };
export type Trend = { slope: number; intercept: number };

const WINDOW_DAYS = 90;
const MIN_PAIRS = 10;
const MIN_ABS_R = 0.3;
const EPSILON = 1e-12;

/**
 * Sleep, calories and mood only count when logged; study and workout count
 * (including 0) on any active day, so "no workout" days can be compared.
 */
export function metricValue(metric: CorrMetric, s: DayStats): number | null {
  switch (metric) {
    case "sleep":
      return s.sleepH > 0 ? s.sleepH : null;
    case "calories":
      return s.kcal > 0 ? s.kcal : null;
    case "mood":
      return s.mood;
    case "study":
      return isActiveDay(s) ? s.studyMin : null;
    case "workout":
      return isActiveDay(s) ? s.workoutMin : null;
  }
}

/** (x on day d, y on day d + lag) over the last 90 rows; both days must exist and have a value. */
export function correlationPairs(stats: DayStats[], x: CorrMetric, y: CorrMetric, lag: 0 | 1): Pair[] {
  const window = stats.slice(-WINDOW_DAYS);
  const byDay = new Map(window.map((s) => [s.day, s]));
  const out: Pair[] = [];
  for (const s of window) {
    const target = byDay.get(addDays(s.day, lag));
    if (!target) continue;
    const xv = metricValue(x, s);
    const yv = metricValue(y, target);
    if (xv !== null && yv !== null) out.push({ day: s.day, x: xv, y: yv });
  }
  return out;
}

function sums(pairs: Pair[]) {
  const n = pairs.length;
  const mx = pairs.reduce((a, p) => a + p.x, 0) / n;
  const my = pairs.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pairs) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  return { mx, my, sxx, syy, sxy };
}

/** Pearson r, or null with fewer than 2 pairs or no variance in either series. */
export function pearson(pairs: Pair[]): number | null {
  if (pairs.length < 2) return null;
  const { sxx, syy, sxy } = sums(pairs);
  if (sxx < EPSILON || syy < EPSILON) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Least-squares line, or null with fewer than 2 pairs or no variance in x. */
export function trendLine(pairs: Pair[]): Trend | null {
  if (pairs.length < 2) return null;
  const { mx, my, sxx, sxy } = sums(pairs);
  if (sxx < EPSILON) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

export function captionFor(x: CorrMetric, y: CorrMetric, lag: 0 | 1, n: number, r: number | null): string {
  if (n < MIN_PAIRS) return "Not enough data yet";
  if (r === null || Math.abs(r) < MIN_ABS_R) return "No clear link";
  const abs = Math.abs(r);
  const strength = abs < 0.5 ? "weak" : abs < 0.7 ? "moderate" : "strong";
  const direction = r > 0 ? "higher" : "lower";
  return `Higher ${x} goes with ${direction} ${y}${lag === 1 ? " the next day" : ""} (${strength}, r = ${r.toFixed(2)})`;
}

export function correlate(stats: DayStats[], x: CorrMetric, y: CorrMetric, lag: 0 | 1) {
  const pairs = correlationPairs(stats, x, y, lag);
  const r = pearson(pairs);
  return { pairs, n: pairs.length, r, trend: trendLine(pairs), caption: captionFor(x, y, lag, pairs.length, r) };
}

const PRESETS: [CorrMetric, CorrMetric][] = [
  ["sleep", "study"],
  ["sleep", "mood"],
  ["study", "mood"],
  ["workout", "mood"],
];

/** The preset same-day pair with the highest |r| that passes the caption rules, or null. */
export function strongestCorrelation(
  stats: DayStats[],
): { x: CorrMetric; y: CorrMetric; r: number; n: number; caption: string } | null {
  let best: { x: CorrMetric; y: CorrMetric; r: number; n: number; caption: string } | null = null;
  for (const [x, y] of PRESETS) {
    const c = correlate(stats, x, y, 0);
    if (c.r === null || c.n < MIN_PAIRS || Math.abs(c.r) < MIN_ABS_R) continue;
    if (!best || Math.abs(c.r) > Math.abs(best.r)) best = { x, y, r: c.r, n: c.n, caption: c.caption };
  }
  return best;
}

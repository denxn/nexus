export type PerfPeriod = "week" | "month" | "year";
export const PERF_PERIODS: readonly PerfPeriod[] = ["week", "month", "year"];

export type CorrMetric = "sleep" | "study" | "workout" | "calories" | "mood";
export const CORR_METRICS: readonly CorrMetric[] = ["sleep", "study", "workout", "calories", "mood"];

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

export function parsePerf(v: Param, fallback: PerfPeriod = "week"): PerfPeriod {
  const raw = first(v);
  return (PERF_PERIODS as readonly string[]).includes(raw ?? "") ? (raw as PerfPeriod) : fallback;
}

/** 1 means "next day"; anything else is the same day. */
export function parseLag(v: Param): 0 | 1 {
  return first(v) === "1" ? 1 : 0;
}

function parseMetric(v: Param, fallback: CorrMetric): CorrMetric {
  const raw = first(v);
  return (CORR_METRICS as readonly string[]).includes(raw ?? "") ? (raw as CorrMetric) : fallback;
}

export function parseCorrelationParams(p: { cx?: Param; cy?: Param; lag?: Param }): {
  x: CorrMetric;
  y: CorrMetric;
  lag: 0 | 1;
} {
  const x = parseMetric(p.cx, "sleep");
  let y = parseMetric(p.cy, "study");
  if (y === x) y = x === "study" ? "sleep" : "study";
  return { x, y, lag: parseLag(p.lag) };
}

/**
 * Days of stats to fetch. Streak, "has data" and "days since a workout" use the same window whatever
 * period is chosen (so they never change with ?perf); the year view needs two years to compare.
 */
export function insightSpan(period: PerfPeriod): number {
  return period === "year" ? 730 : 365;
}

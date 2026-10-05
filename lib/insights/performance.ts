import type { DayStats } from "@/lib/stats";
import type { Targets } from "@/lib/targets";
import type { PerfPeriod } from "./params";

export type PerfMetric = {
  key: "training" | "study" | "sleep" | "nutrition";
  current: number;
  previous: number;
  change: number | null; // whole-number percent, null when the previous period is 0
  spark: number[];
};

const DAYS: Record<PerfPeriod, number> = { week: 7, month: 30, year: 365 };
const YEAR_SPARK_DAYS = 364; // 52 whole weeks

const adherence = (kcal: number, target: number) =>
  target > 0 ? Math.max(0, 100 - Math.abs(kcal / target - 1) * 100) : 0;

type Def = {
  key: PerfMetric["key"];
  logged: (s: DayStats) => boolean; // does the day count toward a mean?
  value: (s: DayStats, t: Targets) => number;
  mode: "sum" | "mean";
};

const DEFS: Def[] = [
  { key: "training", logged: () => true, value: (s) => s.workoutMin, mode: "sum" },
  { key: "study", logged: () => true, value: (s) => s.studyMin, mode: "sum" },
  { key: "sleep", logged: (s) => s.sleepH > 0, value: (s) => s.sleepH, mode: "mean" },
  { key: "nutrition", logged: (s) => s.kcal > 0, value: (s, t) => adherence(s.kcal, t.kcal), mode: "mean" },
];

function aggregate(rows: DayStats[], def: Def, targets: Targets): number {
  const used = rows.filter(def.logged);
  if (used.length === 0) return 0;
  const total = used.reduce((sum, s) => sum + def.value(s, targets), 0);
  return def.mode === "sum" ? total : total / used.length;
}

/**
 * `stats` ends today. Current = last N days, previous = the N days before it.
 * Sparkline: daily values for week and month, 52 weekly buckets for year.
 */
export function performance(stats: DayStats[], targets: Targets, period: PerfPeriod): PerfMetric[] {
  const n = DAYS[period];
  const current = stats.slice(-n);
  const previous = stats.slice(Math.max(0, stats.length - 2 * n), Math.max(0, stats.length - n));

  return DEFS.map((def) => {
    const cur = aggregate(current, def, targets);
    const prev = aggregate(previous, def, targets);
    let spark: number[];
    if (period === "year") {
      const rows = current.slice(-YEAR_SPARK_DAYS);
      spark = [];
      for (let i = 0; i < rows.length; i += 7) spark.push(aggregate(rows.slice(i, i + 7), def, targets));
    } else {
      spark = current.map((s) => (def.logged(s) ? def.value(s, targets) : 0));
    }
    return {
      key: def.key,
      current: cur,
      previous: prev,
      change: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null,
      spark,
    };
  });
}

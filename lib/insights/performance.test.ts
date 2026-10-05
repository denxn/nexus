import { describe, expect, test } from "vitest";
import type { DayStats } from "@/lib/stats";
import { DEFAULT_TARGETS } from "@/lib/targets";
import { rangeKeys } from "@/lib/time";
import { performance } from "./performance";

const TODAY = "2026-10-07";
const row = (day: string, over: Partial<DayStats> = {}): DayStats => ({
  day,
  workoutMin: 0,
  workoutCount: 0,
  studyMin: 0,
  sleepH: 0,
  kcal: 0,
  mood: null,
  ...over,
});
/** n days ending today; make(i) where i = 0 is the oldest day. */
const days = (n: number, make: (i: number) => Partial<DayStats> = () => ({})): DayStats[] =>
  rangeKeys(TODAY, n).map((d, i) => row(d, make(i)));
const get = (stats: DayStats[], key: string, period: "week" | "month" | "year" = "week") =>
  performance(stats, DEFAULT_TARGETS, period).find((m) => m.key === key)!;

describe("performance", () => {
  test("returns the four metrics in order", () => {
    expect(performance([], DEFAULT_TARGETS, "week").map((m) => m.key)).toEqual(["training", "study", "sleep", "nutrition"]);
  });

  test("training sums workout minutes and compares to the previous period", () => {
    const stats = days(14, (i) => (i === 3 ? { workoutMin: 100 } : i === 10 ? { workoutMin: 120 } : {}));
    const m = get(stats, "training");
    expect(m).toMatchObject({ current: 120, previous: 100, change: 20 });
  });

  test("a previous period of zero gives a null change", () => {
    const stats = days(14, (i) => (i === 10 ? { workoutMin: 120 } : {}));
    expect(get(stats, "training")).toMatchObject({ current: 120, previous: 0, change: null });
  });

  test("a decrease is negative and the change is a whole number", () => {
    const stats = days(14, (i) => (i === 2 ? { studyMin: 120 } : i === 9 ? { studyMin: 60 } : {}));
    expect(get(stats, "study").change).toBe(-50);
    const up = days(14, (i) => (i === 2 ? { studyMin: 100 } : i === 9 ? { studyMin: 133 } : {}));
    expect(get(up, "study").change).toBe(33);
  });

  test("sleep averages only the logged days", () => {
    const stats = days(7, (i) => (i === 0 ? { sleepH: 7 } : i === 1 ? { sleepH: 8 } : {}));
    expect(get(stats, "sleep").current).toBeCloseTo(7.5, 10);
  });

  test("nutrition adherence: on target is 100, 90% is 90, double is 0, unlogged days are ignored", () => {
    const at = (kcal: number) => get(days(7, (i) => (i === 6 ? { kcal } : {})), "nutrition").current;
    expect(at(2800)).toBe(100);
    expect(at(2520)).toBeCloseTo(90, 10);
    expect(at(5600)).toBe(0);
    expect(at(9000)).toBe(0);
    const two = get(days(7, (i) => (i === 5 ? { kcal: 2800 } : i === 6 ? { kcal: 2520 } : {})), "nutrition").current;
    expect(two).toBeCloseTo(95, 10);
  });

  test("a zero calorie target gives 0 adherence, never NaN", () => {
    const stats = days(7, (i) => (i === 6 ? { kcal: 2000 } : {}));
    const m = performance(stats, { ...DEFAULT_TARGETS, kcal: 0 }, "week").find((x) => x.key === "nutrition")!;
    expect(m.current).toBe(0);
  });

  test("empty stats give zeros, null changes and finite numbers", () => {
    for (const period of ["week", "month", "year"] as const) {
      for (const m of performance([], DEFAULT_TARGETS, period)) {
        expect(m.current).toBe(0);
        expect(m.previous).toBe(0);
        expect(m.change).toBeNull();
        expect(m.spark.every(Number.isFinite)).toBe(true);
      }
    }
  });

  test("sparkline lengths: 7 for week, 30 for month, 52 weekly buckets for year", () => {
    const stats = days(730, () => ({ studyMin: 60 }));
    expect(get(stats, "study", "week").spark).toHaveLength(7);
    expect(get(stats, "study", "month").spark).toHaveLength(30);
    expect(get(stats, "study", "year").spark).toHaveLength(52);
  });

  test("year buckets sum weekly for study and the week values add up", () => {
    const stats = days(730, () => ({ studyMin: 10 }));
    const spark = get(stats, "study", "year").spark;
    expect(spark.every((v) => v === 70)).toBe(true);
  });

  test("stats shorter than twice the period still work", () => {
    const stats = days(10, () => ({ studyMin: 30 }));
    const m = get(stats, "study");
    expect(m.current).toBe(210);
    expect(m.previous).toBe(90);
    expect(m.change).toBe(133);
  });
});

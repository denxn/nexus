import { describe, expect, test } from "vitest";
import type { DayStats } from "@/lib/stats";
import { addDays } from "@/lib/time";
import { isActiveDay } from "./activeDay";
import {
  captionFor,
  correlate,
  correlationPairs,
  metricValue,
  pearson,
  strongestCorrelation,
  trendLine,
  type Pair,
} from "./correlation";

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
const pairs = (xs: number[], ys: number[]): Pair[] => xs.map((x, i) => ({ day: `d${i}`, x, y: ys[i] }));
const START = "2026-08-01";
const series = (n: number, make: (i: number) => Partial<DayStats>): DayStats[] =>
  Array.from({ length: n }, (_, i) => row(addDays(START, i), make(i)));

describe("pearson", () => {
  test("perfect positive and negative relations", () => {
    expect(pearson(pairs([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]))).toBeCloseTo(1, 10);
    expect(pearson(pairs([1, 2, 3, 4, 5], [-1, -2, -3, -4, -5]))).toBeCloseTo(-1, 10);
  });

  test("the textbook example", () => {
    expect(pearson(pairs([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]))).toBeCloseTo(0.7746, 4);
  });

  test("zero variance in either series gives null, never NaN", () => {
    expect(pearson(pairs([3, 3, 3, 3], [1, 2, 3, 4]))).toBeNull();
    expect(pearson(pairs([1, 2, 3, 4], [7, 7, 7, 7]))).toBeNull();
    expect(pearson(pairs([0.1, 0.1, 0.1], [1, 2, 3]))).toBeNull();
  });

  test("fewer than 2 pairs gives null", () => {
    expect(pearson([])).toBeNull();
    expect(pearson(pairs([1], [2]))).toBeNull();
  });
});

describe("trendLine", () => {
  test("recovers slope and intercept", () => {
    const t = trendLine(pairs([0, 1, 2, 3], [1, 3, 5, 7]))!;
    expect(t.slope).toBeCloseTo(2, 10);
    expect(t.intercept).toBeCloseTo(1, 10);
  });

  test("null when x has no variance or there are fewer than 2 pairs", () => {
    expect(trendLine(pairs([2, 2, 2], [1, 2, 3]))).toBeNull();
    expect(trendLine(pairs([1], [1]))).toBeNull();
  });
});

describe("activity and metric values", () => {
  test("an empty row is inactive; any entry makes a day active", () => {
    expect(isActiveDay(row("2026-08-01"))).toBe(false);
    expect(isActiveDay(row("2026-08-01", { kcal: 500 }))).toBe(true);
    expect(isActiveDay(row("2026-08-01", { mood: 5 }))).toBe(true);
    expect(isActiveDay(row("2026-08-01", { workoutCount: 1, workoutMin: 30 }))).toBe(true);
  });

  test("sleep, calories and mood need to be logged", () => {
    expect(metricValue("sleep", row("d", { kcal: 500 }))).toBeNull();
    expect(metricValue("sleep", row("d", { sleepH: 7 }))).toBe(7);
    expect(metricValue("calories", row("d", { sleepH: 7 }))).toBeNull();
    expect(metricValue("mood", row("d", { sleepH: 7 }))).toBeNull();
    expect(metricValue("mood", row("d", { mood: 6 }))).toBe(6);
  });

  test("study and workout count 0 on an active day but are null on an inactive day", () => {
    expect(metricValue("study", row("d"))).toBeNull();
    expect(metricValue("study", row("d", { kcal: 500 }))).toBe(0);
    expect(metricValue("workout", row("d", { mood: 5 }))).toBe(0);
    expect(metricValue("workout", row("d", { workoutMin: 40, workoutCount: 1 }))).toBe(40);
  });
});

describe("correlationPairs", () => {
  test("same day pairs both values", () => {
    const s = [row("2026-08-01", { sleepH: 7, studyMin: 100 }), row("2026-08-02", { sleepH: 6, studyMin: 50 })];
    expect(correlationPairs(s, "sleep", "study", 0).map((p) => [p.x, p.y])).toEqual([[7, 100], [6, 50]]);
  });

  test("lag 1 pairs a day's x with the next day's y", () => {
    const s = [row("2026-08-01", { sleepH: 7, studyMin: 100 }), row("2026-08-02", { sleepH: 6, studyMin: 50 })];
    expect(correlationPairs(s, "sleep", "study", 1).map((p) => [p.day, p.x, p.y])).toEqual([["2026-08-01", 7, 50]]);
  });

  test("lag 1 never pairs across a missing day", () => {
    const s = [row("2026-08-03", { sleepH: 7, studyMin: 100 }), row("2026-08-05", { sleepH: 6, studyMin: 50 })];
    expect(correlationPairs(s, "sleep", "study", 1)).toEqual([]);
  });

  test("a day missing either value makes no pair", () => {
    const s = [row("2026-08-01", { sleepH: 7 }), row("2026-08-02", { studyMin: 60 })];
    expect(correlationPairs(s, "sleep", "mood", 0)).toEqual([]);
  });

  test("only the last 90 rows are used", () => {
    const s = series(100, () => ({ sleepH: 7, studyMin: 60 }));
    expect(correlationPairs(s, "sleep", "study", 0)).toHaveLength(90);
    expect(correlationPairs(s, "sleep", "study", 0)[0].day).toBe(addDays(START, 10));
  });
});

describe("captionFor", () => {
  test("too few pairs", () => {
    expect(captionFor("sleep", "study", 0, 9, 0.9)).toBe("Not enough data yet");
    expect(captionFor("sleep", "study", 0, 0, null)).toBe("Not enough data yet");
  });

  test("ten pairs but a weak or missing r is no clear link", () => {
    expect(captionFor("sleep", "study", 0, 10, 0.29)).toBe("No clear link");
    expect(captionFor("sleep", "study", 0, 10, -0.2)).toBe("No clear link");
    expect(captionFor("sleep", "study", 0, 10, null)).toBe("No clear link");
  });

  test("direction, strength word and r", () => {
    const moderate = captionFor("sleep", "study", 0, 20, 0.62);
    expect(moderate).toContain("Higher sleep goes with higher study");
    expect(moderate).toContain("moderate");
    expect(moderate).toContain("0.62");
    const strong = captionFor("workout", "mood", 0, 20, -0.75);
    expect(strong).toContain("Higher workout goes with lower mood");
    expect(strong).toContain("strong");
    expect(strong).toContain("-0.75");
    expect(captionFor("sleep", "study", 0, 20, 0.3)).toContain("weak");
    expect(captionFor("sleep", "study", 0, 20, 0.5)).toContain("moderate");
    expect(captionFor("sleep", "study", 0, 20, 0.7)).toContain("strong");
  });

  test("the strength word follows the printed (rounded) r", () => {
    const at = (r: number) => captionFor("sleep", "study", 0, 20, r);
    expect(at(0.4996)).toContain("moderate");
    expect(at(0.4996)).toContain("0.50");
    expect(at(0.6996)).toContain("strong");
    expect(at(0.6996)).toContain("0.70");
    expect(at(0.4949)).toContain("weak");
    expect(at(0.4949)).toContain("0.49");
    expect(at(-0.4996)).toContain("moderate");
  });

  test("a printed r of 0.30 is a link, 0.29 is not", () => {
    expect(captionFor("sleep", "study", 0, 20, 0.2996)).toContain("weak");
    expect(captionFor("sleep", "study", 0, 20, 0.2949)).toBe("No clear link");
  });

  test("lag 1 says the next day", () => {
    expect(captionFor("sleep", "study", 1, 20, 0.6)).toContain("the next day");
  });
});

describe("correlate and strongestCorrelation", () => {
  test("correlate bundles pairs, r, trend and caption", () => {
    const s = series(12, (i) => ({ sleepH: 5 + i * 0.5, studyMin: 60 + i * 20 }));
    const c = correlate(s, "sleep", "study", 0);
    expect(c.n).toBe(12);
    expect(c.r).toBeCloseTo(1, 10);
    expect(c.trend).not.toBeNull();
    expect(c.caption).toContain("Higher sleep goes with higher study");
  });

  test("no trend line when r is null (constant y), even though x varies", () => {
    const s = series(12, (i) => ({ sleepH: 5 + i * 0.5, mood: 7 }));
    const c = correlate(s, "sleep", "mood", 0);
    expect(c.n).toBe(12);
    expect(c.r).toBeNull();
    expect(c.trend).toBeNull();
  });

  test("with no data the result is empty and safe", () => {
    const c = correlate([], "sleep", "study", 0);
    expect(c).toMatchObject({ n: 0, r: null, trend: null, caption: "Not enough data yet" });
  });

  test("strongestCorrelation picks the preset pair with the highest |r|", () => {
    // mood tracks sleep exactly; study alternates (weak vs sleep and mood); workout is constant.
    const s = series(12, (i) => ({ sleepH: 5 + i * 0.5, mood: 1 + i * 0.8, studyMin: 60 + (i % 2) * 100, workoutMin: 30, workoutCount: 1 }));
    const best = strongestCorrelation(s)!;
    expect([best.x, best.y]).toEqual(["sleep", "mood"]);
    expect(best.n).toBe(12);
    expect(best.r).toBeCloseTo(1, 10);
  });

  test("strongestCorrelation is null when nothing qualifies", () => {
    expect(strongestCorrelation(series(5, (i) => ({ sleepH: 5 + i, mood: 3 + i })))).toBeNull();
    expect(strongestCorrelation([])).toBeNull();
  });
});

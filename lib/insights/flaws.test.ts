import { describe, expect, test } from "vitest";
import type { DayStats } from "@/lib/stats";
import { addDays, rangeKeys } from "@/lib/time";
import { flawsAnalytics, type ProblemInput } from "./flaws";

const TODAY = "2026-10-07"; // Wednesday; current week starts Mon 2026-10-05
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
/** 30 days ending today; every day has `base` study minutes, `overrides[day]` replaces it. */
const stats30 = (base: number, overrides: Record<string, Partial<DayStats>> = {}) =>
  rangeKeys(TODAY, 30).map((d) => row(d, { studyMin: base, ...(overrides[d] ?? {}) }));
const at = (day: string, hour = 10) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
const problem = (days: string[], title = "Scrolling"): ProblemInput => ({
  id: "p1",
  title,
  occurrences: days.map((d) => at(d)),
});
const OCC = ["2026-09-15", "2026-09-20", "2026-09-25"];
const afterOverrides = (value: number) =>
  Object.fromEntries(OCC.map((d) => [addDays(d, 1), { studyMin: value }]));

describe("inclusion", () => {
  test("a problem needs at least 3 occurrences in the last 90 days", () => {
    expect(flawsAnalytics(stats30(100), [problem(OCC.slice(0, 2))], TODAY)).toEqual([]);
    expect(flawsAnalytics(stats30(100), [problem(OCC)], TODAY)).toHaveLength(1);
  });

  test("occurrences older than the 90-day window are ignored", () => {
    const old = "2026-06-01";
    expect(flawsAnalytics(stats30(100), [problem([old, "2026-09-20", "2026-09-25"])], TODAY)).toEqual([]);
  });

  test("the result carries id, title and the occurrence count", () => {
    const [p] = flawsAnalytics(stats30(100), [problem([...OCC, "2026-10-01"], "Late nights")], TODAY);
    expect(p).toMatchObject({ problemId: "p1", title: "Late nights", occurrenceCount: 4 });
  });
});

describe("findings", () => {
  test("a clear study drop the day after is reported", () => {
    const [p] = flawsAnalytics(stats30(100, afterOverrides(50)), [problem(OCC)], TODAY);
    // other days average slightly above 50 because only 3 days are low; assert the shape and sign
    const f = p.findings.find((x) => x.metric === "study")!;
    expect(f.n).toBe(3);
    expect(f.changePct).toBeLessThanOrEqual(-40);
  });

  test("exact -50%: after-days at 50 against other days at 100", () => {
    const overrides = { ...afterOverrides(50) };
    // make every non-after day exactly 100 (the base) so other-mean is 100
    const [p] = flawsAnalytics(stats30(100, overrides), [problem(OCC)], TODAY);
    const f = p.findings.find((x) => x.metric === "study")!;
    // other days: 30 rows - 3 after-days - today (excluded) = 26 days at 100
    expect(f.changePct).toBe(-50);
  });

  test("15% is reported and 14% is not", () => {
    const at15 = flawsAnalytics(stats30(100, afterOverrides(85)), [problem(OCC)], TODAY)[0];
    const at14 = flawsAnalytics(stats30(100, afterOverrides(86)), [problem(OCC)], TODAY)[0];
    expect(at15.findings.map((f) => f.metric)).toContain("study");
    expect(at14.findings.map((f) => f.metric)).not.toContain("study");
  });

  test("the 15% threshold applies to the unrounded difference (14.6% is not reported), the display stays rounded", () => {
    const below = flawsAnalytics(stats30(100, afterOverrides(85.4)), [problem(OCC)], TODAY)[0];
    expect(below.findings.map((f) => f.metric)).not.toContain("study");
    const above = flawsAnalytics(stats30(100, afterOverrides(84.6)), [problem(OCC)], TODAY)[0];
    expect(above.findings.find((f) => f.metric === "study")!.changePct).toBe(-15);
  });

  test("an increase is reported with a positive change", () => {
    const [p] = flawsAnalytics(stats30(100, afterOverrides(150)), [problem(OCC)], TODAY);
    expect(p.findings.find((f) => f.metric === "study")!.changePct).toBe(50);
  });

  test("fewer than 3 after-days gives no finding", () => {
    const [p] = flawsAnalytics(
      stats30(100, afterOverrides(10)),
      [problem(["2026-09-15", "2026-09-15", "2026-09-20"])], // 3 occurrences, only 2 distinct days
      TODAY,
    );
    expect(p.findings).toEqual([]);
  });

  test("a metric with no logged values on the after-days is skipped", () => {
    const stats = stats30(100).map((s) => (OCC.map((d) => addDays(d, 1)).includes(s.day) ? s : { ...s, mood: 7 }));
    const [p] = flawsAnalytics(stats, [problem(OCC)], TODAY);
    expect(p.findings.map((f) => f.metric)).not.toContain("mood");
  });

  test("a day after an occurrence that is today is not an after-day", () => {
    const yesterday = addDays(TODAY, -1);
    const [p] = flawsAnalytics(stats30(100, { [TODAY]: { studyMin: 0 } }), [problem([yesterday, yesterday, yesterday])], TODAY);
    expect(p.findings).toEqual([]);
  });

  test("sleep and mood findings use their own values", () => {
    const afterDays = OCC.map((d) => addDays(d, 1));
    const stats = rangeKeys(TODAY, 30).map((d) => row(d, { studyMin: 100, sleepH: afterDays.includes(d) ? 5 : 8, mood: afterDays.includes(d) ? 4 : 8 }));
    const [p] = flawsAnalytics(stats, [problem(OCC)], TODAY);
    const sleep = p.findings.find((f) => f.metric === "sleep")!;
    const mood = p.findings.find((f) => f.metric === "mood")!;
    expect(sleep.changePct).toBeLessThan(0);
    expect(mood.changePct).toBeLessThan(0);
  });
});

describe("weekly trend", () => {
  test("four Monday-start week buckets ending with the current week", () => {
    // weeks start 09-14, 09-21, 09-28, 10-05
    const days = ["2026-09-15", "2026-09-22", "2026-09-23", "2026-10-06"];
    const [p] = flawsAnalytics(stats30(100), [problem(days)], TODAY);
    expect(p.weekly).toEqual([1, 2, 0, 1]);
  });

  test("an occurrence at 23:30 Rome on Sunday belongs to that week", () => {
    const sundayLate = new Date("2026-10-04T21:30:00Z"); // 23:30 Rome, week of 09-28
    const input: ProblemInput = { id: "p", title: "x", occurrences: [sundayLate, at("2026-09-15"), at("2026-09-16")] };
    const [p] = flawsAnalytics(stats30(100), [input], TODAY);
    expect(p.weekly).toEqual([2, 0, 1, 0]);
  });

  test("direction: up, down, flat", () => {
    const up = flawsAnalytics(stats30(100), [problem(["2026-09-16", "2026-09-30", "2026-10-01", "2026-10-06"])], TODAY)[0];
    const down = flawsAnalytics(stats30(100), [problem(["2026-09-15", "2026-09-16", "2026-09-22", "2026-10-06"])], TODAY)[0];
    const flat = flawsAnalytics(stats30(100), [problem(["2026-09-15", "2026-09-22", "2026-09-30", "2026-10-06"])], TODAY)[0];
    expect(up.direction).toBe("up");
    expect(down.direction).toBe("down");
    expect(flat.direction).toBe("flat");
  });
});

import { describe, expect, test } from "vitest";
import type { DayStats } from "./stats";
import { DEFAULT_TARGETS } from "./targets";
import { toTimelineSeries } from "./timeline";

const day = (over: Partial<DayStats> = {}): DayStats => ({
  day: "2026-10-04",
  workoutMin: 0,
  workoutCount: 0,
  studyMin: 0,
  sleepH: 0,
  kcal: 0,
  mood: null,
  ...over,
});

describe("toTimelineSeries", () => {
  test("study at half the daily target normalizes to 5", () => {
    const [p] = toTimelineSeries([day({ studyMin: 120 })], DEFAULT_TARGETS);
    expect(p.study).toBe(5);
  });

  test("values over target cap at 10", () => {
    const [p] = toTimelineSeries([day({ studyMin: 600 })], DEFAULT_TARGETS);
    expect(p.study).toBe(10);
  });

  test("workout uses 60 minutes as its daily reference", () => {
    const [p] = toTimelineSeries([day({ workoutMin: 30 })], DEFAULT_TARGETS);
    expect(p.workout).toBe(5);
  });

  test("sleep and calories scale against their targets", () => {
    const [p] = toTimelineSeries(
      [day({ sleepH: 4, kcal: 1400 })],
      DEFAULT_TARGETS,
    );
    expect(p.sleep).toBe(5);
    expect(p.calories).toBe(5);
  });

  test("an empty day is 0 for totals and null for mood", () => {
    const [p] = toTimelineSeries([day()], DEFAULT_TARGETS);
    expect([p.workout, p.study, p.sleep, p.calories]).toEqual([0, 0, 0, 0]);
    expect(p.mood).toBeNull();
  });

  test("mood passes through unchanged", () => {
    const [p] = toTimelineSeries([day({ mood: 8 })], DEFAULT_TARGETS);
    expect(p.mood).toBe(8);
  });

  test("raw carries the original day stats for the tooltip", () => {
    const stats = day({ studyMin: 150 });
    const [p] = toTimelineSeries([stats], DEFAULT_TARGETS);
    expect(p.raw).toBe(stats);
    expect(p.day).toBe("2026-10-04");
  });
});

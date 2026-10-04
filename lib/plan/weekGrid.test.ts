import { describe, expect, test } from "vitest";
import type { DayStats } from "@/lib/stats";
import { DEFAULT_TARGETS } from "@/lib/targets";
import { weekGrid, type WeekRow } from "./weekGrid";

const day = (d: string, over: Partial<DayStats> = {}): DayStats => ({
  day: d,
  workoutMin: 0,
  workoutCount: 0,
  studyMin: 0,
  sleepH: 0,
  kcal: 0,
  mood: null,
  ...over,
});
const row = (rows: WeekRow[], metric: WeekRow["metric"]) => rows.find((r) => r.metric === metric)!;
const stateOn = (over: Partial<DayStats>, metric: WeekRow["metric"]) =>
  row(weekGrid([day("2026-09-30", over)], DEFAULT_TARGETS, "2026-10-04"), metric).cells[2].state;

describe("weekGrid", () => {
  test("five rows in order, seven Monday-to-Sunday cells each", () => {
    const rows = weekGrid([], DEFAULT_TARGETS, "2026-10-04");
    expect(rows.map((r) => r.metric)).toEqual(["workout", "study", "sleep", "calories", "mood"]);
    expect(rows[0].cells.map((c) => c.day)).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
  });

  test("workout: one workout is met, none is none", () => {
    expect(stateOn({ workoutCount: 1, workoutMin: 40 }, "workout")).toBe("met");
    expect(stateOn({}, "workout")).toBe("none");
  });

  test("study: 239 partial, 240 met, 0 none", () => {
    expect(stateOn({ studyMin: 239 }, "study")).toBe("partial");
    expect(stateOn({ studyMin: 240 }, "study")).toBe("met");
    expect(stateOn({ studyMin: 0 }, "study")).toBe("none");
  });

  test("sleep: 7 h partial, 8 h met", () => {
    expect(stateOn({ sleepH: 7 }, "sleep")).toBe("partial");
    expect(stateOn({ sleepH: 8 }, "sleep")).toBe("met");
  });

  test("calories: met from 90% to 110% inclusive, partial outside, none at 0", () => {
    expect(stateOn({ kcal: 2519 }, "calories")).toBe("partial");
    expect(stateOn({ kcal: 2520 }, "calories")).toBe("met");
    expect(stateOn({ kcal: 3080 }, "calories")).toBe("met");
    expect(stateOn({ kcal: 3081 }, "calories")).toBe("partial");
    expect(stateOn({ kcal: 0 }, "calories")).toBe("none");
  });

  test("mood: logged is met, null is none", () => {
    expect(stateOn({ mood: 3 }, "mood")).toBe("met");
    expect(stateOn({ mood: null }, "mood")).toBe("none");
  });

  test("future days are none and flagged future even if stats exist", () => {
    const rows = weekGrid([day("2026-10-02", { studyMin: 300 })], DEFAULT_TARGETS, "2026-09-30");
    const fri = row(rows, "study").cells[4];
    expect(fri).toEqual({ day: "2026-10-02", state: "none", future: true });
    expect(row(rows, "study").cells[2].future).toBe(false);
  });

  test("a day missing from stats is none", () => {
    expect(row(weekGrid([], DEFAULT_TARGETS, "2026-10-04"), "sleep").cells[0].state).toBe("none");
  });
});

import { describe, expect, test } from "vitest";
import type { DayStats } from "@/lib/stats";
import { daysSinceWorkout, nearestDueGoal, strongestFlaw } from "./briefInput";
import type { ProblemFindings } from "./flaws";

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
const TODAY = "2026-10-07";

describe("nearestDueGoal", () => {
  const g = (id: string, deadline: string | null, pct: number, status: "ACTIVE" | "DONE" | "PAUSED" = "ACTIVE") => ({
    id,
    title: id,
    deadline,
    pct,
    status,
  });

  test("picks the active goal with the nearest deadline within 7 days and under 100%", () => {
    const r = nearestDueGoal([g("later", "2026-10-12", 10), g("soon", "2026-10-09", 40), g("far", "2026-10-30", 0)], TODAY);
    expect(r).toEqual({ title: "soon", daysLeft: 2, pct: 40 });
  });

  test("today counts as 0 days left; 7 days is included and 8 is not", () => {
    expect(nearestDueGoal([g("a", TODAY, 5)], TODAY)?.daysLeft).toBe(0);
    expect(nearestDueGoal([g("a", "2026-10-14", 5)], TODAY)?.daysLeft).toBe(7);
    expect(nearestDueGoal([g("a", "2026-10-15", 5)], TODAY)).toBeNull();
  });

  test("ignores overdue, undated, finished (100%+), done and paused goals", () => {
    const r = nearestDueGoal(
      [g("past", "2026-10-01", 5), g("none", null, 5), g("full", "2026-10-09", 100), g("over", "2026-10-09", 120), g("done", "2026-10-09", 5, "DONE"), g("paused", "2026-10-09", 5, "PAUSED")],
      TODAY,
    );
    expect(r).toBeNull();
  });
});

describe("daysSinceWorkout", () => {
  test("0 when today has a workout, counts back otherwise", () => {
    expect(daysSinceWorkout([row("2026-10-07", { workoutCount: 1 })], TODAY)).toBe(0);
    expect(daysSinceWorkout([row("2026-10-04", { workoutCount: 1 }), row("2026-10-07")], TODAY)).toBe(3);
  });

  test("null when there is no workout in the data", () => {
    expect(daysSinceWorkout([row("2026-10-06"), row("2026-10-07")], TODAY)).toBeNull();
    expect(daysSinceWorkout([], TODAY)).toBeNull();
  });
});

describe("strongestFlaw", () => {
  const item = (title: string, findings: { metric: "sleep" | "study" | "mood"; changePct: number }[]): ProblemFindings => ({
    problemId: title,
    title,
    occurrenceCount: 3,
    findings: findings.map((f) => ({ ...f, n: 3 })),
    weekly: [0, 0, 0, 0],
    direction: "flat",
  });

  test("the finding with the largest absolute change wins", () => {
    const r = strongestFlaw([item("A", [{ metric: "study", changePct: -20 }]), item("B", [{ metric: "mood", changePct: 40 }, { metric: "sleep", changePct: -25 }])]);
    expect(r).toEqual({ title: "B", metric: "mood", changePct: 40 });
  });

  test("null when there are no findings", () => {
    expect(strongestFlaw([])).toBeNull();
    expect(strongestFlaw([item("A", [])])).toBeNull();
  });
});

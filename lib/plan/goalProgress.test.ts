import { describe, expect, test } from "vitest";
import type { EntryLike } from "@/lib/stats";
import { goalProgress, type GoalLike } from "./goalProgress";

const measured = (over: Partial<GoalLike> = {}): GoalLike => ({
  kind: "MEASURED",
  progress: null,
  measuredType: "STUDY",
  targetValue: 12000,
  startDate: "2026-10-01",
  ...over,
});
const study = (iso: string, value: number): EntryLike => ({
  type: "STUDY",
  occurredAt: new Date(iso),
  value,
});

describe("goalProgress", () => {
  test("a manual goal reports its own percent", () => {
    const g: GoalLike = { kind: "MANUAL", progress: 40, measuredType: null, targetValue: null, startDate: null };
    expect(goalProgress(g, [])).toEqual({ value: 40, pct: 40 });
  });

  test("a measured goal sums matching entries and rounds the percent", () => {
    const r = goalProgress(measured(), [
      study("2026-10-02T09:00:00Z", 600),
      study("2026-10-03T09:00:00Z", 300),
    ]);
    expect(r).toEqual({ value: 900, pct: 8 });
  });

  test("no entries gives 0 percent", () => {
    expect(goalProgress(measured(), [])).toEqual({ value: 0, pct: 0 });
  });

  test("over target is uncapped", () => {
    expect(goalProgress(measured(), [study("2026-10-02T09:00:00Z", 15000)]).pct).toBe(125);
  });

  test("entries before startDate are ignored", () => {
    expect(goalProgress(measured(), [study("2026-09-30T09:00:00Z", 600)]).value).toBe(0);
  });

  test("the Rome day decides: 23:30 Rome on the start day counts, 23:30 the day before does not", () => {
    const on = goalProgress(measured(), [study("2026-10-01T21:30:00Z", 100)]);
    const before = goalProgress(measured(), [study("2026-09-30T21:30:00Z", 100)]);
    expect(on.value).toBe(100);
    expect(before.value).toBe(0);
  });

  test("entries of another type are ignored", () => {
    const meal: EntryLike = { type: "MEAL", occurredAt: new Date("2026-10-02T12:00:00Z"), value: 800 };
    expect(goalProgress(measured(), [meal]).value).toBe(0);
  });

  test("a zero target gives 0 percent, never NaN or Infinity", () => {
    const r = goalProgress(measured({ targetValue: 0 }), [study("2026-10-02T09:00:00Z", 100)]);
    expect(r.pct).toBe(0);
  });

  test("a measured goal missing its settings gives 0", () => {
    expect(goalProgress(measured({ startDate: null }), [study("2026-10-02T09:00:00Z", 100)]).pct).toBe(0);
  });
});

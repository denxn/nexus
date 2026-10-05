import { describe, expect, test } from "vitest";
import type { DayStats } from "@/lib/stats";
import { DEFAULT_TARGETS } from "@/lib/targets";
import { rangeKeys } from "@/lib/time";
import { disciplineScore, loggingStreak } from "./score";

const TODAY = "2026-10-07"; // a Wednesday
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
const week = (make: (i: number) => Partial<DayStats>): DayStats[] =>
  rangeKeys(TODAY, 7).map((d, i) => row(d, make(i)));
const input = (stats: DayStats[], todos: { dueDate: string | null; done: boolean }[] = []) => ({
  stats,
  targets: DEFAULT_TARGETS,
  todos,
  todayKey: TODAY,
});

describe("disciplineScore", () => {
  test("no data and no todos: only the neutral todo component counts", () => {
    const r = disciplineScore(input([]));
    expect(r.score).toBe(25);
    expect(r.parts).toEqual({ targets: 0, workouts: 0, todos: 1, logging: 0 });
  });

  test("everything met for 7 days scores 100", () => {
    const stats = week((i) => ({ studyMin: 240, sleepH: 8, kcal: 2800, workoutCount: i < 4 ? 1 : 0, workoutMin: i < 4 ? 40 : 0 }));
    const r = disciplineScore(input(stats, [{ dueDate: TODAY, done: true }]));
    expect(r.score).toBe(100);
    expect(r.parts).toEqual({ targets: 1, workouts: 1, todos: 1, logging: 1 });
  });

  test("targets part counts only met slots (14 of 21) and the score rounds", () => {
    const stats = week(() => ({ studyMin: 240, sleepH: 8 }));
    const r = disciplineScore(input(stats));
    expect(r.parts.targets).toBeCloseTo(14 / 21, 10);
    expect(r.parts.logging).toBe(1);
    expect(r.score).toBe(63); // 23.33 + 0 + 25 + 15
  });

  test("a partial day (study 239) does not count as met", () => {
    const stats = [row(TODAY, { studyMin: 239 })];
    expect(disciplineScore(input(stats)).parts.targets).toBe(0);
  });

  test("workouts part caps at 1", () => {
    const stats = week(() => ({ workoutCount: 1, workoutMin: 30 })); // 7 workouts vs target 4
    expect(disciplineScore(input(stats)).parts.workouts).toBe(1);
  });

  test("workouts part is a fraction below target", () => {
    const stats = [row(TODAY, { workoutCount: 1, workoutMin: 30 })];
    expect(disciplineScore(input(stats)).parts.workouts).toBeCloseTo(0.25, 10);
  });

  test("todos part is done/due inside the window; outside and undated todos are ignored", () => {
    const todos = [
      { dueDate: "2026-10-07", done: true },
      { dueDate: "2026-10-05", done: true },
      { dueDate: "2026-10-04", done: false },
      { dueDate: "2026-10-01", done: false }, // 6 days back: inside (window is 10-01..10-07)
      { dueDate: "2026-09-30", done: false }, // outside
      { dueDate: "2026-10-08", done: false }, // future, outside
      { dueDate: null, done: false },
    ];
    expect(disciplineScore(input([], todos)).parts.todos).toBeCloseTo(2 / 4, 10);
  });

  test("logging part is active days over 7", () => {
    const stats = [row("2026-10-05", { mood: 5 }), row("2026-10-06", { kcal: 900 }), row("2026-10-07")];
    expect(disciplineScore(input(stats)).parts.logging).toBeCloseTo(2 / 7, 10);
  });

  test("a zero workout target gives a 0 part, never NaN", () => {
    const r = disciplineScore({ ...input([row(TODAY, { workoutCount: 1 })]), targets: { ...DEFAULT_TARGETS, workoutsPerWeek: 0 } });
    expect(r.parts.workouts).toBe(0);
    expect(Number.isFinite(r.score)).toBe(true);
  });
});

describe("loggingStreak", () => {
  const active = (day: string) => row(day, { mood: 5 });

  test("counts consecutive active days ending today", () => {
    expect(loggingStreak([active("2026-10-05"), active("2026-10-06"), active("2026-10-07")], TODAY)).toBe(3);
  });

  test("an empty today does not reset the streak: it counts from yesterday", () => {
    expect(loggingStreak([active("2026-10-04"), active("2026-10-05"), active("2026-10-06"), row("2026-10-07")], TODAY)).toBe(3);
  });

  test("an inactive yesterday with an active today gives 1", () => {
    expect(loggingStreak([active("2026-10-05"), row("2026-10-06"), active("2026-10-07")], TODAY)).toBe(1);
  });

  test("no entries gives 0", () => {
    expect(loggingStreak([], TODAY)).toBe(0);
    expect(loggingStreak([row("2026-10-06"), row("2026-10-07")], TODAY)).toBe(0);
  });

  test("a gap (missing row) breaks the streak", () => {
    expect(loggingStreak([active("2026-10-03"), active("2026-10-05"), active("2026-10-06"), active("2026-10-07")], TODAY)).toBe(3);
  });

  test("today and yesterday both empty gives 0 even with older activity", () => {
    expect(loggingStreak([active("2026-10-04"), active("2026-10-05")], TODAY)).toBe(0);
  });
});

import { describe, expect, test } from "vitest";
import { buildBrief, type BriefInput } from "./brief";

const base: BriefInput = {
  greeting: "Good evening",
  score: 72,
  streak: 0,
  hasData: true,
  correlation: null,
  flaw: null,
  overdueTodos: 0,
  goal: null,
  lastNightSleepH: null,
  sleepTarget: 8,
  daysSinceWorkout: null,
};
const brief = (over: Partial<BriefInput> = {}) => buildBrief({ ...base, ...over });

describe("buildBrief", () => {
  test("no data gives the first-entries message", () => {
    const b = brief({ hasData: false, score: 25 });
    expect(b.lines).toEqual(["Log your first entries and I will start finding patterns."]);
    expect(b.headline).not.toContain("Discipline score");
  });

  test("the headline has the greeting and the score; the streak only from 2 days", () => {
    expect(brief().headline).toContain("Good evening");
    expect(brief().headline).toContain("Discipline score 72/100");
    expect(brief({ streak: 1 }).headline).not.toContain("streak");
    expect(brief({ streak: 0 }).headline).not.toContain("streak");
    expect(brief({ streak: 5 }).headline).toContain("5-day streak");
    expect(brief({ streak: 2 }).headline).toContain("2-day streak");
  });

  test("nothing applicable gives no lines", () => {
    expect(brief().lines).toEqual([]);
  });

  test("the correlation line is the caption", () => {
    const b = brief({ correlation: { caption: "Higher sleep goes with higher study (moderate, r = 0.62)" } });
    expect(b.lines).toEqual(["Higher sleep goes with higher study (moderate, r = 0.62)"]);
  });

  test("the flaw line uses the title, the absolute percent and lower/higher", () => {
    const lower = brief({ flaw: { title: "Scrolling", metric: "study", changePct: -35 } }).lines[0];
    expect(lower).toBe('After "Scrolling", your study is 35% lower than usual.');
    const higher = brief({ flaw: { title: "Coffee", metric: "mood", changePct: 20 } }).lines[0];
    expect(higher).toBe('After "Coffee", your mood is 20% higher than usual.');
  });

  test("overdue wording is singular and plural", () => {
    expect(brief({ overdueTodos: 1 }).lines).toEqual(["1 to-do is overdue"]);
    expect(brief({ overdueTodos: 2 }).lines).toEqual(["2 to-dos are overdue"]);
    expect(brief({ overdueTodos: 0 }).lines).toEqual([]);
  });

  test("the goal line says days, a single day, or today", () => {
    expect(brief({ goal: { title: "Study 10h", daysLeft: 3, pct: 45 } }).lines).toEqual(["Study 10h is due in 3 days at 45%"]);
    expect(brief({ goal: { title: "Study 10h", daysLeft: 1, pct: 45 } }).lines).toEqual(["Study 10h is due in 1 day at 45%"]);
    expect(brief({ goal: { title: "Study 10h", daysLeft: 0, pct: 45 } }).lines).toEqual(["Study 10h is due today at 45%"]);
  });

  test("the sleep suggestion appears when last night's sleep is under target", () => {
    expect(brief({ lastNightSleepH: 6, daysSinceWorkout: 5 }).lines).toEqual(["Aim for an earlier night tonight"]);
    expect(brief({ lastNightSleepH: 8 }).lines).toEqual([]);
  });

  test("the workout suggestion appears after 3 days without one, but only when sleep does not trigger", () => {
    expect(brief({ lastNightSleepH: 8, daysSinceWorkout: 3 }).lines).toEqual(["A workout today would keep your week on track"]);
    expect(brief({ lastNightSleepH: 8, daysSinceWorkout: 2 }).lines).toEqual([]);
    expect(brief({ daysSinceWorkout: 10 }).lines).toEqual(["A workout today would keep your week on track"]);
  });

  test("lines follow the priority order", () => {
    const b = brief({
      correlation: { caption: "C" },
      flaw: { title: "F", metric: "study", changePct: -20 },
      overdueTodos: 2,
    });
    expect(b.lines).toEqual(["C", 'After "F", your study is 20% lower than usual.', "2 to-dos are overdue"]);
  });

  test("never more than 4 lines: the suggestion is dropped first", () => {
    const b = brief({
      correlation: { caption: "C" },
      flaw: { title: "F", metric: "study", changePct: -20 },
      overdueTodos: 2,
      goal: { title: "G", daysLeft: 2, pct: 10 },
      lastNightSleepH: 5,
    });
    expect(b.lines).toHaveLength(4);
    expect(b.lines[3]).toBe("G is due in 2 days at 10%");
  });
});

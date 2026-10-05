import { describe, expect, test } from "vitest";
import { eventSchema, goalSchema, occurrenceSchema, problemSchema, todoSchema } from "./schemas";

const fieldErrors = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => String(i.path[0]));

describe("goalSchema", () => {
  test("a valid manual goal passes", () => {
    const r = goalSchema.safeParse({ kind: "MANUAL", title: "Build bigger arms", progress: "72" });
    expect(r.success && r.data).toMatchObject({ kind: "MANUAL", title: "Build bigger arms", progress: 72, measuredType: null, targetValue: null, startDate: null });
  });

  test("manual progress above 100 fails", () => {
    expect(fieldErrors(goalSchema.safeParse({ kind: "MANUAL", title: "x", progress: 101 }))).toContain("progress");
  });

  test("a manual goal without progress fails", () => {
    expect(fieldErrors(goalSchema.safeParse({ kind: "MANUAL", title: "x" }))).toContain("progress");
  });

  test("a measured STUDY goal converts hours to minutes", () => {
    const r = goalSchema.safeParse({ kind: "MEASURED", title: "Study 10h", measuredType: "STUDY", target: "10", startDate: "2026-10-01" });
    expect(r.success && r.data).toMatchObject({ measuredType: "STUDY", targetValue: 600, startDate: "2026-10-01", progress: null });
  });

  test("a measured SLEEP goal keeps hours and MEAL keeps kcal", () => {
    const sleep = goalSchema.safeParse({ kind: "MEASURED", title: "s", measuredType: "SLEEP", target: "56", startDate: "2026-10-01" });
    const meal = goalSchema.safeParse({ kind: "MEASURED", title: "m", measuredType: "MEAL", target: "20000", startDate: "2026-10-01" });
    expect(sleep.success && sleep.data.targetValue).toBe(56);
    expect(meal.success && meal.data.targetValue).toBe(20000);
  });

  test("a decimal comma works in the target", () => {
    const r = goalSchema.safeParse({ kind: "MEASURED", title: "s", measuredType: "STUDY", target: "7,5", startDate: "2026-10-01" });
    expect(r.success && r.data.targetValue).toBe(450);
  });

  test("measured goals reject MOOD, a missing start date, a bad date and a non-positive target", () => {
    const base = { kind: "MEASURED", title: "x", measuredType: "STUDY", target: 5, startDate: "2026-10-01" };
    expect(fieldErrors(goalSchema.safeParse({ ...base, measuredType: "MOOD" }))).toContain("measuredType");
    expect(fieldErrors(goalSchema.safeParse({ ...base, startDate: "" }))).toContain("startDate");
    expect(fieldErrors(goalSchema.safeParse({ ...base, startDate: "2026-02-30" }))).toContain("startDate");
    expect(fieldErrors(goalSchema.safeParse({ ...base, target: 0 }))).toContain("target");
  });

  test("title is required and at most 80 characters; deadline must be a real date", () => {
    expect(fieldErrors(goalSchema.safeParse({ kind: "MANUAL", title: "  ", progress: 1 }))).toContain("title");
    expect(fieldErrors(goalSchema.safeParse({ kind: "MANUAL", title: "x".repeat(81), progress: 1 }))).toContain("title");
    expect(fieldErrors(goalSchema.safeParse({ kind: "MANUAL", title: "x", progress: 1, deadline: "2026-13-01" }))).toContain("deadline");
  });
});

describe("problemSchema", () => {
  test("severity must be 1 to 5", () => {
    expect(problemSchema.safeParse({ title: "Late scrolling", severity: "3" }).success).toBe(true);
    expect(problemSchema.safeParse({ title: "x", severity: 0 }).success).toBe(false);
    expect(problemSchema.safeParse({ title: "x", severity: 6 }).success).toBe(false);
    expect(problemSchema.safeParse({ title: "x", severity: 2.5 }).success).toBe(false);
  });

  test("optional fields are bounded and blank becomes undefined", () => {
    const r = problemSchema.safeParse({ title: "x", severity: 1, trigger: "", counterPlan: "" });
    expect(r.success && r.data.trigger).toBeUndefined();
    expect(problemSchema.safeParse({ title: "x", severity: 1, trigger: "t".repeat(121) }).success).toBe(false);
    expect(problemSchema.safeParse({ title: "x", severity: 1, counterPlan: "c".repeat(161) }).success).toBe(false);
  });

  test("status is one of the three values", () => {
    expect(problemSchema.safeParse({ title: "x", severity: 1, status: "SOLVED" }).success).toBe(true);
    expect(problemSchema.safeParse({ title: "x", severity: 1, status: "NOPE" }).success).toBe(false);
  });
});

describe("occurrenceSchema", () => {
  test("note is optional and bounded; occurredAt is read as Rome time", () => {
    const r = occurrenceSchema.safeParse({ note: "", occurredAt: "2026-10-04T23:30" });
    expect(r.success && r.data.occurredAt?.toISOString()).toBe("2026-10-04T21:30:00.000Z");
    expect(r.success && r.data.note).toBeUndefined();
    expect(occurrenceSchema.safeParse({ note: "n".repeat(161) }).success).toBe(false);
  });
});

describe("todoSchema", () => {
  test("title over 120 characters fails", () => {
    expect(todoSchema.safeParse({ title: "t".repeat(121) }).success).toBe(false);
  });

  test("blank dueDate and links become undefined; priority defaults to MEDIUM", () => {
    const r = todoSchema.safeParse({ title: "Call bank", dueDate: "", goalId: "", problemId: "" });
    expect(r.success && r.data).toMatchObject({ dueDate: undefined, goalId: undefined, problemId: undefined, priority: "MEDIUM" });
  });

  test("a real dueDate passes and an impossible one fails", () => {
    expect(todoSchema.safeParse({ title: "x", dueDate: "2026-10-05" }).success).toBe(true);
    expect(todoSchema.safeParse({ title: "x", dueDate: "2026-02-30" }).success).toBe(false);
  });
});

describe("eventSchema", () => {
  test("outputs Rome-time instants (summer, UTC+2)", () => {
    const r = eventSchema.safeParse({ title: "Study group", date: "2026-10-05", startTime: "09:00", endTime: "10:30" });
    expect(r.success && r.data.startsAt.toISOString()).toBe("2026-10-05T07:00:00.000Z");
    expect(r.success && r.data.endsAt?.toISOString()).toBe("2026-10-05T08:30:00.000Z");
  });

  test("end time is optional", () => {
    const r = eventSchema.safeParse({ title: "Dentist", date: "2026-10-05", startTime: "09:00", endTime: "" });
    expect(r.success && r.data.endsAt).toBeUndefined();
  });

  test("an end time equal to or before the start fails on endTime", () => {
    expect(fieldErrors(eventSchema.safeParse({ title: "x", date: "2026-10-05", startTime: "09:00", endTime: "09:00" }))).toContain("endTime");
    expect(fieldErrors(eventSchema.safeParse({ title: "x", date: "2026-10-05", startTime: "09:00", endTime: "08:00" }))).toContain("endTime");
  });

  test("an impossible date or time fails", () => {
    expect(fieldErrors(eventSchema.safeParse({ title: "x", date: "2026-02-30", startTime: "09:00" }))).toContain("date");
    expect(fieldErrors(eventSchema.safeParse({ title: "x", date: "2026-10-05", startTime: "25:00" }))).toContain("startTime");
    expect(fieldErrors(eventSchema.safeParse({ title: "x", date: "2026-10-05", startTime: "" }))).toContain("startTime");
  });

  test("title is required and at most 80 characters", () => {
    expect(eventSchema.safeParse({ title: "", date: "2026-10-05", startTime: "09:00" }).success).toBe(false);
    expect(eventSchema.safeParse({ title: "x".repeat(81), date: "2026-10-05", startTime: "09:00" }).success).toBe(false);
  });
});

describe("stage 4a: event instants across the DST gap", () => {
  test("02:30 to 03:15 on the spring-forward day is rejected (02:30 does not exist, so the end would precede the start)", () => {
    const r = eventSchema.safeParse({ title: "x", date: "2026-03-29", startTime: "02:30", endTime: "03:15" });
    expect(fieldErrors(r)).toContain("endTime");
  });

  test("a normal 09:00 to 10:00 event still passes", () => {
    expect(eventSchema.safeParse({ title: "x", date: "2026-10-05", startTime: "09:00", endTime: "10:00" }).success).toBe(true);
  });

  test("an end equal to the start is still rejected", () => {
    expect(fieldErrors(eventSchema.safeParse({ title: "x", date: "2026-10-05", startTime: "09:00", endTime: "09:00" }))).toContain("endTime");
  });
});

describe("stage 4a: goal targets that round to zero minutes", () => {
  const measured = (measuredType: string, target: string) => ({ kind: "MEASURED", title: "x", measuredType, target, startDate: "2026-10-01" });

  test("STUDY and WORKOUT targets under half a minute are rejected on target", () => {
    expect(fieldErrors(goalSchema.safeParse(measured("STUDY", "0.005")))).toContain("target");
    expect(fieldErrors(goalSchema.safeParse(measured("WORKOUT", "0.005")))).toContain("target");
  });

  test("0.02 hours (1.2 minutes, stored as 1) passes", () => {
    const r = goalSchema.safeParse(measured("STUDY", "0.02"));
    expect(r.success && r.data.targetValue).toBe(1);
  });

  test("SLEEP and MEAL targets are not affected by the minute rule", () => {
    expect(goalSchema.safeParse(measured("SLEEP", "0.005")).success).toBe(true);
    expect(goalSchema.safeParse(measured("MEAL", "0.5")).success).toBe(true);
  });
});

describe("stage 4d: event recurrence and reminders", () => {
  const base = { title: "Lecture", date: "2026-10-07", startTime: "09:00" };
  const ok = (over: Record<string, unknown>) => eventSchema.safeParse({ ...base, ...over });

  test("defaults: no repeat, interval 1, no weekdays, no until, no reminder", () => {
    const r = ok({});
    expect(r.success && r.data).toMatchObject({ repeat: "NONE", repeatInterval: 1, repeatWeekdays: [], repeatUntil: undefined, remindMinutes: undefined });
  });

  test("a weekly rule with weekdays from a comma list (sorted, de-duplicated)", () => {
    const r = ok({ repeat: "WEEKLY", repeatInterval: "2", repeatWeekdays: "4,0,2,0", repeatUntil: "2026-12-20" });
    expect(r.success && r.data).toMatchObject({ repeat: "WEEKLY", repeatInterval: 2, repeatWeekdays: [0, 2, 4], repeatUntil: "2026-12-20" });
  });

  test("interval must be 1 to 99", () => {
    for (const bad of ["0", "100", "-1", "1.5", "x"]) expect(fieldErrors(ok({ repeat: "DAILY", repeatInterval: bad }))).toContain("repeatInterval");
    expect(ok({ repeat: "DAILY", repeatInterval: "99" }).success).toBe(true);
  });

  test("weekday 7 or junk is rejected", () => {
    expect(fieldErrors(ok({ repeat: "WEEKLY", repeatWeekdays: "7" }))).toContain("repeatWeekdays");
    expect(fieldErrors(ok({ repeat: "WEEKLY", repeatWeekdays: "a,b" }))).toContain("repeatWeekdays");
  });

  test("until before the first day is rejected; the same day is allowed", () => {
    expect(fieldErrors(ok({ repeat: "DAILY", repeatUntil: "2026-10-06" }))).toContain("repeatUntil");
    expect(ok({ repeat: "DAILY", repeatUntil: "2026-10-07" }).success).toBe(true);
    expect(fieldErrors(ok({ repeat: "DAILY", repeatUntil: "2026-02-30" }))).toContain("repeatUntil");
  });

  test("with no repeat the other repeat fields are cleared", () => {
    const r = ok({ repeat: "NONE", repeatInterval: "5", repeatWeekdays: "1,2", repeatUntil: "2026-12-01" });
    expect(r.success && r.data).toMatchObject({ repeat: "NONE", repeatInterval: 1, repeatWeekdays: [], repeatUntil: undefined });
  });

  test("weekdays only apply to weekly rules", () => {
    const r = ok({ repeat: "DAILY", repeatWeekdays: "1,2" });
    expect(r.success && r.data.repeatWeekdays).toEqual([]);
  });

  test("reminder minutes: 5, 10, 15, 30, 60 and 1440 only; blank means none", () => {
    for (const good of ["5", "10", "15", "30", "60", "1440"]) expect(ok({ remindMinutes: good }).success).toBe(true);
    for (const bad of ["7", "0", "-5", "x", "2880"]) expect(fieldErrors(ok({ remindMinutes: bad }))).toContain("remindMinutes");
    const blank = ok({ remindMinutes: "" });
    expect(blank.success && blank.data.remindMinutes).toBeUndefined();
  });
});

describe("stage 4d: to-do recurrence", () => {
  const ok = (over: Record<string, unknown>) => todoSchema.safeParse({ title: "Water plants", ...over });

  test("defaults to no repeat", () => {
    const r = ok({});
    expect(r.success && r.data).toMatchObject({ repeat: "NONE", repeatInterval: 1, repeatWeekdays: [], repeatMonthDay: null });
  });

  test("a recurring to-do needs a due date", () => {
    expect(fieldErrors(ok({ repeat: "WEEKLY" }))).toContain("dueDate");
    expect(ok({ repeat: "WEEKLY", dueDate: "2026-10-05" }).success).toBe(true);
  });

  test("until must not be before the due date", () => {
    expect(fieldErrors(ok({ repeat: "DAILY", dueDate: "2026-10-05", repeatUntil: "2026-10-04" }))).toContain("repeatUntil");
  });

  test("a monthly to-do remembers the intended day of the month", () => {
    const r = ok({ repeat: "MONTHLY", dueDate: "2026-01-31" });
    expect(r.success && r.data.repeatMonthDay).toBe(31);
    const weekly = ok({ repeat: "WEEKLY", dueDate: "2026-01-31" });
    expect(weekly.success && weekly.data.repeatMonthDay).toBeNull();
  });

  test("interval, weekdays and no-repeat clearing behave like events", () => {
    expect(fieldErrors(ok({ repeat: "DAILY", dueDate: "2026-10-05", repeatInterval: "0" }))).toContain("repeatInterval");
    const r = ok({ repeat: "WEEKLY", dueDate: "2026-10-05", repeatWeekdays: "2,0" });
    expect(r.success && r.data.repeatWeekdays).toEqual([0, 2]);
    const none = ok({ repeat: "NONE", dueDate: "2026-10-05", repeatInterval: "4", repeatWeekdays: "1" });
    expect(none.success && none.data).toMatchObject({ repeatInterval: 1, repeatWeekdays: [] });
  });
});

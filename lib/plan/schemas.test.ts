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

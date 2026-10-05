import { z } from "zod";
import {
  blankToUndefined,
  decimalComma,
  occurredAtField,
  optionalDayKey,
  optionalText,
  requiredText,
} from "@/lib/forms";
import { isDayKey, romeLocalToDate } from "@/lib/time";

const optionalNumber = (schema: z.ZodType<number>) =>
  z.preprocess((v) => decimalComma(blankToUndefined(v)), schema.optional());

const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToUndefined, z.enum(values).optional());

const optionalId = z.preprocess(blankToUndefined, z.string().optional());

// ---- Goal -----------------------------------------------------------------

const MEASURABLE = ["WORKOUT", "STUDY", "SLEEP", "MEAL"] as const;

export const goalSchema = z
  .object({
    kind: z.enum(["MANUAL", "MEASURED"]),
    title: requiredText(80),
    category: optionalText(30),
    deadline: optionalDayKey,
    progress: optionalNumber(
      z.coerce
        .number({ error: "Enter a number" })
        .int("Enter a whole number")
        .min(0, "Enter 0 to 100")
        .max(100, "Enter 0 to 100"),
    ),
    measuredType: optionalEnum(MEASURABLE),
    // WORKOUT/STUDY targets are typed in hours, SLEEP in hours, MEAL in kcal.
    target: optionalNumber(z.coerce.number({ error: "Enter a number" }).positive("Enter a number above 0")),
    startDate: optionalDayKey,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "MANUAL") {
      if (v.progress === undefined) ctx.addIssue({ code: "custom", path: ["progress"], message: "Enter 0 to 100" });
      return;
    }
    if (!v.measuredType) ctx.addIssue({ code: "custom", path: ["measuredType"], message: "Choose what to measure" });
    if (v.target === undefined) ctx.addIssue({ code: "custom", path: ["target"], message: "Enter a target" });
    if (!v.startDate) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Choose a start date" });
  })
  .transform((v, ctx) => {
    const base = { title: v.title, category: v.category, deadline: v.deadline };
    if (v.kind === "MANUAL") {
      return { ...base, kind: "MANUAL" as const, progress: v.progress ?? 0, measuredType: null, targetValue: null, startDate: null };
    }
    const type = v.measuredType!;
    const inMinutes = type === "STUDY" || type === "WORKOUT";
    const targetValue = inMinutes ? Math.round(v.target! * 60) : v.target!;
    if (inMinutes && targetValue < 1) {
      ctx.issues.push({ code: "custom", message: "Enter at least 1 minute", input: v.target, path: ["target"] });
      return z.NEVER;
    }
    return {
      ...base,
      kind: "MEASURED" as const,
      progress: null,
      measuredType: type,
      targetValue,
      startDate: v.startDate!,
    };
  });

export type GoalInput = z.infer<typeof goalSchema>;

// ---- Problem --------------------------------------------------------------

export const problemSchema = z.object({
  title: requiredText(80),
  trigger: optionalText(120),
  counterPlan: optionalText(160),
  severity: z.coerce
    .number({ error: "Enter 1 to 5" })
    .int("Enter 1 to 5")
    .min(1, "Enter 1 to 5")
    .max(5, "Enter 1 to 5"),
  status: optionalEnum(["ACTIVE", "IMPROVING", "SOLVED"]),
});

export const occurrenceSchema = z.object({
  note: optionalText(160),
  occurredAt: occurredAtField,
});

// ---- Recurrence (shared by events and to-dos) -----------------------------

/** "0,2,4" (from a hidden form field) -> [0, 2, 4]; anything that is not an integer stays NaN so validation fails. */
const parseWeekdays = (v: unknown) => {
  const raw = blankToUndefined(v);
  if (raw === undefined) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .split(",")
    .map((t) => (t.trim() === "" ? NaN : Number(t)));
};

const intervalMessage = "Enter 1 to 99";
const repeatShape = {
  repeat: z.preprocess(blankToUndefined, z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE")),
  repeatInterval: z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: intervalMessage }).int(intervalMessage).min(1, intervalMessage).max(99, intervalMessage).default(1),
  ),
  repeatWeekdays: z.preprocess(
    parseWeekdays,
    z.array(z.number({ error: "Pick weekdays" }).int("Pick weekdays").min(0, "Pick weekdays").max(6, "Pick weekdays")).default([]),
  ),
  repeatUntil: optionalDayKey,
};

type RepeatInput = {
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatInterval: number;
  repeatWeekdays: number[];
  repeatUntil?: string | undefined;
};

/** Clears the fields that do not apply to the chosen repeat and checks `until` against the first day. */
function normalizeRepeat(v: RepeatInput, firstDay: string | undefined, ctx: z.RefinementCtx) {
  const recurring = v.repeat !== "NONE";
  if (recurring && v.repeatUntil && firstDay && v.repeatUntil < firstDay) {
    ctx.issues.push({ code: "custom", message: "Until must not be before the start", input: v.repeatUntil, path: ["repeatUntil"] });
  }
  return {
    repeat: v.repeat,
    repeatInterval: recurring ? v.repeatInterval : 1,
    repeatWeekdays: v.repeat === "WEEKLY" ? [...new Set(v.repeatWeekdays)].sort((a, b) => a - b) : [],
    repeatUntil: recurring ? v.repeatUntil : undefined,
  };
}

// ---- Todo -----------------------------------------------------------------

export const todoSchema = z
  .object({
    title: requiredText(120),
    dueDate: optionalDayKey,
    priority: z.preprocess(blankToUndefined, z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")),
    goalId: optionalId,
    problemId: optionalId,
    ...repeatShape,
  })
  .transform((v, ctx) => {
    const rule = normalizeRepeat(v, v.dueDate, ctx);
    if (rule.repeat !== "NONE" && !v.dueDate) {
      ctx.issues.push({ code: "custom", message: "Set a due date to repeat", input: v.dueDate, path: ["dueDate"] });
    }
    return {
      title: v.title,
      dueDate: v.dueDate,
      priority: v.priority,
      goalId: v.goalId,
      problemId: v.problemId,
      ...rule,
      // Remembered so a monthly to-do created on the 31st returns to the 31st after a clamped month.
      repeatMonthDay: rule.repeat === "MONTHLY" && v.dueDate ? Number(v.dueDate.slice(8)) : null,
    };
  });

// ---- Event ----------------------------------------------------------------

const time = z.string({ error: "Enter a time" }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time");

export const REMIND_OPTIONS = [5, 10, 15, 30, 60, 1440] as const;

export const eventSchema = z
  .object({
    title: requiredText(80),
    date: z.string({ error: "Enter a date" }).refine(isDayKey, "Enter a valid date"),
    startTime: time,
    endTime: z.preprocess(blankToUndefined, time.optional()),
    remindMinutes: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ error: "Choose a reminder time" })
        .refine((n) => (REMIND_OPTIONS as readonly number[]).includes(n), "Choose a reminder time")
        .optional(),
    ),
    ...repeatShape,
  })
  .transform((v, ctx) => {
    const startsAt = romeLocalToDate(`${v.date}T${v.startTime}`);
    const endsAt = v.endTime ? romeLocalToDate(`${v.date}T${v.endTime}`) : undefined;
    // Compare instants, not clock strings: on the spring-forward day 02:30 does not exist.
    if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
      ctx.issues.push({ code: "custom", message: "End must be after the start", input: v.endTime, path: ["endTime"] });
      return z.NEVER;
    }
    const rule = normalizeRepeat(v, v.date, ctx);
    return { title: v.title, startsAt, endsAt, remindMinutes: v.remindMinutes, ...rule };
  });

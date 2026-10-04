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
  .transform((v) => {
    const base = { title: v.title, category: v.category, deadline: v.deadline };
    if (v.kind === "MANUAL") {
      return { ...base, kind: "MANUAL" as const, progress: v.progress ?? 0, measuredType: null, targetValue: null, startDate: null };
    }
    const type = v.measuredType!;
    const minutes = type === "STUDY" || type === "WORKOUT";
    return {
      ...base,
      kind: "MEASURED" as const,
      progress: null,
      measuredType: type,
      targetValue: minutes ? Math.round(v.target! * 60) : v.target!,
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

// ---- Todo -----------------------------------------------------------------

export const todoSchema = z.object({
  title: requiredText(120),
  dueDate: optionalDayKey,
  priority: z.preprocess(blankToUndefined, z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")),
  goalId: optionalId,
  problemId: optionalId,
});

// ---- Event ----------------------------------------------------------------

const time = z.string({ error: "Enter a time" }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time");

export const eventSchema = z
  .object({
    title: requiredText(80),
    date: z.string({ error: "Enter a date" }).refine(isDayKey, "Enter a valid date"),
    startTime: time,
    endTime: z.preprocess(blankToUndefined, time.optional()),
  })
  .superRefine((v, ctx) => {
    if (v.endTime && v.endTime <= v.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End must be after the start" });
    }
  })
  .transform((v) => ({
    title: v.title,
    startsAt: romeLocalToDate(`${v.date}T${v.startTime}`),
    endsAt: v.endTime ? romeLocalToDate(`${v.date}T${v.endTime}`) : undefined,
  }));

import { z } from "zod";
import { romeLocalToDate } from "@/lib/time";

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const label = z.preprocess(blankToUndefined, z.string().max(80).optional());

// A datetime-local string is Rome wall time; anything else (ISO with offset) goes to Date as-is.
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const occurredAt = z.preprocess((v) => {
  const x = blankToUndefined(v);
  return typeof x === "string" && LOCAL_DATETIME.test(x) ? romeLocalToDate(x) : x;
}, z.coerce.date({ error: "Enter a valid date and time" }).optional());

// Italian keypads only offer a decimal comma: "7,5" means 7.5.
const decimalComma = (v: unknown) =>
  typeof v === "string" && /^\s*\d*,\d+\s*$/.test(v) ? v.replace(",", ".") : v;

const value = (min: number, max: number, integer = false) => {
  const base = z.coerce.number({ error: "Enter a number" });
  const num = integer ? base.int("Enter a whole number") : base;
  return z.preprocess(
    decimalComma,
    num
      .min(min, `Enter a value between ${min} and ${max}`)
      .max(max, `Enter a value between ${min} and ${max}`),
  );
};

const entry = <T extends string>(type: T, v: ReturnType<typeof value>) =>
  z.object({ type: z.literal(type), value: v, label, occurredAt });

export const entryInputSchema = z.discriminatedUnion("type", [
  entry("WORKOUT", value(1, 600)),
  entry("STUDY", value(1, 960)),
  entry("SLEEP", value(0.5, 24)),
  entry("MEAL", value(1, 10000)),
  entry("MOOD", value(1, 10, true)),
]);

export type EntryInput = z.infer<typeof entryInputSchema>;

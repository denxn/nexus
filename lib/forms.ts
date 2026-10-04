import { z } from "zod";
import { isDayKey, romeLocalToDate } from "@/lib/time";

export const blankToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

/** Italian keypads only offer a decimal comma: "7,5" means 7.5. */
export const decimalComma = (v: unknown) =>
  typeof v === "string" && /^\s*\d*,\d+\s*$/.test(v) ? v.replace(",", ".") : v;

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** A datetime-local string is Rome wall time; anything else (ISO with offset) goes to Date as-is. */
export const occurredAtField = z.preprocess((v) => {
  const x = blankToUndefined(v);
  return typeof x === "string" && LOCAL_DATETIME.test(x) ? romeLocalToDate(x) : x;
}, z.coerce.date({ error: "Enter a valid date and time" }).optional());

/** Optional free text with a max length; blank becomes undefined. */
export const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `Up to ${max} characters`).optional());

export const requiredText = (max: number) =>
  z.string({ error: "Enter a title" }).trim().min(1, "Enter a title").max(max, `Up to ${max} characters`);

/** Optional "YYYY-MM-DD" that must be a real date. */
export const optionalDayKey = z.preprocess(
  blankToUndefined,
  z.string().refine(isDayKey, "Enter a valid date").optional(),
);

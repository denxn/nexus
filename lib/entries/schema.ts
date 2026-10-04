import { z } from "zod";

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const label = z.preprocess(blankToUndefined, z.string().max(80).optional());
const occurredAt = z.preprocess(blankToUndefined, z.coerce.date().optional());

const value = (min: number, max: number, integer = false) => {
  const base = z.coerce.number({ error: "Enter a number" });
  const num = integer ? base.int("Enter a whole number") : base;
  return num
    .min(min, `Enter a value between ${min} and ${max}`)
    .max(max, `Enter a value between ${min} and ${max}`);
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

import { z } from "zod";
import { optionalText } from "@/lib/forms";
import { isDayKey } from "@/lib/time";

export const NOTE_BODY_MAX = 5000;
export const NOTE_TITLE_MAX = 80;

export const noteSchema = z.object({
  day: z.string({ error: "Enter a date" }).refine(isDayKey, "Enter a valid date"),
  title: optionalText(NOTE_TITLE_MAX),
  body: z
    .string({ error: "Write something" })
    .trim()
    .min(1, "Write something")
    .max(NOTE_BODY_MAX, `Up to ${NOTE_BODY_MAX} characters`),
});

export type NoteInput = z.infer<typeof noteSchema>;

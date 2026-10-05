import { z } from "zod";
import { optionalText } from "@/lib/forms";
import { isDayKey } from "@/lib/time";

export const NOTE_BODY_MAX = 5000;
export const NOTE_TITLE_MAX = 80;

export const noteSchema = z.object({
  day: z.string({ error: "Enter a date" }).refine(isDayKey, "Enter a valid date"),
  title: optionalText(NOTE_TITLE_MAX),
  // Browsers submit textarea line breaks as \r\n; store plain \n so the stored text and the length limit are clean.
  body: z
    .string({ error: "Write something" })
    .transform((s) => s.replace(/\r\n?/g, "\n"))
    .pipe(z.string().trim().min(1, "Write something").max(NOTE_BODY_MAX, `Up to ${NOTE_BODY_MAX} characters`)),
});

export type NoteInput = z.infer<typeof noteSchema>;

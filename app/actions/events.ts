"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { parseId, parseWith, readForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { withSaveErrors } from "@/lib/entries/save";
import { eventSchema } from "@/lib/plan/schemas";
import { addSkippedDay } from "@/lib/recurrence/skip";
import { requireSession } from "@/lib/require-session";
import { isDayKey } from "@/lib/time";

const revalidate = () => {
  revalidatePath("/calendar");
  revalidatePath("/");
};

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(eventSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const state = await withSaveErrors(values, async () => {
    await prisma.event.create({ data: parsed.data });
  });
  if (state.ok) revalidate();
  return state;
}

export async function updateEvent(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(eventSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const state = await withSaveErrors(values, async () => {
    const { endsAt, repeatUntil, remindMinutes, ...rest } = parsed.data;
    await prisma.event.update({
      where: { id: parseId(id) },
      data: {
        ...rest,
        endsAt: endsAt ?? null,
        repeatUntil: repeatUntil ?? null,
        remindMinutes: remindMinutes ?? null,
        // Turning repetition off also forgets the skipped days.
        ...(rest.repeat === "NONE" && { skippedDays: [] }),
      },
    });
  });
  if (state.ok) revalidate();
  return state;
}

export async function deleteEvent(id: string): Promise<void> {
  await requireSession();
  await prisma.event.deleteMany({ where: { id: parseId(id) } });
  revalidate();
}

/** Hides one occurrence of a recurring event (a day of the series) without touching the rest. */
export async function skipEventDay(id: string, day: string): Promise<void> {
  await requireSession();
  const eventId = parseId(id);
  if (!isDayKey(day)) throw new Error("Invalid day");
  await addSkippedDay(eventId, day);
  revalidate();
}

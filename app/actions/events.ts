"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { parseId, parseWith, readForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { withSaveErrors } from "@/lib/entries/save";
import { eventSchema } from "@/lib/plan/schemas";
import { requireSession } from "@/lib/require-session";

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
    await prisma.event.update({ where: { id: parseId(id) }, data: { ...parsed.data, endsAt: parsed.data.endsAt ?? null } });
  });
  if (state.ok) revalidate();
  return state;
}

export async function deleteEvent(id: string): Promise<void> {
  await requireSession();
  await prisma.event.deleteMany({ where: { id: parseId(id) } });
  revalidate();
}

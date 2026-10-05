"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { parseId, parseWith, readForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { withSaveErrors } from "@/lib/entries/save";
import { noteSchema } from "@/lib/notes/schema";
import { requireSession } from "@/lib/require-session";

const revalidate = () => {
  revalidatePath("/notes");
  revalidatePath("/calendar");
  revalidatePath("/");
};

export async function createNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(noteSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const state = await withSaveErrors(values, async () => {
    await prisma.note.create({ data: parsed.data });
  });
  if (state.ok) revalidate();
  return state;
}

export async function updateNote(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(noteSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const { title, ...rest } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    await prisma.note.update({ where: { id: parseId(id) }, data: { ...rest, title: title ?? null } });
  });
  if (state.ok) revalidate();
  return state;
}

export async function deleteNote(id: string): Promise<void> {
  await requireSession();
  await prisma.note.deleteMany({ where: { id: parseId(id) } });
  revalidate();
}

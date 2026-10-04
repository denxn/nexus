"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { parseWith, readForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { withSaveErrors } from "@/lib/entries/save";
import { todoSchema } from "@/lib/plan/schemas";
import { requireSession } from "@/lib/require-session";

const revalidate = () => {
  revalidatePath("/plan");
  revalidatePath("/calendar");
  revalidatePath("/");
};

export async function createTodo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(todoSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const state = await withSaveErrors(values, async () => {
    await prisma.todo.create({ data: parsed.data });
  });
  if (state.ok) revalidate();
  return state;
}

export async function updateTodo(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(todoSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const { dueDate, goalId, problemId, ...rest } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    await prisma.todo.update({
      where: { id },
      data: { ...rest, dueDate: dueDate ?? null, goalId: goalId ?? null, problemId: problemId ?? null },
    });
  });
  if (state.ok) revalidate();
  return state;
}

export async function toggleTodo(id: string, done: boolean): Promise<void> {
  await requireSession();
  await prisma.todo.updateMany({ where: { id }, data: { done, doneAt: done ? new Date() : null } });
  revalidate();
}

export async function deleteTodo(id: string): Promise<void> {
  await requireSession();
  await prisma.todo.deleteMany({ where: { id } });
  revalidate();
}

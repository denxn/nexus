"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { parseFlag, parseId, parseWith, readForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { withSaveErrors } from "@/lib/entries/save";
import { todoSchema } from "@/lib/plan/schemas";
import { advanceTodo } from "@/lib/plan/rollTodo";
import { keepMonthDay } from "@/lib/recurrence/rule";
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
  const { dueDate, goalId, problemId, repeatUntil, ...rest } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    const todoId = parseId(id);
    let repeatMonthDay = rest.repeatMonthDay;
    if (rest.repeat === "MONTHLY" && dueDate) {
      // A clamped due date (28 Feb for the 31st) must not overwrite the remembered day.
      const current = await prisma.todo.findUnique({ where: { id: todoId }, select: { repeatMonthDay: true } });
      repeatMonthDay = keepMonthDay(current?.repeatMonthDay ?? null, dueDate);
    }
    await prisma.todo.update({
      where: { id: todoId },
      data: { ...rest, repeatMonthDay, dueDate: dueDate ?? null, goalId: goalId ?? null, problemId: problemId ?? null, repeatUntil: repeatUntil ?? null },
    });
  });
  if (state.ok) revalidate();
  return state;
}

export async function toggleTodo(id: string, done: boolean): Promise<void> {
  await requireSession();
  const todoId = parseId(id);
  const flag = parseFlag(done);
  // Ticking an open recurring to-do rolls it forward (and keeps a completed copy) instead of closing it.
  if (flag && (await advanceTodo(todoId, "complete"))) {
    revalidate();
    return;
  }
  await prisma.todo.updateMany({ where: { id: todoId }, data: { done: flag, doneAt: flag ? new Date() : null } });
  revalidate();
}

export async function skipTodo(id: string): Promise<void> {
  await requireSession();
  await advanceTodo(parseId(id), "skip");
  revalidate();
}

export async function deleteTodo(id: string): Promise<void> {
  await requireSession();
  await prisma.todo.deleteMany({ where: { id: parseId(id) } });
  revalidate();
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { parseId, parseWith, readForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { withSaveErrors } from "@/lib/entries/save";
import { goalSchema } from "@/lib/plan/schemas";
import { requireSession } from "@/lib/require-session";

const revalidate = () => {
  revalidatePath("/plan");
  revalidatePath("/");
};

export async function createGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(goalSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const state = await withSaveErrors(values, async () => {
    await prisma.goal.create({ data: parsed.data });
  });
  if (state.ok) revalidate();
  return state;
}

export async function updateGoal(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(goalSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const state = await withSaveErrors(values, async () => {
    await prisma.goal.update({
      where: { id: parseId(id) },
      data: { ...parsed.data, category: parsed.data.category ?? null, deadline: parsed.data.deadline ?? null },
    });
  });
  if (state.ok) revalidate();
  return state;
}

export async function setGoalStatus(id: string, status: string): Promise<void> {
  await requireSession();
  const parsed = z.enum(["ACTIVE", "DONE", "PAUSED"]).parse(status);
  await prisma.goal.updateMany({ where: { id: parseId(id) }, data: { status: parsed } });
  revalidate();
}

export async function deleteGoal(id: string): Promise<void> {
  await requireSession();
  await prisma.goal.deleteMany({ where: { id: parseId(id) } });
  revalidate();
}

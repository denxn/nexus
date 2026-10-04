"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { parseId, parseWith, readForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { withSaveErrors } from "@/lib/entries/save";
import { occurrenceSchema, problemSchema } from "@/lib/plan/schemas";
import { requireSession } from "@/lib/require-session";

const revalidate = () => revalidatePath("/plan");

export async function createProblem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(problemSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const { status, ...rest } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    await prisma.problem.create({ data: { ...rest, ...(status && { status }) } });
  });
  if (state.ok) revalidate();
  return state;
}

export async function updateProblem(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(problemSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const { status, trigger, counterPlan, ...rest } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    await prisma.problem.update({
      where: { id: parseId(id) },
      data: { ...rest, trigger: trigger ?? null, counterPlan: counterPlan ?? null, ...(status && { status }) },
    });
  });
  if (state.ok) revalidate();
  return state;
}

export async function setProblemStatus(id: string, status: string): Promise<void> {
  await requireSession();
  const parsed = z.enum(["ACTIVE", "IMPROVING", "SOLVED"]).parse(status);
  await prisma.problem.updateMany({ where: { id: parseId(id) }, data: { status: parsed } });
  revalidate();
}

export async function deleteProblem(id: string): Promise<void> {
  await requireSession();
  await prisma.problem.deleteMany({ where: { id: parseId(id) } });
  revalidate();
}

export async function logOccurrence(
  problemId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parseWith(occurrenceSchema, values);
  if (!("data" in parsed)) return parsed.state;
  const { note, occurredAt } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    await prisma.problemOccurrence.create({
      data: { problemId: parseId(problemId), note, occurredAt: occurredAt ?? new Date() },
    });
  });
  if (state.ok) revalidate();
  return state;
}

export async function deleteOccurrence(id: string): Promise<void> {
  await requireSession();
  await prisma.problemOccurrence.deleteMany({ where: { id: parseId(id) } });
  revalidate();
}

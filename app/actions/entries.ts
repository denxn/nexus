"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/db";
import { entryInputSchema } from "@/lib/entries/schema";

function readForm(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") values[k] = v;
  }
  return values;
}

function parse(formData: FormData) {
  const values = readForm(formData);
  const result = entryInputSchema.safeParse(values);
  if (result.success) return { data: result.data };
  const fieldErrors = z.flattenError(result.error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0];
  }
  if (Object.keys(errors).length === 0) errors.form = "Check the entry and try again";
  return { state: { ok: false, errors, values } satisfies ActionState };
}

export async function createEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parse(formData);
  if (!parsed.data) return parsed.state;
  const { type, value, label, occurredAt } = parsed.data;
  await prisma.entry.create({
    data: { type, value, label, occurredAt: occurredAt ?? new Date() },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function updateEntry(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parse(formData);
  if (!parsed.data) return parsed.state;
  const { type, value, label, occurredAt } = parsed.data;
  await prisma.entry.update({
    where: { id },
    data: { type, value, label: label ?? null, ...(occurredAt && { occurredAt }) },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<void> {
  await prisma.entry.delete({ where: { id } });
  revalidatePath("/");
}

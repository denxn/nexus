"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { parseId } from "@/lib/action-helpers";
import { prisma } from "@/lib/db";
import { entryInputSchema } from "@/lib/entries/schema";
import { withSaveErrors } from "@/lib/entries/save";
import { requireSession } from "@/lib/require-session";

function readForm(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") values[k] = v;
  }
  return values;
}

function parse(values: Record<string, string>) {
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
  await requireSession();
  const values = readForm(formData);
  const parsed = parse(values);
  if (!parsed.data) return parsed.state;
  const { type, value, label, occurredAt } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    await prisma.entry.create({
      data: { type, value, label, occurredAt: occurredAt ?? new Date() },
    });
  });
  if (state.ok) revalidatePath("/");
  return state;
}

export async function updateEntry(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const values = readForm(formData);
  const parsed = parse(values);
  if (!parsed.data) return parsed.state;
  const { type, value, label, occurredAt } = parsed.data;
  const state = await withSaveErrors(values, async () => {
    await prisma.entry.update({
      where: { id: parseId(id) },
      data: { type, value, label: label ?? null, ...(occurredAt && { occurredAt }) },
    });
  });
  if (state.ok) revalidatePath("/");
  return state;
}

export async function deleteEntry(id: string): Promise<void> {
  await requireSession();
  // deleteMany so an entry that is already gone is not an error.
  await prisma.entry.deleteMany({ where: { id: parseId(id) } });
  revalidatePath("/");
}

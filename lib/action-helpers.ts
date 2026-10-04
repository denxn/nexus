import type { z } from "zod";
import type { ActionState } from "@/lib/action-state";

export function readForm(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") values[k] = v;
  }
  return values;
}

/** Parses form values; on failure returns an ActionState with one message per field and the typed values. */
export function parseWith<S extends z.ZodType>(
  schema: S,
  values: Record<string, string>,
): { data: z.output<S> } | { state: ActionState } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { state: { ok: false, errors, values } };
}

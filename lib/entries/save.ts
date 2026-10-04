import type { ActionState } from "@/lib/action-state";

/** Runs a save; a thrown error becomes an inline form error that keeps the typed values. */
export async function withSaveErrors(
  values: Record<string, string>,
  save: () => Promise<void>,
): Promise<ActionState> {
  try {
    await save();
    return { ok: true };
  } catch (error) {
    const missing = (error as { code?: string } | null)?.code === "P2025";
    return {
      ok: false,
      errors: {
        form: missing
          ? "That entry no longer exists."
          : "Couldn't save. Check your connection and try again.",
      },
      values,
    };
  }
}

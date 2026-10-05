import { describe, expect, test } from "vitest";
import { withSaveErrors } from "./save";

const values = { type: "STUDY", value: "90", label: "Mathematics" };

describe("withSaveErrors", () => {
  test("returns ok when the save succeeds", async () => {
    expect(await withSaveErrors(values, async () => {})).toEqual({ ok: true });
  });

  test("a thrown error becomes an inline form error and keeps the typed values", async () => {
    const state = await withSaveErrors(values, async () => {
      throw new Error("connection refused");
    });
    expect(state.ok).toBe(false);
    expect(state.errors?.form).toBeTruthy();
    expect(state.values).toEqual(values);
  });

  test("a missing record (P2025) says the entry no longer exists", async () => {
    const state = await withSaveErrors(values, async () => {
      throw Object.assign(new Error("not found"), { code: "P2025" });
    });
    expect(state.errors?.form).toBe("That entry no longer exists.");
    expect(state.values).toEqual(values);
  });

  test("a foreign-key error (P2003, parent deleted elsewhere) also says the entry no longer exists", async () => {
    const state = await withSaveErrors(values, async () => {
      throw Object.assign(new Error("fk"), { code: "P2003" });
    });
    expect(state.errors?.form).toBe("That entry no longer exists.");
    expect(state.values).toEqual(values);
  });
});

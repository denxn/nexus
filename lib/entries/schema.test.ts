import { describe, expect, test } from "vitest";
import { entryInputSchema } from "./schema";

const ok = (input: unknown) => entryInputSchema.safeParse(input).success;

describe("entryInputSchema", () => {
  test("accepts a valid study entry", () => {
    const r = entryInputSchema.safeParse({
      type: "STUDY",
      value: 90,
      label: "Mathematics",
    });
    expect(r.success).toBe(true);
  });

  test("coerces numeric strings from form data", () => {
    const r = entryInputSchema.safeParse({ type: "SLEEP", value: "7.5" });
    expect(r.success && r.data.value).toBe(7.5);
  });

  test("rejects a negative value", () => {
    expect(ok({ type: "STUDY", value: -5 })).toBe(false);
  });

  test("rejects sleep over 24 hours", () => {
    expect(ok({ type: "SLEEP", value: 25 })).toBe(false);
  });

  test("rejects mood 0 and mood 11", () => {
    expect(ok({ type: "MOOD", value: 0 })).toBe(false);
    expect(ok({ type: "MOOD", value: 11 })).toBe(false);
  });

  test("rejects a non-integer mood", () => {
    expect(ok({ type: "MOOD", value: 7.5 })).toBe(false);
  });

  test("rejects an absurd meal size", () => {
    expect(ok({ type: "MEAL", value: 1_000_000 })).toBe(false);
  });

  test("rejects an empty value", () => {
    expect(ok({ type: "WORKOUT", value: "" })).toBe(false);
  });

  test("an empty label becomes undefined", () => {
    const r = entryInputSchema.safeParse({
      type: "STUDY",
      value: 30,
      label: "",
    });
    expect(r.success && r.data.label).toBeUndefined();
  });

  test("rejects a label over 80 characters", () => {
    expect(ok({ type: "STUDY", value: 30, label: "x".repeat(81) })).toBe(false);
  });

  test("accepts a decimal comma (Italian keypads)", () => {
    const r = entryInputSchema.safeParse({ type: "SLEEP", value: "7,5" });
    expect(r.success && r.data.value).toBe(7.5);
  });

  test("still rejects junk with commas", () => {
    expect(ok({ type: "SLEEP", value: "7,5,2" })).toBe(false);
    expect(ok({ type: "SLEEP", value: "," })).toBe(false);
  });

  test("reads a datetime-local occurredAt as Rome time, not server time", () => {
    const r = entryInputSchema.safeParse({
      type: "STUDY",
      value: 30,
      occurredAt: "2026-10-04T23:30",
    });
    expect(r.success && r.data.occurredAt?.toISOString()).toBe(
      "2026-10-04T21:30:00.000Z",
    );
  });

  test("rejects an unparseable occurredAt", () => {
    expect(ok({ type: "STUDY", value: 30, occurredAt: "garbage" })).toBe(false);
  });

  test("a blank occurredAt means now (undefined)", () => {
    const r = entryInputSchema.safeParse({ type: "STUDY", value: 30, occurredAt: "" });
    expect(r.success && r.data.occurredAt).toBeUndefined();
  });

  test("rejects an unknown type", () => {
    expect(ok({ type: "YOGA", value: 30 })).toBe(false);
  });
});

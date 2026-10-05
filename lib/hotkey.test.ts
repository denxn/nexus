import { describe, expect, test } from "vitest";
import { shouldOpenQuickLog } from "./hotkey";

const press = (
  key: string,
  target: { tagName?: string; isContentEditable?: boolean } | null = {
    tagName: "BODY",
  },
  mods: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean } = {},
) =>
  shouldOpenQuickLog({
    key,
    target,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...mods,
  });

describe("shouldOpenQuickLog", () => {
  test("n on the page body opens the sheet", () => {
    expect(press("n")).toBe(true);
    expect(press("N")).toBe(true);
  });

  test("n inside an input does not", () => {
    expect(press("n", { tagName: "INPUT" })).toBe(false);
  });

  test("n inside a textarea does not", () => {
    expect(press("n", { tagName: "TEXTAREA" })).toBe(false);
  });

  test("n inside a select does not", () => {
    expect(press("n", { tagName: "SELECT" })).toBe(false);
  });

  test("n inside a contenteditable element does not", () => {
    expect(press("n", { tagName: "DIV", isContentEditable: true })).toBe(false);
  });

  test("n with ctrl, meta or alt does not", () => {
    expect(press("n", undefined, { ctrlKey: true })).toBe(false);
    expect(press("n", undefined, { metaKey: true })).toBe(false);
    expect(press("n", undefined, { altKey: true })).toBe(false);
  });

  test("other keys do not", () => {
    expect(press("x")).toBe(false);
  });

  test("a null target still opens", () => {
    expect(press("n", null)).toBe(true);
  });

  test("a keydown event without a key (browser autofill) does not throw and does not open", () => {
    const e = { key: undefined as unknown as string, target: { tagName: "BODY" }, metaKey: false, ctrlKey: false, altKey: false };
    expect(() => shouldOpenQuickLog(e)).not.toThrow();
    expect(shouldOpenQuickLog(e)).toBe(false);
  });
});

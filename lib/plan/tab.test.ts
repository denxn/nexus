import { describe, expect, test } from "vitest";
import { parseTab } from "./tab";

describe("parseTab", () => {
  test("accepts the three tabs", () => {
    expect(parseTab("goals")).toBe("goals");
    expect(parseTab("problems")).toBe("problems");
    expect(parseTab("todo")).toBe("todo");
  });

  test("falls back to goals for junk, missing or repeated params", () => {
    expect(parseTab("x")).toBe("goals");
    expect(parseTab("")).toBe("goals");
    expect(parseTab(undefined)).toBe("goals");
    expect(parseTab(["todo", "problems"])).toBe("todo");
    expect(parseTab(["nope"])).toBe("goals");
  });
});

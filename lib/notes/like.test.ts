import { describe, expect, test } from "vitest";
import { escapeLike } from "./like";

describe("escapeLike", () => {
  test("escapes the LIKE wildcards % and _", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("%_%")).toBe("\\%\\_\\%");
  });

  test("escapes the escape character itself first", () => {
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
    expect(escapeLike("\\%")).toBe("\\\\\\%");
  });

  test("leaves ordinary text, quotes and unicode alone", () => {
    expect(escapeLike("plain words")).toBe("plain words");
    expect(escapeLike(`"quoted" & 'single' 日本語 ☕`)).toBe(`"quoted" & 'single' 日本語 ☕`);
    expect(escapeLike("")).toBe("");
  });
});

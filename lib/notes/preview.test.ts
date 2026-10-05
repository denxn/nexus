import { describe, expect, test } from "vitest";
import { notePreview } from "./preview";

const family = "\u{1F468}‍\u{1F469}‍\u{1F467}"; // one grapheme made of 5 code points

describe("notePreview", () => {
  test("short text is returned as is", () => {
    expect(notePreview("Slept badly, then coffee.")).toBe("Slept badly, then coffee.");
  });

  test("whitespace and newlines collapse to single spaces and the ends are trimmed", () => {
    expect(notePreview("  line one\n\n  line   two \t three \n")).toBe("line one line two three");
  });

  test("long text is cut at the limit with an ellipsis", () => {
    const out = notePreview("a".repeat(200), 140);
    expect(out).toBe("a".repeat(140) + "…");
  });

  test("text of exactly the limit is not cut", () => {
    expect(notePreview("a".repeat(140), 140)).toBe("a".repeat(140));
    expect(notePreview("a".repeat(141), 140)).toBe("a".repeat(140) + "…");
  });

  test("a combined emoji at the boundary is kept whole", () => {
    const out = notePreview("a".repeat(139) + family + "tail", 140);
    expect(out).toBe("a".repeat(139) + family + "…");
  });

  test("a combining accent is not separated from its letter", () => {
    const out = notePreview("a".repeat(138) + "é" + "zzz", 139);
    expect(out).toBe("a".repeat(138) + "é…");
  });

  test("the cut text has no trailing space before the ellipsis", () => {
    expect(notePreview("word ".repeat(40), 10)).toBe("word word…");
  });

  test("an empty or blank body gives an empty preview", () => {
    expect(notePreview("")).toBe("");
    expect(notePreview("  \n ")).toBe("");
  });
});

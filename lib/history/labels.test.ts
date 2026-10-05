import { describe, expect, test } from "vitest";
import { labelBreakdown } from "./labels";

const e = (label: string | null, value: number) => ({ label, value });

describe("labelBreakdown", () => {
  test("merges labels that differ only in case or surrounding spaces", () => {
    const rows = labelBreakdown([e("Maths", 60), e("maths ", 30), e("MATHS", 10)], 8);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "maths", count: 3, total: 100 });
  });

  test("shows the most frequent original spelling (trimmed); ties go to the first seen", () => {
    expect(labelBreakdown([e("Maths", 1), e("maths", 1), e("maths ", 1)], 8)[0].display).toBe("maths");
    expect(labelBreakdown([e("Physics", 1), e("physics", 1)], 8)[0].display).toBe("Physics");
  });

  test("skips null, empty and blank labels", () => {
    expect(labelBreakdown([e(null, 5), e("", 5), e("   ", 5)], 8)).toEqual([]);
  });

  test("sorts by total, then count, then key", () => {
    const rows = labelBreakdown([e("b", 10), e("a", 10), e("c", 50), e("d", 5), e("d", 5), e("d", 5), e("e", 15)], 8);
    expect(rows.map((r) => r.key)).toEqual(["c", "d", "e", "a", "b"]);
    // d: total 15 count 3 beats e: total 15 count 1
  });

  test("respects the limit and handles empty input", () => {
    const many = Array.from({ length: 12 }, (_, i) => e(`l${i}`, i + 1));
    expect(labelBreakdown(many, 5)).toHaveLength(5);
    expect(labelBreakdown([], 5)).toEqual([]);
  });
});

import { describe, expect, test } from "vitest";
import { paginate } from "./paginate";

const items = Array.from({ length: 120 }, (_, i) => i);

describe("paginate", () => {
  test("splits into pages of the given size", () => {
    expect(paginate(items, 1, 50)).toMatchObject({ page: 1, pages: 3, total: 120 });
    expect(paginate(items, 1, 50).items).toHaveLength(50);
    expect(paginate(items, 3, 50).items).toHaveLength(20);
    expect(paginate(items, 2, 50).items[0]).toBe(50);
  });

  test("a page past the end clamps to the last page; below 1 clamps to 1", () => {
    expect(paginate(items, 9, 50).page).toBe(3);
    expect(paginate(items, 0, 50).page).toBe(1);
    expect(paginate(items, -4, 50).page).toBe(1);
  });

  test("an empty list has one page and no items", () => {
    expect(paginate([], 1, 50)).toEqual({ items: [], page: 1, pages: 1, total: 0 });
    expect(paginate([], 5, 50).page).toBe(1);
  });

  test("exactly one full page is one page", () => {
    expect(paginate(items.slice(0, 50), 1, 50).pages).toBe(1);
    expect(paginate(items.slice(0, 51), 1, 50).pages).toBe(2);
  });
});

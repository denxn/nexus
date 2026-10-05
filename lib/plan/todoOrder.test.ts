import { describe, expect, test } from "vitest";
import { isOverdue, orderTodos, sortCompleted, type TodoLike } from "./todoOrder";

const t = (id: string, over: Partial<TodoLike> = {}): TodoLike => ({
  id,
  done: false,
  dueDate: null,
  priority: "MEDIUM",
  ...over,
});
const TODAY = "2026-10-04";
const ids = (list: TodoLike[]) => list.map((x) => x.id);

describe("orderTodos", () => {
  test("overdue, then due today, then future, then undated", () => {
    const { open } = orderTodos(
      [t("undated"), t("future", { dueDate: "2026-10-10" }), t("today", { dueDate: TODAY }), t("late", { dueDate: "2026-10-01" })],
      TODAY,
    );
    expect(ids(open)).toEqual(["late", "today", "future", "undated"]);
  });

  test("same due date sorts HIGH, MEDIUM, LOW", () => {
    const { open } = orderTodos(
      [t("l", { dueDate: TODAY, priority: "LOW" }), t("h", { dueDate: TODAY, priority: "HIGH" }), t("m", { dueDate: TODAY })],
      TODAY,
    );
    expect(ids(open)).toEqual(["h", "m", "l"]);
  });

  test("undated todos sort by priority among themselves, after everything dated", () => {
    const { open } = orderTodos([t("u-low", { priority: "LOW" }), t("u-high", { priority: "HIGH" }), t("dated", { dueDate: "2027-01-01" })], TODAY);
    expect(ids(open)).toEqual(["dated", "u-high", "u-low"]);
  });

  test("ties keep the input order", () => {
    const { open } = orderTodos([t("a"), t("b"), t("c")], TODAY);
    expect(ids(open)).toEqual(["a", "b", "c"]);
  });

  test("done todos go to completed, in input order", () => {
    const { open, completed } = orderTodos([t("x", { done: true }), t("y"), t("z", { done: true })], TODAY);
    expect(ids(open)).toEqual(["y"]);
    expect(ids(completed)).toEqual(["x", "z"]);
  });
});

describe("isOverdue", () => {
  test("open and past due is overdue", () => {
    expect(isOverdue(t("a", { dueDate: "2026-10-03" }), TODAY)).toBe(true);
  });

  test("due today is not overdue", () => {
    expect(isOverdue(t("a", { dueDate: TODAY }), TODAY)).toBe(false);
  });

  test("a done todo with a past date is not overdue", () => {
    expect(isOverdue(t("a", { done: true, dueDate: "2026-09-01" }), TODAY)).toBe(false);
  });

  test("undated is never overdue", () => {
    expect(isOverdue(t("a"), TODAY)).toBe(false);
  });
});

describe("sortCompleted", () => {
  const d = (id: string, iso: string | null) => ({ id, doneAt: iso ? new Date(iso) : null });

  test("newest completion first, missing doneAt last", () => {
    const out = sortCompleted([d("old", "2026-10-01T10:00:00Z"), d("none", null), d("new", "2026-10-03T10:00:00Z"), d("mid", "2026-10-02T10:00:00Z")]);
    expect(out.map((x) => x.id)).toEqual(["new", "mid", "old", "none"]);
  });

  test("ties keep input order and the input is not mutated", () => {
    const input = [d("a", "2026-10-01T10:00:00Z"), d("b", "2026-10-01T10:00:00Z"), d("c", "2026-10-02T10:00:00Z")];
    const out = sortCompleted(input);
    expect(out.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(input.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  test("the mixed order from the old comparator bug is now correct", () => {
    // done(t=1), done(t=3), done(t=2) must come out 3, 2, 1 whatever else surrounds them
    const out = sortCompleted([d("t1", "2026-10-01T00:00:00Z"), d("t3", "2026-10-03T00:00:00Z"), d("t2", "2026-10-02T00:00:00Z")]);
    expect(out.map((x) => x.id)).toEqual(["t3", "t2", "t1"]);
  });
});

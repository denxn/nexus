import { describe, expect, test } from "vitest";
import { isOverdue, orderTodos, type TodoLike } from "./todoOrder";

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

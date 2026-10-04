import { describe, expect, test } from "vitest";
import { selectDashboardGoals } from "./dashboardGoals";

const g = (id: string, over: Partial<{ status: "ACTIVE" | "DONE" | "PAUSED"; deadline: string | null; createdAt: string }> = {}) => ({
  id,
  status: "ACTIVE" as const,
  deadline: null as string | null,
  createdAt: "2026-10-01T10:00:00Z",
  ...over,
});
const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe("selectDashboardGoals", () => {
  test("only ACTIVE goals", () => {
    const out = selectDashboardGoals([g("a"), g("done", { status: "DONE" }), g("paused", { status: "PAUSED" })], 5);
    expect(ids(out)).toEqual(["a"]);
  });

  test("soonest deadline first, undated last", () => {
    const out = selectDashboardGoals([g("none"), g("late", { deadline: "2026-12-01" }), g("soon", { deadline: "2026-10-05" })], 5);
    expect(ids(out)).toEqual(["soon", "late", "none"]);
  });

  test("ties go to the newest goal first", () => {
    const out = selectDashboardGoals(
      [g("old", { deadline: "2026-11-01", createdAt: "2026-09-01T00:00:00Z" }), g("new", { deadline: "2026-11-01", createdAt: "2026-10-03T00:00:00Z" })],
      5,
    );
    expect(ids(out)).toEqual(["new", "old"]);
  });

  test("undated goals are ordered newest first", () => {
    const out = selectDashboardGoals([g("old", { createdAt: "2026-09-01T00:00:00Z" }), g("new", { createdAt: "2026-10-03T00:00:00Z" })], 5);
    expect(ids(out)).toEqual(["new", "old"]);
  });

  test("respects the limit", () => {
    const many = Array.from({ length: 8 }, (_, i) => g(`g${i}`, { deadline: `2026-11-0${i + 1}` }));
    expect(selectDashboardGoals(many, 5)).toHaveLength(5);
    expect(ids(selectDashboardGoals(many, 5))).toEqual(["g0", "g1", "g2", "g3", "g4"]);
  });

  test("does not mutate its input", () => {
    const input = [g("b", { deadline: "2026-12-01" }), g("a", { deadline: "2026-10-01" })];
    selectDashboardGoals(input, 5);
    expect(ids(input)).toEqual(["b", "a"]);
  });
});

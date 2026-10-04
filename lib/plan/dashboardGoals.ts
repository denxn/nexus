type GoalSortable = { status: "ACTIVE" | "DONE" | "PAUSED"; deadline: string | null; createdAt: string };

/** Up to `limit` ACTIVE goals: soonest deadline first (undated last), ties newest first. */
export function selectDashboardGoals<T extends GoalSortable>(goals: T[], limit: number): T[] {
  return goals
    .filter((g) => g.status === "ACTIVE")
    .sort((a, b) => {
      const da = a.deadline ?? "9999-99-99";
      const db = b.deadline ?? "9999-99-99";
      if (da !== db) return da < db ? -1 : 1;
      return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
    })
    .slice(0, limit);
}

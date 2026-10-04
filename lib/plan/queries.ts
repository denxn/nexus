import { prisma } from "@/lib/db";
import type { EntryLike } from "@/lib/stats";
import { addDays, dayKey } from "@/lib/time";
import { goalProgress } from "./goalProgress";
import type { GoalView } from "./types";

export async function getGoals(): Promise<GoalView[]> {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } });
  const starts = goals
    .filter((g) => g.kind === "MEASURED" && g.startDate)
    .map((g) => g.startDate as string)
    .sort();
  const entries: EntryLike[] = starts.length
    ? await prisma.entry.findMany({
        // One extra day so DST offsets cannot drop entries; goalProgress filters by Rome day.
        where: { occurredAt: { gte: new Date(`${addDays(starts[0], -1)}T00:00:00Z`) } },
        select: { type: true, occurredAt: true, value: true },
      })
    : [];
  const today = dayKey(new Date());
  return goals.map((g) => {
    const { value, pct } = goalProgress(
      {
        kind: g.kind,
        progress: g.progress,
        measuredType: g.measuredType as GoalView["measuredType"],
        targetValue: g.targetValue,
        startDate: g.startDate,
      },
      entries,
    );
    return {
      id: g.id,
      title: g.title,
      category: g.category,
      deadline: g.deadline,
      status: g.status,
      kind: g.kind,
      progress: g.progress,
      measuredType: g.measuredType as GoalView["measuredType"],
      targetValue: g.targetValue,
      startDate: g.startDate,
      createdAt: g.createdAt.toISOString(),
      value,
      pct,
      overdue: g.status === "ACTIVE" && g.deadline !== null && g.deadline < today,
    };
  });
}

import { prisma } from "@/lib/db";
import type { EntryLike } from "@/lib/stats";
import { addDays, dayKey } from "@/lib/time";
import { goalProgress } from "./goalProgress";
import type { GoalView, ProblemView, TodoView } from "./types";

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

const STATUS_RANK = { ACTIVE: 0, IMPROVING: 1, SOLVED: 2 } as const;

export async function getProblems(): Promise<ProblemView[]> {
  const rows = await prisma.problem.findMany({
    include: {
      _count: { select: { occurrences: true } },
      occurrences: { orderBy: { occurredAt: "desc" }, take: 10 },
    },
  });
  return rows
    .map((p) => ({
      id: p.id,
      title: p.title,
      trigger: p.trigger,
      counterPlan: p.counterPlan,
      severity: p.severity,
      status: p.status,
      createdAt: p.createdAt.getTime(),
      occurrenceCount: p._count.occurrences,
      occurrences: p.occurrences.map((o) => ({
        id: o.id,
        occurredAt: o.occurredAt.toISOString(),
        note: o.note,
      })),
    }))
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        b.severity - a.severity ||
        b.createdAt - a.createdAt,
    )
    .map(({ createdAt: _createdAt, ...view }) => view);
}

/** All todos; completed ones newest-completed first (orderTodos keeps that order). */
export async function getTodos(): Promise<TodoView[]> {
  const rows = await prisma.todo.findMany({
    include: { goal: { select: { title: true } }, problem: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });
  const time = (d: Date | null) => d?.getTime() ?? 0;
  return rows
    .sort((a, b) => (a.done && b.done ? time(b.doneAt) - time(a.doneAt) : 0))
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      done: t.done,
      goalId: t.goalId,
      goalTitle: t.goal?.title ?? null,
      problemId: t.problemId,
      problemTitle: t.problem?.title ?? null,
    }));
}

export async function getGoalAndProblemOptions() {
  const [goals, problems] = await Promise.all([
    prisma.goal.findMany({ where: { status: { not: "DONE" } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    prisma.problem.findMany({ where: { status: { not: "SOLVED" } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return { goals, problems };
}

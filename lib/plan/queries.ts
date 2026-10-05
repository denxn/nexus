import { prisma } from "@/lib/db";
import type { EntryLike } from "@/lib/stats";
import { addDays, dayKey, monthMatrix } from "@/lib/time";
import { goalProgress } from "./goalProgress";
import { sortCompleted } from "./todoOrder";
import { notePreview } from "@/lib/notes/preview";
import { eventRuleOf, expandEvent } from "@/lib/recurrence/events";
import { buildMarkers, summarizeDay } from "./calendar";
import type { DayAgendaData, EventView, GoalView, ProblemView, TodoView } from "./types";

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
      occurrences: { orderBy: { occurredAt: "desc" }, take: 100 },
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
  const ordered = [...rows.filter((t) => !t.done), ...sortCompleted(rows.filter((t) => t.done))];
  return ordered.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    priority: t.priority,
    done: t.done,
    goalId: t.goalId,
    goalTitle: t.goal?.title ?? null,
    problemId: t.problemId,
    problemTitle: t.problem?.title ?? null,
    repeat: t.repeat,
    repeatInterval: t.repeatInterval,
    repeatWeekdays: t.repeatWeekdays,
    repeatUntil: t.repeatUntil,
  }));
}

export async function getGoalAndProblemOptions() {
  const [goals, problems] = await Promise.all([
    prisma.goal.findMany({ where: { status: { not: "DONE" } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    prisma.problem.findMany({ where: { status: { not: "SOLVED" } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return { goals, problems };
}

/** Markers for every cell of the month grid, plus the agenda for the selected day. */
export async function getCalendarData(month: string, day: string) {
  const days = monthMatrix(month).flat().map((c) => c.day);
  const first = days[0] < day ? days[0] : day;
  const last = days[days.length - 1] > day ? days[days.length - 1] : day;
  // Pad each side so DST offsets cannot drop rows; everything is re-filtered by Rome day below.
  const from = new Date(`${addDays(first, -1)}T00:00:00Z`);
  const to = new Date(`${addDays(last, 2)}T00:00:00Z`);

  const [oneOffs, series, todos, entries, notes] = await Promise.all([
    // One-off events only: a recurring series is expanded below (its stored first row must not also appear here).
    prisma.event.findMany({ where: { repeat: "NONE", startsAt: { gte: from, lt: to } }, orderBy: { startsAt: "asc" } }),
    prisma.event.findMany({
      where: { repeat: { not: "NONE" }, startsAt: { lt: to }, OR: [{ repeatUntil: null }, { repeatUntil: { gte: first } }] },
    }),
    prisma.todo.findMany({ where: { dueDate: { gte: first, lte: last } }, orderBy: { createdAt: "asc" } }),
    prisma.entry.findMany({
      where: { occurredAt: { gte: from, lt: to } },
      select: { type: true, value: true, occurredAt: true },
    }),
    prisma.note.findMany({
      where: { day: { gte: first, lte: last } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, day: true, title: true, body: true },
    }),
  ]);
  const inRange = (d: Date) => {
    const k = dayKey(d);
    return k >= first && k <= last;
  };
  const toView = (row: (typeof oneOffs)[number], o: { day: string; startsAt: Date; endsAt: Date | null }): EventView => ({
    id: row.id,
    title: row.title,
    startsAt: o.startsAt.toISOString(),
    endsAt: o.endsAt?.toISOString() ?? null,
    day: o.day,
    recurring: row.repeat !== "NONE",
    series: {
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      repeat: row.repeat,
      repeatInterval: row.repeatInterval,
      repeatWeekdays: row.repeatWeekdays,
      repeatUntil: row.repeatUntil,
      remindMinutes: row.remindMinutes,
    },
  });
  const occurrences = [
    ...oneOffs.filter((e) => inRange(e.startsAt)).map((row) => ({ row, day: dayKey(row.startsAt), startsAt: row.startsAt, endsAt: row.endsAt })),
    ...series.flatMap((row) => expandEvent(eventRuleOf(row), first, last).map((o) => ({ row, ...o }))),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const ents = entries.filter((e) => inRange(e.occurredAt));

  const agenda: DayAgendaData = {
    events: occurrences.filter((o) => o.day === day).map((o) => toView(o.row, o)),
    todos: todos
      .filter((t) => t.dueDate === day)
      .map((t) => ({ id: t.id, title: t.title, done: t.done, priority: t.priority, recurring: t.repeat !== "NONE" })),
    logged: summarizeDay(day, ents),
    notes: notes
      .filter((n) => n.day === day)
      .map((n) => ({ id: n.id, title: n.title, preview: notePreview(n.body) })),
  };
  return { markers: buildMarkers(days, occurrences, todos, ents, notes), agenda };
}

/** Open to-dos whose due date has passed (oldest first), for the Today card. */
export async function getOverdueTodos(today: string) {
  const rows = await prisma.todo.findMany({
    where: { done: false, dueDate: { lt: today } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 20,
    select: { id: true, title: true, dueDate: true, repeat: true },
  });
  return rows.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate as string, recurring: t.repeat !== "NONE" }));
}

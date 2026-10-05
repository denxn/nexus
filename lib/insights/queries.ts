import { prisma } from "@/lib/db";
import { getGoals } from "@/lib/plan/queries";
import type { GoalView } from "@/lib/plan/types";
import { isOverdue } from "@/lib/plan/todoOrder";
import { getDailyStats, type DayStats } from "@/lib/stats";
import { getTargets, type Targets } from "@/lib/targets";
import { addDays, dayKey } from "@/lib/time";
import { buildBrief } from "./brief";
import { daysSinceWorkout, lastNightSleep, nearestDueGoal, strongestFlaw } from "./briefInput";
import { correlate, strongestCorrelation } from "./correlation";
import { flawsAnalytics } from "./flaws";
import { isActiveDay } from "./activeDay";
import { insightSpan, type CorrMetric, type PerfPeriod } from "./params";
import { performance } from "./performance";
import { disciplineScore, loggingStreak } from "./score";

export type InsightOptions = {
  perf: PerfPeriod;
  correlation: { x: CorrMetric; y: CorrMetric; lag: 0 | 1 };
  greeting: string;
  /** Data the caller already fetched (stats must span at least insightSpan(perf) days); avoids reading it twice. */
  prefetched?: { stats: DayStats[]; targets: Targets; goals: GoalView[] };
};

/** Everything the insight cards need, derived from one stats fetch. */
export async function getInsightData(opts: InsightOptions) {
  const today = dayKey(new Date());
  const span = insightSpan(opts.perf);
  const since = new Date(`${addDays(today, -91)}T00:00:00Z`);

  const [stats, targets, todoRows, goals, problemRows] = await Promise.all([
    opts.prefetched?.stats ?? getDailyStats(span),
    opts.prefetched?.targets ?? getTargets(),
    // Open todos (for the overdue count) plus those due recently (for the score's 7-day window).
    prisma.todo.findMany({
      where: { OR: [{ done: false }, { dueDate: { gte: addDays(today, -60) } }] },
      select: { dueDate: true, done: true, priority: true },
    }),
    opts.prefetched?.goals ?? getGoals(),
    prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        occurrences: { where: { occurredAt: { gte: since } }, select: { occurredAt: true } },
      },
    }),
  ]);

  const { score, parts } = disciplineScore({ stats, targets, todos: todoRows, todayKey: today });
  const streak = loggingStreak(stats, today);
  const flaws = flawsAnalytics(
    stats,
    problemRows.map((p) => ({ id: p.id, title: p.title, occurrences: p.occurrences.map((o) => o.occurredAt) })),
    today,
  );

  const brief = buildBrief({
    greeting: opts.greeting,
    score,
    streak,
    hasData: stats.some(isActiveDay),
    correlation: strongestCorrelation(stats),
    flaw: strongestFlaw(flaws),
    overdueTodos: todoRows.filter((t) => isOverdue({ id: "", done: t.done, dueDate: t.dueDate, priority: t.priority }, today)).length,
    goal: nearestDueGoal(goals, today),
    lastNightSleepH: lastNightSleep(stats, today),
    sleepTarget: targets.sleepH,
    daysSinceWorkout: daysSinceWorkout(stats, today),
    activeDays: stats.filter(isActiveDay).length,
  });

  const { x, y, lag } = opts.correlation;
  return {
    score,
    parts,
    streak,
    brief,
    performance: performance(stats, targets, opts.perf),
    correlation: { x, y, lag, ...correlate(stats, x, y, lag) },
    flaws,
  };
}

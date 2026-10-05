import { prisma } from "@/lib/db";
import { getGoals } from "@/lib/plan/queries";
import { isOverdue } from "@/lib/plan/todoOrder";
import { getDailyStats } from "@/lib/stats";
import { getTargets } from "@/lib/targets";
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
};

/** Everything the insight cards need, derived from one stats fetch. */
export async function getInsightData(opts: InsightOptions) {
  const today = dayKey(new Date());
  const span = insightSpan(opts.perf);
  const since = new Date(`${addDays(today, -91)}T00:00:00Z`);

  const [stats, targets, todoRows, goals, problemRows] = await Promise.all([
    getDailyStats(span),
    getTargets(),
    prisma.todo.findMany({ select: { dueDate: true, done: true, priority: true } }),
    getGoals(),
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

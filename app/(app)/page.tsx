import { BriefCard } from "@/components/BriefCard";
import { GoalsCard } from "@/components/GoalsCard";
import { LifeTimeline } from "@/components/LifeTimeline";
import { MiniCalendar } from "@/components/MiniCalendar";
import { RecentActivity } from "@/components/RecentActivity";
import { ScoreCard } from "@/components/ScoreCard";
import { StatCard } from "@/components/StatCard";
import { WeekGridCard } from "@/components/WeekGridCard";
import dash from "@/components/dashboard.module.css";
import insights from "@/components/insights.module.css";
import { getRecentEntries } from "@/lib/entries/queries";
import { formatHours, formatKcal } from "@/lib/format";
import { getDailyStats, summarizeCards } from "@/lib/stats";
import { parseCorrelationParams, parsePerf } from "@/lib/insights/params";
import { getInsightData } from "@/lib/insights/queries";
import { getCalendarData, getGoals } from "@/lib/plan/queries";
import { weekGrid } from "@/lib/plan/weekGrid";
import { parseRange } from "@/lib/range";
import { getTargets } from "@/lib/targets";
import { toTimelineSeries } from "@/lib/timeline";
import { dayKey, monthKeyOf } from "@/lib/time";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string | string[];
    perf?: string | string[];
    cx?: string | string[];
    cy?: string | string[];
    lag?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const perf = parsePerf(params.perf);
  const correlation = parseCorrelationParams(params);
  const today = dayKey(new Date());
  const [stats, targets, recent, goals, calendar, insight] = await Promise.all([
    getDailyStats(range),
    getTargets(),
    getRecentEntries(8),
    getGoals(),
    getCalendarData(monthKeyOf(today), today),
    getInsightData({ perf, correlation, greeting: "Status report" }),
  ]);
  const cards = summarizeCards(stats, targets);
  const series = toTimelineSeries(stats, targets);

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.h1}>{greeting()}, Dennis.</h1>
        <p className={styles.tag}>Progress today. A stronger tomorrow.</p>
      </header>

      <div className={insights.top}>
        <BriefCard brief={insight.brief} />
        <ScoreCard score={insight.score} parts={insight.parts} streak={insight.streak} />
      </div>

      <div className={styles.cards}>
        <StatCard
          title="Workout"
          main={`${cards.workout.value}/${cards.workout.target}`}
          sub="this week"
          pct={cards.workout.pct}
          week={cards.workout.week}
          color="var(--c-workout)"
        />
        <StatCard
          title="Study"
          main={formatHours(cards.study.value)}
          sub={`/ ${formatHours(cards.study.target)} h`}
          pct={cards.study.pct}
          week={cards.study.week}
          color="var(--c-study)"
        />
        <StatCard
          title="Sleep"
          main={cards.sleep.value.toFixed(1)}
          sub={`/ ${cards.sleep.target} h`}
          pct={cards.sleep.pct}
          week={cards.sleep.week}
          color="var(--c-sleep)"
        />
        <StatCard
          title="Calories"
          main={formatKcal(cards.calories.value)}
          sub={`/ ${formatKcal(cards.calories.target)}`}
          pct={cards.calories.pct}
          week={cards.calories.week}
          color="var(--c-calories)"
        />
      </div>

      <LifeTimeline data={series} range={range} />

      <div className={dash.row}>
        <GoalsCard goals={goals} />
        <WeekGridCard rows={weekGrid(stats, targets, today)} />
        <MiniCalendar today={today} markers={calendar.markers} agenda={calendar.agenda} />
      </div>

      <RecentActivity entries={recent} />
    </div>
  );
}

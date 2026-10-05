import { formatClock } from "@/lib/time";
import { formatDuration } from "@/lib/format";
import { parseHistoryParams, type HistoryRange } from "@/lib/history/params";
import { getHistory, type HistoryType } from "@/lib/history/queries";
import { summarizeSleep, summarizeStudy, summarizeWorkouts } from "@/lib/history/summaries";
import { HistoryChart } from "./HistoryChart";
import { HistoryList } from "./HistoryList";
import { LabelChips } from "./LabelChips";
import { LogButton } from "./LogButton";
import { Pagination } from "./Pagination";
import { RangeTabs } from "./RangeTabs";
import { SummaryTiles } from "./SummaryTiles";
import styles from "./history.module.css";

type Tile = { label: string; value: string; sub?: string };

const dayShort = (key: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${key}T00:00:00Z`));
const hours = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)} h`;

export async function HistoryPage({
  type,
  basePath,
  searchParams,
}: {
  type: HistoryType;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = parseHistoryParams(searchParams);
  const data = await getHistory(type, parsed);
  const { targets, entries, windowDays, today } = data;

  const href = (o: Partial<{ range: HistoryRange; label: string | null; page: number }>) => {
    const next = { ...parsed, ...o };
    const q = new URLSearchParams();
    if (next.range !== 30) q.set("range", String(next.range));
    if (next.label) q.set("label", next.label);
    if (next.page > 1) q.set("page", String(next.page));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  let title: string;
  let logLabel: string;
  let tiles: Tile[];
  let chart: { kind: "bars" | "line"; unit: "min" | "h"; color: string; target?: number; points: { day: string; v: number }[] };
  let subjects: { key: string; display: string; count: number; total: number }[] = [];

  if (type === "WORKOUT") {
    const s = summarizeWorkouts(entries, windowDays, targets, today);
    title = "Workouts";
    logLabel = "Log workout";
    tiles = [
      { label: "Sessions", value: String(s.sessions), sub: `${s.perWeek} per week` },
      { label: "Total time", value: formatDuration(s.totalMin) },
      { label: "Average", value: formatDuration(s.avgMin), sub: "per session" },
      { label: "Longest", value: formatDuration(s.longestMin) },
      { label: "This week", value: `${s.weekCount}/${s.weekTarget}`, sub: "sessions" },
    ];
    chart = { kind: "bars", unit: "min", color: "var(--c-workout)", points: data.days.map((d) => ({ day: d.day, v: d.workoutMin })) };
  } else if (type === "STUDY") {
    const s = summarizeStudy(entries, targets);
    title = "Study";
    logLabel = "Log study";
    subjects = s.subjects;
    tiles = [
      { label: "Total time", value: formatDuration(s.totalMin) },
      { label: "Study days", value: String(s.studyDays), sub: `${formatDuration(s.avgPerStudyDay)} per study day` },
      { label: "Best day", value: s.best ? formatDuration(s.best.minutes) : "–", sub: s.best ? dayShort(s.best.day) : undefined },
      { label: "Days at target", value: String(s.daysMetTarget), sub: `${formatDuration(targets.studyMin)} or more` },
    ];
    chart = { kind: "bars", unit: "min", color: "var(--c-study)", target: targets.studyMin, points: data.days.map((d) => ({ day: d.day, v: d.studyMin })) };
  } else {
    const s = summarizeSleep(entries, targets);
    title = "Sleep";
    logLabel = "Log sleep";
    tiles = [
      { label: "Average", value: s.days ? hours(s.avgHours) : "–", sub: `${s.days} nights logged` },
      { label: "Best night", value: s.best ? hours(s.best.hours) : "–", sub: s.best ? dayShort(s.best.day) : undefined },
      { label: "Worst night", value: s.worst ? hours(s.worst.hours) : "–", sub: s.worst ? dayShort(s.worst.day) : undefined },
      { label: "Nights at target", value: String(s.daysMetTarget), sub: `${hours(targets.sleepH)} or more` },
      { label: "Sleep debt", value: hours(s.debtHours), sub: "below target" },
      { label: "Avg wake-up", value: s.avgWakeMinutes === null ? "–" : formatClock(s.avgWakeMinutes) },
    ];
    chart = { kind: "line", unit: "h", color: "var(--c-sleep)", target: targets.sleepH, points: data.days.map((d) => ({ day: d.day, v: d.sleepH })) };
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.h1}>{title}</h1>
        <LogButton type={type} label={logLabel} />
      </div>

      <div className={styles.bar}>
        <RangeTabs range={parsed.range} hrefFor={(range) => href({ range, page: 1 })} />
        <LabelChips chips={data.chips} active={data.activeLabel} hrefFor={(label) => href({ label, page: 1 })} />
      </div>

      <SummaryTiles tiles={tiles} />

      <section className={`glass ${styles.card}`}>
        <h2 className={styles.title}>Daily</h2>
        <HistoryChart points={chart.points} kind={chart.kind} unit={chart.unit} color={chart.color} target={chart.target} />
      </section>

      {subjects.length > 0 && (
        <section className={`glass ${styles.card}`}>
          <h2 className={styles.title}>Top subjects</h2>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
            {subjects.map((s) => (
              <li key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{s.display}</span>
                <span className={styles.muted}>{formatDuration(s.total)} · {s.count} {s.count === 1 ? "entry" : "entries"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`glass ${styles.card}`}>
        <h2 className={styles.title}>History</h2>
        <HistoryList groups={data.groups} />
        <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} hrefFor={(p) => href({ page: p })} />
      </section>
    </div>
  );
}

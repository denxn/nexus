import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { PerfMetric } from "@/lib/insights/performance";
import { PERF_PERIODS, type PerfPeriod } from "@/lib/insights/params";
import { formatChange } from "@/lib/insights/present";
import { Sparkline } from "./Sparkline";
import styles from "./insights.module.css";

const META: Record<PerfMetric["key"], { label: string; color: string; value: (m: PerfMetric) => string }> = {
  training: { label: "Training", color: "var(--c-workout)", value: (m) => formatDuration(m.current) },
  study: { label: "Study", color: "var(--c-study)", value: (m) => formatDuration(m.current) },
  sleep: { label: "Sleep", color: "var(--c-sleep)", value: (m) => `${m.current.toFixed(1)} h avg` },
  nutrition: { label: "Nutrition", color: "var(--c-calories)", value: (m) => `${Math.round(m.current)}% on target` },
};
const VS: Record<PerfPeriod, string> = { week: "last week", month: "last month", year: "last year" };

export function PerformanceCard({
  metrics,
  period,
  hrefFor,
}: {
  metrics: PerfMetric[];
  period: PerfPeriod;
  hrefFor: (p: PerfPeriod) => string;
}) {
  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>Performance overview</h2>
        <nav className={styles.periods} aria-label="Period">
          {PERF_PERIODS.map((p) => (
            <Link key={p} href={hrefFor(p)} scroll={false} className={p === period ? styles.periodOn : undefined} aria-current={p === period ? "true" : undefined}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.tiles}>
        {metrics.map((m) => {
          const meta = META[m.key];
          const change = formatChange(m.change, m.current);
          return (
            <div key={m.key} className={styles.tile}>
              <span className={styles.tileLabel} style={{ color: meta.color }}>{meta.label}</span>
              <strong className={`${styles.change} ${styles[change.tone]}`}>{change.text}</strong>
              <span className={styles.muted}>vs {VS[period]}</span>
              <span className={styles.tileValue}>{meta.value(m)}</span>
              <Sparkline values={m.spark} color={meta.color} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

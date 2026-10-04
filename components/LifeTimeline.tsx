"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDuration, formatKcal } from "@/lib/format";
import { RANGES, type Range } from "@/lib/range";
import type { TimelinePoint } from "@/lib/timeline";
import styles from "./LifeTimeline.module.css";

type MetricKey = "workout" | "study" | "sleep" | "calories" | "mood";

const METRICS: { key: MetricKey; name: string; color: string }[] = [
  { key: "workout", name: "Workout", color: "var(--c-workout)" },
  { key: "study", name: "Study", color: "var(--c-study)" },
  { key: "sleep", name: "Sleep (h)", color: "var(--c-sleep)" },
  { key: "calories", name: "Calories", color: "var(--c-calories)" },
  { key: "mood", name: "Mood", color: "var(--c-mood)" },
];

const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(
    new Date(`${key}T00:00:00Z`),
  );

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TimelinePoint }[];
}) {
  if (!active || !payload?.length) return null;
  const { day, raw } = payload[0].payload;
  const rows: [string, string, string][] = [
    ["Workout", formatDuration(raw.workoutMin), "var(--c-workout)"],
    ["Study", formatDuration(raw.studyMin), "var(--c-study)"],
    ["Sleep", `${raw.sleepH.toFixed(1)} h`, "var(--c-sleep)"],
    ["Calories", `${formatKcal(raw.kcal)} kcal`, "var(--c-calories)"],
    ["Mood", raw.mood === null ? "–" : `${Math.round(raw.mood * 10) / 10}/10`, "var(--c-mood)"],
  ];
  return (
    <div className={styles.tip}>
      <strong>{dayLabel(day, { weekday: "short", day: "numeric", month: "short" })}</strong>
      {rows.map(([name, value, color]) => (
        <div key={name} className={styles.tipRow}>
          <span style={{ background: color }} className={styles.tipDot} />
          <span>{name}</span>
          <span className={styles.tipVal}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export function LifeTimeline({ data, range }: { data: TimelinePoint[]; range: Range }) {
  const [hidden, setHidden] = useState<Set<MetricKey>>(new Set());
  const shown = (k: MetricKey) => !hidden.has(k);
  const toggle = (k: MetricKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Life timeline</h2>
          <p className={styles.sub}>Everything you do. In one view.</p>
        </div>
        <div className={styles.ranges} role="group" aria-label="Range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/?range=${r}`}
              scroll={false}
              className={r === range ? styles.rangeOn : undefined}
              aria-current={r === range ? "true" : undefined}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.legend}>
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => toggle(m.key)}
            aria-pressed={shown(m.key)}
            className={shown(m.key) ? undefined : styles.off}
          >
            <span style={{ background: m.color }} className={styles.legendDot} />
            {m.name}
          </button>
        ))}
      </div>

      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(d: string) => dayLabel(d, { day: "numeric", month: "short" })}
              stroke="var(--muted)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 5, 10]}
              stroke="var(--muted)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <Tooltip content={<TimelineTooltip />} cursor={{ stroke: "rgba(255,255,255,0.35)" }} />
            {shown("workout") && (
              <Bar dataKey="workout" fill="var(--c-workout)" radius={[2, 2, 0, 0]} maxBarSize={8} isAnimationActive={false} />
            )}
            {shown("study") && (
              <Bar dataKey="study" fill="var(--c-study)" radius={[2, 2, 0, 0]} maxBarSize={8} isAnimationActive={false} />
            )}
            {shown("sleep") && (
              <Line type="monotone" dataKey="sleep" stroke="var(--c-sleep)" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
            {shown("calories") && (
              <Line type="monotone" dataKey="calories" stroke="var(--c-calories)" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
            {shown("mood") && (
              <Line type="monotone" dataKey="mood" stroke="var(--c-mood)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

"use client";

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { METRIC_LABELS } from "@/lib/insights/labels";
import type { CorrMetric } from "@/lib/insights/params";
import { CorrelationPicker } from "./CorrelationPicker";
import styles from "./insights.module.css";

export type CorrelationData = {
  x: CorrMetric;
  y: CorrMetric;
  lag: 0 | 1;
  n: number;
  r: number | null;
  caption: string;
  pairs: { day: string; x: number; y: number }[];
  trend: { slope: number; intercept: number } | null;
};

const day = (key: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${key}T00:00:00Z`));

export function CorrelationCard({ data }: { data: CorrelationData }) {
  const { x, y, lag, pairs, trend } = data;
  const xs = pairs.map((p) => p.x);
  const line =
    trend && xs.length > 1
      ? [Math.min(...xs), Math.max(...xs)].map((px) => ({ x: px, y: trend.slope * px + trend.intercept }))
      : [];

  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>Activity correlation</h2>
      </div>
      <CorrelationPicker x={x} y={y} lag={lag} />
      {pairs.length === 0 ? (
        <p className={styles.muted}>
          Log {METRIC_LABELS[x].name.toLowerCase()} and {METRIC_LABELS[y].name.toLowerCase()} on a few days to see how they relate.
        </p>
      ) : (
        <div className={styles.scatter}>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" dataKey="x" name={METRIC_LABELS[x].axis} stroke="var(--muted)" tickLine={false} fontSize={12} domain={["auto", "auto"]} label={{ value: METRIC_LABELS[x].axis, position: "insideBottom", offset: -10, fill: "var(--muted)", fontSize: 12 }} />
              <YAxis type="number" dataKey="y" name={METRIC_LABELS[y].axis} stroke="var(--muted)" tickLine={false} fontSize={12} domain={["auto", "auto"]} width={44} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  const p = active ? (payload?.[0]?.payload as { day?: string; x: number; y: number } | undefined) : undefined;
                  if (!p?.day) return null;
                  return (
                    <div className={styles.tip}>
                      <strong>{day(p.day)}</strong>
                      <span>{METRIC_LABELS[x].name}: {Math.round(p.x * 10) / 10}</span>
                      <span>{METRIC_LABELS[y].name}{lag === 1 ? " (next day)" : ""}: {Math.round(p.y * 10) / 10}</span>
                    </div>
                  );
                }}
              />
              <Scatter data={pairs} fill={METRIC_LABELS[y].color} isAnimationActive={false} />
              {line.length === 2 && (
                <Scatter data={line} line={{ stroke: "rgba(255,255,255,0.55)", strokeWidth: 1.5 }} shape={() => <g />} legendType="none" isAnimationActive={false} />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className={styles.caption}>
        {data.caption}
        {data.n > 0 && <span className={styles.muted}> · {data.n} days</span>}
      </p>
    </section>
  );
}

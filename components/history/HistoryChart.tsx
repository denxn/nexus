"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDuration } from "@/lib/format";
import { chartAxis } from "@/lib/history/chartAxis";
import styles from "./history.module.css";

const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(`${key}T00:00:00Z`));

/** Daily values over the window: bars (minutes) or a line (hours), with an optional dashed target line. */
export function HistoryChart({
  points,
  kind,
  unit,
  color,
  target,
}: {
  points: { day: string; v: number }[];
  kind: "bars" | "line";
  unit: "min" | "h";
  color: string;
  target?: number;
}) {
  const fmt = (v: number) => (unit === "min" ? formatDuration(v) : `${Math.round(v * 10) / 10} h`);
  const axis = chartAxis(points.map((p) => p.v), target, unit);
  const common = (
    <>
      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
      <XAxis dataKey="day" tickFormatter={(d: string) => dayLabel(d, { day: "numeric", month: "short" })} stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={12} minTickGap={28} />
      <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={12} width={40} allowDecimals={false} domain={[0, axis.max]} ticks={axis.ticks} tickFormatter={unit === "min" ? (v: number) => `${v / 60}h` : undefined} />
      <Tooltip
        cursor={{ fill: "rgba(255,255,255,0.05)" }}
        content={({ active, payload }) => {
          const p = active ? (payload?.[0]?.payload as { day: string; v: number } | undefined) : undefined;
          if (!p) return null;
          return (
            <div className={styles.tip}>
              <strong>{dayLabel(p.day, { weekday: "short", day: "numeric", month: "short" })}</strong>
              <span>{fmt(p.v)}</span>
            </div>
          );
        }}
      />
      {target !== undefined && target > 0 && <ReferenceLine y={target} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" />}
    </>
  );
  return (
    <div role="img" aria-label="Daily values over the selected range">
      <ResponsiveContainer width="100%" height={220}>
        {kind === "bars" ? (
          <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {common}
            <Bar dataKey="v" fill={color} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {common}
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

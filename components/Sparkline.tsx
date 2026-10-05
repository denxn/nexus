"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny area chart with no axes; `values` are plotted left to right. */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const id = useId().replace(/:/g, "");
  const data = values.map((v, i) => ({ i, v }));
  if (data.length < 2) return <div style={{ height: 44 }} aria-hidden />;
  return (
    <div style={{ height: 44 }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

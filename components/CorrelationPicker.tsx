"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { METRIC_LABELS } from "@/lib/insights/labels";
import { CORR_METRICS, type CorrMetric } from "@/lib/insights/params";
import styles from "./insights.module.css";

/** Two metric selects and a same-day / next-day toggle; they only update the URL. */
export function CorrelationPicker({ x, y, lag }: { x: CorrMetric; y: CorrMetric; lag: 0 | 1 }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(changes)) next.set(k, v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const select = (label: string, name: "cx" | "cy", value: CorrMetric) => (
    <label className={styles.pick}>
      <span>{label}</span>
      <select value={value} onChange={(e) => set({ [name]: e.target.value })}>
        {CORR_METRICS.map((m) => (
          <option key={m} value={m}>{METRIC_LABELS[m].name}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={styles.picker}>
      {select("Compare", "cx", x)}
      {select("with", "cy", y)}
      <div className={styles.lag} role="group" aria-label="Timing">
        <button type="button" className={lag === 0 ? styles.periodOn : undefined} onClick={() => set({ lag: "0" })}>Same day</button>
        <button type="button" className={lag === 1 ? styles.periodOn : undefined} onClick={() => set({ lag: "1" })}>Next day</button>
      </div>
    </div>
  );
}

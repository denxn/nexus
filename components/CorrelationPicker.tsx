"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { METRIC_LABELS } from "@/lib/insights/labels";
import { CORR_METRICS, normalizeCorrelation, type CorrMetric } from "@/lib/insights/params";
import styles from "./insights.module.css";

type Choice = { x: CorrMetric; y: CorrMetric; lag: 0 | 1 };

/** Two metric selects and a same-day / next-day toggle; they only update the URL. */
export function CorrelationPicker({ x, y, lag }: Choice) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Show the new choice immediately while the server re-renders, instead of snapping back.
  const [choice, setChoice] = useOptimistic<Choice, Choice>({ x, y, lag }, (_current, next) => next);

  const update = (next: Choice) => {
    const normalized = { ...next, ...normalizeCorrelation(next.x, next.y) };
    const params = new URLSearchParams(search.toString());
    params.set("cx", normalized.x);
    params.set("cy", normalized.y);
    params.set("lag", String(normalized.lag));
    startTransition(() => {
      setChoice(normalized);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const select = (label: string, key: "x" | "y") => (
    <label className={styles.pick}>
      <span>{label}</span>
      <select value={choice[key]} disabled={pending} onChange={(e) => update({ ...choice, [key]: e.target.value as CorrMetric })}>
        {CORR_METRICS.map((m) => (
          <option key={m} value={m}>{METRIC_LABELS[m].name}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={styles.picker} aria-busy={pending}>
      {select("Compare", "x")}
      {select("with", "y")}
      <div className={styles.lag} role="group" aria-label="Timing">
        <button type="button" disabled={pending} aria-pressed={choice.lag === 0} className={choice.lag === 0 ? styles.periodOn : undefined} onClick={() => update({ ...choice, lag: 0 })}>Same day</button>
        <button type="button" disabled={pending} aria-pressed={choice.lag === 1} className={choice.lag === 1 ? styles.periodOn : undefined} onClick={() => update({ ...choice, lag: 1 })}>Next day</button>
      </div>
    </div>
  );
}

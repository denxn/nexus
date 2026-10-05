import type { HistoryRange } from "@/lib/history/params";
import styles from "./history.module.css";

const OPTIONS: { value: HistoryRange; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
  { value: "all", label: "All" },
];

export function RangeTabs({ range, hrefFor }: { range: HistoryRange; hrefFor: (r: HistoryRange) => string }) {
  return (
    <nav className={styles.pills} aria-label="Range">
      {OPTIONS.map((o) => (
        <a key={String(o.value)} href={hrefFor(o.value)} className={o.value === range ? styles.on : undefined} aria-current={o.value === range ? "true" : undefined}>
          {o.label}
        </a>
      ))}
    </nav>
  );
}

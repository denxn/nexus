import type { LabelRow } from "@/lib/history/labels";
import styles from "./history.module.css";

/** Clicking a chip filters by that label; clicking the active chip clears the filter. */
export function LabelChips({
  chips,
  active,
  hrefFor,
}: {
  chips: LabelRow[];
  active: string | null;
  hrefFor: (label: string | null) => string;
}) {
  const activeKey = active?.trim().toLowerCase() ?? null;
  const showsActive = chips.some((c) => c.key === activeKey);
  if (chips.length === 0 && !active) return null;
  return (
    <nav className={`${styles.pills} ${styles.chips}`} aria-label="Filter by note">
      {chips.map((c) => (
        <a key={c.key} href={hrefFor(c.key === activeKey ? null : c.display)} className={c.key === activeKey ? styles.on : undefined} aria-pressed={c.key === activeKey}>
          {c.display} · {c.count}
        </a>
      ))}
      {active && !showsActive && (
        <a href={hrefFor(null)} className={styles.on} aria-pressed="true">
          {active} ×
        </a>
      )}
    </nav>
  );
}

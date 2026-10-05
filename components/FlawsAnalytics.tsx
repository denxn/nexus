import type { ProblemFindings } from "@/lib/insights/flaws";
import styles from "./insights.module.css";

const DIRECTION = {
  down: { text: "Happening less often", tone: styles.up },
  up: { text: "Happening more often", tone: styles.down },
  flat: { text: "No change in frequency", tone: styles.flat },
} as const;
const WEEK_LABELS = ["3 wks ago", "2 wks ago", "Last wk", "This wk"];

export function FlawsAnalytics({ items }: { items: ProblemFindings[] }) {
  return (
    <section className={`glass ${styles.card}`}>
      <h2 className={styles.title}>Flaws analytics</h2>
      {items.length === 0 ? (
        <p className={styles.muted}>
          A problem needs at least 3 occurrences in the last 90 days before patterns show up. Log occurrences in Plan, under Problems.
        </p>
      ) : (
        <ul className={styles.flaws}>
          {items.map((p) => {
            const max = Math.max(...p.weekly, 1);
            const dir = DIRECTION[p.direction];
            return (
              <li key={p.problemId} className={styles.flaw}>
                <div className={styles.flawHead}>
                  <strong>{p.title}</strong>
                  <span className={styles.muted}>{p.occurrenceCount} in 90 days</span>
                </div>
                <div className={styles.weeks} aria-label="Occurrences per week">
                  {p.weekly.map((count, i) => (
                    <div key={WEEK_LABELS[i]} className={styles.week}>
                      <i style={{ height: `${Math.max((count / max) * 100, count > 0 ? 12 : 4)}%` }} />
                      <span>{count}</span>
                      <small>{WEEK_LABELS[i]}</small>
                    </div>
                  ))}
                </div>
                <p className={`${styles.trend} ${dir.tone}`}>{dir.text}</p>
                {p.findings.length === 0 ? (
                  <p className={styles.muted}>No clear effect on sleep, study or mood yet.</p>
                ) : (
                  <ul className={styles.findings}>
                    {p.findings.map((f) => (
                      <li key={f.metric}>
                        After &ldquo;{p.title}&rdquo;, your {f.metric} is {Math.abs(f.changePct)}% {f.changePct < 0 ? "lower" : "higher"} than usual
                        <span className={styles.muted}> ({f.n} days)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

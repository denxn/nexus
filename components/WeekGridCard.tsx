import type { WeekRow } from "@/lib/plan/weekGrid";
import styles from "./dashboard.module.css";

const META: Record<WeekRow["metric"], { label: string; color: string }> = {
  workout: { label: "Workout", color: "var(--c-workout)" },
  study: { label: "Study", color: "var(--c-study)" },
  sleep: { label: "Sleep", color: "var(--c-sleep)" },
  calories: { label: "Calories", color: "var(--c-calories)" },
  mood: { label: "Mood", color: "var(--c-mood)" },
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekGridCard({ rows }: { rows: WeekRow[] }) {
  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>This week</h2>
      </div>
      <div className={styles.week} role="table" aria-label="This week">
        <span />
        {DAYS.map((d) => (
          <span key={d} className={styles.dayHead}>{d.slice(0, 2)}</span>
        ))}
        {rows.map((row) => (
          <Row key={row.metric} row={row} />
        ))}
      </div>
    </section>
  );
}

function Row({ row }: { row: WeekRow }) {
  const { label, color } = META[row.metric];
  return (
    <>
      <span className={styles.label}>{label}</span>
      {row.cells.map((c) => (
        <i
          key={c.day}
          className={`${styles.dot} ${c.state === "met" ? styles.met : ""} ${c.state === "partial" ? styles.partial : ""} ${c.future ? styles.future : ""}`}
          style={{ color }}
          title={`${label} ${c.day}: ${c.future ? "upcoming" : c.state}`}
        />
      ))}
    </>
  );
}

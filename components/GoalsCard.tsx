import Link from "next/link";
import { selectDashboardGoals } from "@/lib/plan/dashboardGoals";
import type { GoalView } from "@/lib/plan/types";
import styles from "./dashboard.module.css";

const COLORS: Record<string, string> = {
  STUDY: "var(--c-study)",
  WORKOUT: "var(--c-workout)",
  SLEEP: "var(--c-sleep)",
  MEAL: "var(--c-calories)",
};

export function GoalsCard({ goals }: { goals: GoalView[] }) {
  const top = selectDashboardGoals(goals, 5);
  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>Goals</h2>
        <Link href="/plan?tab=goals" className={styles.link}>See all</Link>
      </div>
      {top.length === 0 ? (
        <p className={styles.muted}>No active goals. Add one in Plan.</p>
      ) : (
        <ul className={styles.goals}>
          {top.map((g) => (
            <li key={g.id}>
              <div className={styles.goalTop}>
                <span>{g.title}</span>
                <span>{g.pct}%</span>
              </div>
              <div className={styles.bar}>
                <span
                  style={{
                    width: `${Math.min(Math.max(g.pct, 0), 100)}%`,
                    background: g.measuredType ? COLORS[g.measuredType] : "var(--accent)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

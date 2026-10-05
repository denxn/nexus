import type { ScoreParts } from "@/lib/insights/score";
import { Ring } from "./Ring";
import styles from "./insights.module.css";

const LABELS: [keyof ScoreParts, string][] = [
  ["targets", "Targets met"],
  ["workouts", "Workouts"],
  ["todos", "To-dos done"],
  ["logging", "Days logged"],
];

export function ScoreCard({ score, parts, streak }: { score: number; parts: ScoreParts; streak: number }) {
  return (
    <section className={`glass ${styles.card}`}>
      <h2 className={styles.title}>Discipline score</h2>
      <div className={styles.scoreBody}>
        <Ring pct={score} color="var(--accent)" size={92} label={`Discipline score ${score} out of 100`} />
        <div className={styles.parts}>
          {LABELS.map(([key, label]) => {
            const pct = Math.round(parts[key] * 100);
            return (
              <div key={key} className={styles.part}>
                <span>
                  {label}
                  <b>{pct}%</b>
                </span>
                <div className={styles.partBar}>
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className={styles.streak}>
        {streak > 0 ? `${streak}-day logging streak` : "No logging streak yet. Log something today to start one."}
      </p>
    </section>
  );
}

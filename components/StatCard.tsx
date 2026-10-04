import { BarStrip } from "./BarStrip";
import { Ring } from "./Ring";
import styles from "./StatCard.module.css";

type Props = {
  title: string;
  main: string; // e.g. "2.5"
  sub: string; // e.g. "/ 4 h" or "this week"
  pct: number;
  week: number[];
  color: string;
};

export function StatCard({ title, main, sub, pct, week, color }: Props) {
  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.title} style={{ color }}>
            {title}
          </h2>
          <p className={styles.value}>
            {main} <span className={styles.sub}>{sub}</span>
          </p>
        </div>
        <Ring pct={pct} color={color} />
      </div>
      <BarStrip values={week} color={color} />
    </section>
  );
}

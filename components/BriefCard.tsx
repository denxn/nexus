import styles from "./insights.module.css";

export function BriefCard({ brief }: { brief: { headline: string; lines: string[] } }) {
  return (
    <section className={`glass ${styles.card}`}>
      <h2 className={styles.title}>Daily brief</h2>
      <p className={styles.headline}>{brief.headline}</p>
      {brief.lines.length > 0 && (
        <ul className={styles.lines}>
          {brief.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

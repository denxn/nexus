import styles from "./history.module.css";

export function SummaryTiles({ tiles }: { tiles: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className={styles.tiles}>
      {tiles.map((t) => (
        <div key={t.label} className={`glass ${styles.tile}`}>
          <span className={styles.tileLabel}>{t.label}</span>
          <strong className={styles.tileValue}>{t.value}</strong>
          {t.sub && <span className={styles.tileSub}>{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}

import styles from "./StatusPage.module.css";

/** Shared frame for the error and not-found pages. Shows a message only, never error details. */
export function StatusPage({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.wrap}>
      <div className={`glass ${styles.card}`}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{message}</p>
        <div className={styles.actions}>{children}</div>
      </div>
    </main>
  );
}

export const statusStyles = styles;

import styles from "./history.module.css";

export function Pagination({
  page,
  pages,
  total,
  hrefFor,
  noun = "entries",
}: {
  page: number;
  pages: number;
  total: number;
  hrefFor: (page: number) => string;
  noun?: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className={styles.pager} aria-label="Pages">
      <a href={hrefFor(page - 1)} className={page <= 1 ? styles.off : undefined} aria-disabled={page <= 1}>Previous</a>
      <span>Page {page} of {pages} · {total} {noun}</span>
      <a href={hrefFor(page + 1)} className={page >= pages ? styles.off : undefined} aria-disabled={page >= pages}>Next</a>
    </nav>
  );
}

import Link from "next/link";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { Pagination } from "@/components/history/Pagination";
import styles from "@/components/notes/notes.module.css";
import { parseNotesParams } from "@/lib/notes/params";
import { getNotes } from "@/lib/notes/queries";
import { dayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const dayShort = (key: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${key}T00:00:00Z`));

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; day?: string | string[]; page?: string | string[] }>;
}) {
  const parsed = parseNotesParams(await searchParams);
  const { groups, pagination } = await getNotes(parsed);

  const href = (o: Partial<{ q: string | null; day: string | null; page: number }>) => {
    const next = { ...parsed, ...o };
    const q = new URLSearchParams();
    if (next.q) q.set("q", next.q);
    if (next.day) q.set("day", next.day);
    if (next.page > 1) q.set("page", String(next.page));
    const s = q.toString();
    return s ? `/notes?${s}` : "/notes";
  };

  return (
    <div className={styles.page}>
      <NotesPanel
        groups={groups}
        defaultDay={parsed.day ?? dayKey(new Date())}
        filtered={!!(parsed.q || parsed.day)}
        toolbar={
          <>
      <form method="get" action="/notes" role="search" className={styles.search}>
        <input type="search" name="q" defaultValue={parsed.q ?? ""} placeholder="Search notes" aria-label="Search notes" />
        {parsed.day && <input type="hidden" name="day" value={parsed.day} />}
        <button type="submit">Search</button>
      </form>

      {(parsed.q || parsed.day) && (
        <div className={styles.chips}>
          {parsed.day && (
            <Link className={styles.chip} href={href({ day: null, page: 1 })}>
              Day: {dayShort(parsed.day)} ×
            </Link>
          )}
          {parsed.q && (
            <Link className={styles.chip} href={href({ q: null, page: 1 })}>
              Search: {parsed.q} ×
            </Link>
          )}
        </div>
      )}
          </>
        }
      />

      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} hrefFor={(p) => href({ page: p })} noun="notes" />
    </div>
  );
}

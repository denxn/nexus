"use client";

import { useTransition } from "react";
import { deleteEntry } from "@/app/actions/entries";
import { typeMeta, type EntryRow } from "@/lib/entries/meta";
import { formatEntryValue } from "@/lib/format";
import { useQuickLog } from "./QuickLog";
import styles from "./RecentActivity.module.css";

const when = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function RecentActivity({ entries }: { entries: EntryRow[] }) {
  const { openEdit } = useQuickLog();
  const [pending, startTransition] = useTransition();

  const remove = (entry: EntryRow) => {
    if (!confirm(`Delete "${entry.label || typeMeta(entry.type).name}"?`)) return;
    startTransition(() => deleteEntry(entry.id));
  };

  return (
    <section className={`glass ${styles.card}`}>
      <h2 className={styles.title}>Recent activity</h2>
      {entries.length === 0 ? (
        <p className={styles.empty}>Nothing logged yet. Press N or tap + to log your first entry.</p>
      ) : (
        <ul className={styles.list} aria-busy={pending}>
          {entries.map((e) => {
            const meta = typeMeta(e.type);
            return (
              <li key={e.id} className={styles.row}>
                <span className={styles.dot} style={{ background: meta.color }} />
                <span className={styles.what}>
                  {e.label || meta.name}
                  <small>{formatEntryValue(e.type, e.value)}</small>
                </span>
                <time className={styles.time}>{when.format(new Date(e.occurredAt))}</time>
                <span className={styles.btns}>
                  <button type="button" onClick={() => openEdit(e)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(e)} disabled={pending}>
                    Delete
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useTransition } from "react";
import { deleteEntry } from "@/app/actions/entries";
import { typeMeta, type EntryRow } from "@/lib/entries/meta";
import { formatEntryValue } from "@/lib/format";
import { useQuickLog } from "../QuickLog";
import styles from "./history.module.css";

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });
const heading = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${day}T00:00:00Z`));

export function HistoryList({ groups }: { groups: { day: string; total: number; entries: EntryRow[] }[] }) {
  const { openEdit } = useQuickLog();
  const [pending, startTransition] = useTransition();

  if (groups.length === 0) return <p className={styles.muted}>No entries in this range.</p>;

  return (
    <div aria-busy={pending}>
      {groups.map((g) => (
        <section key={g.day} className={styles.day}>
          <div className={styles.dayHead}>
            <strong>{heading(g.day)}</strong>
            <span>{formatEntryValue(g.entries[0].type, g.total)}</span>
          </div>
          {g.entries.map((e) => (
            <div key={e.id} className={styles.row}>
              <time className={styles.time}>{clock.format(new Date(e.occurredAt))}</time>
              <span className={styles.what}>
                {e.label || typeMeta(e.type).name}
                <small>{formatEntryValue(e.type, e.value)}</small>
              </span>
              <span className={styles.btns}>
                <button type="button" onClick={() => openEdit(e)}>Edit</button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirm(`Delete "${e.label || typeMeta(e.type).name}"?`) && startTransition(() => deleteEntry(e.id))}
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

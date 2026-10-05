"use client";

import { useTransition } from "react";
import { skipTodo, toggleTodo } from "@/app/actions/todos";
import styles from "./reminders.module.css";

type Item = { id: string; title: string; done: boolean; recurring: boolean; overdueSince?: string };

const short = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${day}T00:00:00Z`));

/** The to-do rows of the Today card: tick to complete (recurring ones roll forward), Skip for recurring ones. */
export function TodayTodos({ items }: { items: Item[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <ul className={styles.todayList} aria-busy={pending}>
      {items.map((t) => (
        <li key={t.id}>
          <input
            type="checkbox"
            checked={t.done}
            aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
            onChange={(e) => startTransition(() => toggleTodo(t.id, e.target.checked))}
          />
          <span className={t.done ? styles.struck : undefined}>{t.title}</span>
          {t.overdueSince && <span className={styles.overdue}>overdue since {short(t.overdueSince)}</span>}
          {t.recurring && !t.done && <span className={styles.state}>↻</span>}
          {t.recurring && !t.done && (
            <button type="button" className={styles.skip} disabled={pending} onClick={() => startTransition(() => skipTodo(t.id))}>
              Skip
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

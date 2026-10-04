import Link from "next/link";
import type { DayMarkers } from "@/lib/plan/calendar";
import type { DayAgendaData } from "@/lib/plan/types";
import { monthKeyOf } from "@/lib/time";
import { MonthGrid } from "./calendar/MonthGrid";
import styles from "./dashboard.module.css";

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });

export function MiniCalendar({
  today,
  markers,
  agenda,
}: {
  today: string;
  markers: Record<string, DayMarkers>;
  agenda: DayAgendaData;
}) {
  const openTodos = agenda.todos.filter((t) => !t.done);
  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>Calendar</h2>
        <Link href="/calendar" className={styles.link}>Open</Link>
      </div>
      <MonthGrid month={monthKeyOf(today)} selected={today} today={today} markers={markers} compact />
      <h3 className={styles.title}>Today</h3>
      {agenda.events.length === 0 && openTodos.length === 0 ? (
        <p className={styles.muted}>Nothing planned today.</p>
      ) : (
        <ul className={styles.agenda}>
          {agenda.events.map((e) => (
            <li key={e.id}>
              <time>{clock.format(new Date(e.startsAt))}</time>
              {e.title}
            </li>
          ))}
          {openTodos.map((t) => (
            <li key={t.id}>
              <time>to-do</time>
              {t.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { DayAgendaData } from "@/lib/plan/types";
import { NotifyButton } from "./NotifyButton";
import { TodayTodos } from "./TodayTodos";
import styles from "./reminders.module.css";

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });

type Overdue = { id: string; title: string; dueDate: string; recurring: boolean };

/** Where an event stands right now: under way, over, or still to come (an event without an end counts as one hour). */
function stateOf(startsAt: string, endsAt: string | null, nowMs: number): "now" | "done" | "later" {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 60 * 60 * 1000;
  if (nowMs < start) return "later";
  return nowMs <= end ? "now" : "done";
}

export function TodayCard({ agenda, overdue, nowMs }: { agenda: DayAgendaData; overdue: Overdue[]; nowMs: number }) {
  const todos = [
    ...overdue.map((t) => ({ id: t.id, title: t.title, done: false, recurring: t.recurring, overdueSince: t.dueDate })),
    ...agenda.todos.map((t) => ({ id: t.id, title: t.title, done: t.done, recurring: t.recurring })),
  ];
  const empty = todos.length === 0 && agenda.events.length === 0;

  return (
    <section className={`glass ${styles.today}`}>
      <div className={styles.todayHead}>
        <h2 className={styles.todayTitle}>Today</h2>
        <NotifyButton />
      </div>

      {empty && <p className={styles.empty}>Nothing planned for today.</p>}

      {agenda.events.length > 0 && (
        <ul className={styles.todayList}>
          {agenda.events.map((e) => {
            const state = stateOf(e.startsAt, e.endsAt, nowMs);
            return (
              <li key={`${e.id}:${e.startsAt}`}>
                <span className={styles.when}>
                  {clock.format(new Date(e.startsAt))}
                  {e.endsAt && `–${clock.format(new Date(e.endsAt))}`}
                </span>
                <span className={state === "done" ? styles.struck : undefined}>{e.title}</span>
                <span className={`${styles.state} ${state === "now" ? styles.stateNow : ""}`}>
                  {state === "now" ? "now" : state === "done" ? "done" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {todos.length > 0 && <TodayTodos items={todos} />}
    </section>
  );
}

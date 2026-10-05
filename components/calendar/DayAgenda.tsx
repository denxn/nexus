"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { createEvent, deleteEvent, updateEvent } from "@/app/actions/events";
import { toggleTodo } from "@/app/actions/todos";
import { initialActionState } from "@/lib/action-state";
import type { DayAgendaData, EventView } from "@/lib/plan/types";
import { toRomeLocalInput } from "@/lib/time";
import forms from "../forms.module.css";
import { NoteForm } from "../notes/NoteForm";
import { Sheet } from "../Sheet";
import styles from "./calendar.module.css";

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });
const heading = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T00:00:00Z`));

export function DayAgenda({ day, agenda }: { day: string; agenda: DayAgendaData }) {
  const [editing, setEditing] = useState<EventView | "new" | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const empty = !agenda.events.length && !agenda.todos.length && !agenda.logged.length && !agenda.notes.length;

  return (
    <section className={`glass ${styles.agenda}`} aria-busy={pending}>
      <div className={styles.agendaHead}>
        <h2>{heading(day)}</h2>
        <span className={styles.headActions}>
          <button type="button" className={styles.add} onClick={() => setEditing("new")}>+ Add</button>
          <button type="button" className={styles.addAlt} onClick={() => setAddingNote(true)}>+ Note</button>
        </span>
      </div>

      {empty && <p className={styles.muted}>Nothing planned or logged for this day.</p>}

      <ul className={styles.items}>
        {agenda.events.map((e) => (
          <li key={e.id}>
            <span className={styles.time}>
              {clock.format(new Date(e.startsAt))}
              {e.endsAt && `–${clock.format(new Date(e.endsAt))}`}
            </span>
            <span className={styles.title}>{e.title}</span>
            <span className={styles.rowBtns}>
              <button type="button" onClick={() => setEditing(e)}>Edit</button>
              <button type="button" disabled={pending} onClick={() => confirm(`Delete "${e.title}"?`) && startTransition(() => deleteEvent(e.id))}>Delete</button>
            </span>
          </li>
        ))}
        {agenda.todos.map((t) => (
          <li key={t.id}>
            <input
              type="checkbox"
              checked={t.done}
              aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
              onChange={(ev) => startTransition(() => toggleTodo(t.id, ev.target.checked))}
            />
            <span className={`${styles.title} ${t.done ? styles.struck : ""}`}>{t.title} <small className={styles.muted}>to-do</small></span>
          </li>
        ))}
      </ul>

      {agenda.notes.length > 0 && (
        <div className={styles.logged}>
          <h3>Notes</h3>
          <ul>
            {agenda.notes.map((n) => (
              <li key={n.id}>
                <strong>{n.title || "Untitled"}</strong>
                {n.preview && <span className={styles.muted}> {n.preview}</span>}
              </li>
            ))}
          </ul>
          <Link href={`/notes?day=${day}`} className={styles.openLink}>Open in Notes</Link>
        </div>
      )}

      {agenda.logged.length > 0 && (
        <div className={styles.logged}>
          <h3>Logged</h3>
          <ul>{agenda.logged.map((l) => <li key={l.type}>{l.text}</li>)}</ul>
        </div>
      )}

      {addingNote && (
        <Sheet title="Add note" onClose={() => setAddingNote(false)}>
          <NoteForm note={null} defaultDay={day} onDone={() => setAddingNote(false)} />
        </Sheet>
      )}

      {editing && (
        <Sheet title={editing === "new" ? "Add event" : "Edit event"} onClose={() => setEditing(null)}>
          <EventForm event={editing === "new" ? null : editing} day={day} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </section>
  );
}

function EventForm({ event, day, onDone }: { event: EventView | null; day: string; onDone: () => void }) {
  const action = event ? updateEvent.bind(null, event.id) : createEvent;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const val = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  const err = state.errors ?? {};
  const start = event ? toRomeLocalInput(new Date(event.startsAt)) : `${day}T09:00`;
  const end = event?.endsAt ? toRomeLocalInput(new Date(event.endsAt)) : "";

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className={forms.form}>
      <label className={forms.field}>
        <span>Title</span>
        <input name="title" autoFocus defaultValue={val("title", event?.title ?? "")} aria-invalid={!!err.title} />
        {err.title && <em role="alert">{err.title}</em>}
      </label>
      <label className={forms.field}>
        <span>Date (Rome)</span>
        <input name="date" type="date" required defaultValue={val("date", start.slice(0, 10))} aria-invalid={!!err.date} />
        {err.date && <em role="alert">{err.date}</em>}
      </label>
      <div className={forms.row}>
        <label className={forms.field}>
          <span>Starts</span>
          <input name="startTime" type="time" required defaultValue={val("startTime", start.slice(11))} aria-invalid={!!err.startTime} />
          {err.startTime && <em role="alert">{err.startTime}</em>}
        </label>
        <label className={forms.field}>
          <span>Ends (optional)</span>
          <input name="endTime" type="time" defaultValue={val("endTime", end.slice(11))} aria-invalid={!!err.endTime} />
          {err.endTime && <em role="alert">{err.endTime}</em>}
        </label>
      </div>
      {err.form && <p role="alert" className={forms.formError}>{err.form}</p>}
      <div className={forms.actions}>
        <button type="button" className={forms.cancel} onClick={onDone}>Cancel</button>
        <button type="submit" className={forms.save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

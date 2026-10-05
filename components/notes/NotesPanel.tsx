"use client";

import { useState, useTransition } from "react";
import { deleteNote } from "@/app/actions/notes";
import type { NoteView } from "@/lib/notes/queries";
import { Sheet } from "../Sheet";
import { NoteForm } from "./NoteForm";
import styles from "./notes.module.css";

const heading = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${day}T00:00:00Z`),
  );

export function NotesPanel({
  groups,
  defaultDay,
  filtered,
}: {
  groups: { day: string; notes: NoteView[] }[];
  defaultDay: string;
  filtered: boolean;
}) {
  const [editing, setEditing] = useState<NoteView | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.h1}>Notes</h1>
        <button type="button" className={styles.primary} onClick={() => setEditing("new")}>+ Add note</button>
      </div>

      {groups.length === 0 ? (
        <p className={styles.muted}>
          {filtered ? "No notes match." : "No notes yet. Write down how the day went, what you learned, or what to remember."}
        </p>
      ) : (
        <div aria-busy={pending} className={styles.page}>
          {groups.map((g) => (
            <section key={g.day} className={styles.day}>
              <h2 className={styles.dayHead}>{heading(g.day)}</h2>
              {g.notes.map((n) => (
                <article key={n.id} className={`glass ${styles.note}`}>
                  {n.title && <h3 className={styles.noteTitle}>{n.title}</h3>}
                  <p className={styles.body}>{n.body}</p>
                  <div className={styles.noteBtns}>
                    <button type="button" onClick={() => setEditing(n)}>Edit</button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => confirm("Delete this note? This cannot be undone.") && startTransition(() => deleteNote(n.id))}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}

      {editing && (
        <Sheet title={editing === "new" ? "Add note" : "Edit note"} onClose={() => setEditing(null)}>
          <NoteForm note={editing === "new" ? null : editing} defaultDay={defaultDay} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </>
  );
}

"use client";

import { useActionState, useEffect, useId } from "react";
import { createNote, updateNote } from "@/app/actions/notes";
import { initialActionState } from "@/lib/action-state";
import type { NoteView } from "@/lib/notes/queries";
import forms from "../forms.module.css";
import styles from "./notes.module.css";
import { submitWith } from "../submitWith";

/** Add or edit a note. Errors are inline and the typed values are kept. */
export function NoteForm({ note, defaultDay, onDone }: { note: NoteView | null; defaultDay: string; onDone: () => void }) {
  const action = note ? updateNote.bind(null, note.id) : createNote;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const val = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  const err = state.errors ?? {};
  const bodyId = useId();

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form onSubmit={submitWith(formAction)} className={forms.form}>
      <label className={forms.field}>
        <span>Date</span>
        <input name="day" type="date" required defaultValue={val("day", note?.day ?? defaultDay)} aria-invalid={!!err.day} />
        {err.day && <em role="alert">{err.day}</em>}
      </label>
      <label className={forms.field}>
        <span>Title (optional)</span>
        <input name="title" defaultValue={val("title", note?.title ?? "")} aria-invalid={!!err.title} />
        {err.title && <em role="alert">{err.title}</em>}
      </label>
      {/* Not wrapped in the label: a textarea's contents would become part of its own accessible name. */}
      <div className={forms.field}>
        <label htmlFor={bodyId}>Note</label>
        <textarea id={bodyId} name="body" autoFocus className={styles.textarea} defaultValue={val("body", note?.body ?? "")} aria-invalid={!!err.body} />
        {err.body && <em role="alert">{err.body}</em>}
      </div>
      {err.form && <p role="alert" className={forms.formError}>{err.form}</p>}
      <div className={forms.actions}>
        <button type="button" className={forms.cancel} onClick={onDone}>Cancel</button>
        <button type="submit" className={forms.save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

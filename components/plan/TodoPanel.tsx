"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createTodo, deleteTodo, skipTodo, toggleTodo, updateTodo } from "@/app/actions/todos";
import { initialActionState } from "@/lib/action-state";
import { isOverdue, orderTodos } from "@/lib/plan/todoOrder";
import { repeatLabel } from "@/lib/recurrence/label";
import type { TodoView } from "@/lib/plan/types";
import { addDays } from "@/lib/time";
import forms from "../forms.module.css";
import { RepeatFields } from "../RepeatFields";
import { Sheet } from "../Sheet";
import styles from "./plan.module.css";
import { submitWith } from "../submitWith";

type Option = { id: string; title: string };

const fmtDay = (key: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${key}T00:00:00Z`));

function dueLabel(due: string, today: string): string {
  if (due === today) return "today";
  if (due === addDays(today, 1)) return "tomorrow";
  return fmtDay(due);
}

export function TodoPanel({
  todos,
  goals,
  problems,
  todayKey,
}: {
  todos: TodoView[];
  goals: Option[];
  problems: Option[];
  todayKey: string;
}) {
  const [editing, setEditing] = useState<TodoView | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const { open, completed } = orderTodos(todos, todayKey);

  const row = (t: TodoView) => (
    <li key={t.id} className={`glass ${styles.todo}`}>
      <input
        type="checkbox"
        checked={t.done}
        aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
        onChange={(e) => startTransition(() => toggleTodo(t.id, e.target.checked))}
      />
      <div className={styles.todoMain}>
        <span className={t.done ? styles.struck : undefined}>
          {t.priority === "HIGH" && !t.done && <span className={styles.flag} aria-label="High priority">! </span>}
          {t.title}
        </span>
        <small className={styles.meta}>
          {t.dueDate && (
            <span className={isOverdue(t, todayKey) ? styles.flag : undefined}>
              {isOverdue(t, todayKey) ? "overdue · " : "due "}
              {dueLabel(t.dueDate, todayKey)}
            </span>
          )}
          {t.repeat !== "NONE" && !t.done && ` · ↻ ${repeatLabel({ repeat: t.repeat, interval: t.repeatInterval, weekdays: t.repeatWeekdays, until: t.repeatUntil, monthDay: null })}`}
          {t.goalTitle && ` · goal: ${t.goalTitle}`}
          {t.problemTitle && ` · problem: ${t.problemTitle}`}
        </small>
      </div>
      <span className={styles.btns}>
        <button type="button" onClick={() => setEditing(t)}>Edit</button>
        {t.repeat !== "NONE" && !t.done && (
          <button type="button" disabled={pending} onClick={() => startTransition(() => skipTodo(t.id))}>Skip</button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm(`Delete "${t.title}"?`) && startTransition(() => deleteTodo(t.id))}
        >
          Delete
        </button>
      </span>
    </li>
  );

  return (
    <section>
      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={() => setEditing("new")}>
          + Add to-do
        </button>
      </div>

      {open.length === 0 ? (
        <p className={styles.empty}>Nothing to do. Add a to-do to get started.</p>
      ) : (
        <ul className={styles.list} aria-busy={pending}>{open.map(row)}</ul>
      )}

      {completed.length > 0 && (
        <details className={styles.completed}>
          <summary>Completed ({completed.length})</summary>
          <ul className={styles.list}>{completed.map(row)}</ul>
        </details>
      )}

      {editing && (
        <Sheet title={editing === "new" ? "Add to-do" : "Edit to-do"} onClose={() => setEditing(null)}>
          <TodoForm todo={editing === "new" ? null : editing} goals={goals} problems={problems} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </section>
  );
}

function TodoForm({
  todo,
  goals,
  problems,
  onDone,
}: {
  todo: TodoView | null;
  goals: Option[];
  problems: Option[];
  onDone: () => void;
}) {
  const action = todo ? updateTodo.bind(null, todo.id) : createTodo;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const val = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  const err = state.errors ?? {};

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  // Keep the current link selectable even if its goal/problem is hidden from the lists.
  const withCurrent = (list: Option[], id: string | null, title: string | null) =>
    id && title && !list.some((o) => o.id === id) ? [{ id, title }, ...list] : list;

  return (
    <form onSubmit={submitWith(formAction)} className={forms.form}>
      <label className={forms.field}>
        <span>What needs doing?</span>
        <input name="title" autoFocus defaultValue={val("title", todo?.title ?? "")} aria-invalid={!!err.title} />
        {err.title && <em role="alert">{err.title}</em>}
      </label>
      <div className={forms.row}>
        <label className={forms.field}>
          <span>Due (optional)</span>
          <input name="dueDate" type="date" defaultValue={val("dueDate", todo?.dueDate ?? "")} aria-invalid={!!err.dueDate} />
          {err.dueDate && <em role="alert">{err.dueDate}</em>}
        </label>
        <label className={forms.field}>
          <span>Priority</span>
          <select name="priority" defaultValue={val("priority", todo?.priority ?? "MEDIUM")}>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </label>
      </div>
      <div className={forms.row}>
        <label className={forms.field}>
          <span>Goal (optional)</span>
          <select name="goalId" defaultValue={val("goalId", todo?.goalId ?? "")}>
            <option value="">None</option>
            {withCurrent(goals, todo?.goalId ?? null, todo?.goalTitle ?? null).map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </label>
        <label className={forms.field}>
          <span>Problem (optional)</span>
          <select name="problemId" defaultValue={val("problemId", todo?.problemId ?? "")}>
            <option value="">None</option>
            {withCurrent(problems, todo?.problemId ?? null, todo?.problemTitle ?? null).map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </label>
      </div>
      <RepeatFields
        defaults={{
          repeat: val("repeat", todo?.repeat ?? "NONE"),
          interval: val("repeatInterval", String(todo?.repeatInterval ?? 1)),
          weekdays: val("repeatWeekdays", todo?.repeatWeekdays.join(",") ?? ""),
          until: val("repeatUntil", todo?.repeatUntil ?? ""),
        }}
        err={err}
      />
      {err.form && <p role="alert" className={forms.formError}>{err.form}</p>}
      <div className={forms.actions}>
        <button type="button" className={forms.cancel} onClick={onDone}>Cancel</button>
        <button type="submit" className={forms.save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

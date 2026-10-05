"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createGoal, deleteGoal, setGoalStatus, updateGoal } from "@/app/actions/goals";
import { initialActionState } from "@/lib/action-state";
import { formatEntryValue } from "@/lib/format";
import type { GoalView } from "@/lib/plan/types";
import { dayKey } from "@/lib/time";
import forms from "../forms.module.css";
import { Sheet } from "../Sheet";
import styles from "./plan.module.css";
import { submitWith } from "../submitWith";

const TYPES = [
  { value: "STUDY", label: "Study", unit: "hours" },
  { value: "WORKOUT", label: "Workout", unit: "hours" },
  { value: "SLEEP", label: "Sleep", unit: "hours" },
  { value: "MEAL", label: "Calories", unit: "kcal" },
] as const;

const COLORS: Record<string, string> = {
  STUDY: "var(--c-study)",
  WORKOUT: "var(--c-workout)",
  SLEEP: "var(--c-sleep)",
  MEAL: "var(--c-calories)",
};

const fmtDay = (key: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${key}T00:00:00Z`),
  );

export function GoalsPanel({ goals }: { goals: GoalView[] }) {
  const [editing, setEditing] = useState<GoalView | "new" | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();

  const active = goals.filter((g) => g.status === "ACTIVE");
  const inactive = goals.filter((g) => g.status !== "ACTIVE");
  const shown = showAll ? [...active, ...inactive] : active;

  const remove = (g: GoalView) => {
    if (confirm(`Delete "${g.title}"? Linked to-dos are kept.`)) startTransition(() => deleteGoal(g.id));
  };

  return (
    <section>
      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={() => setEditing("new")}>
          + Add goal
        </button>
        {inactive.length > 0 && (
          <label className={styles.toggle}>
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show done and paused ({inactive.length})
          </label>
        )}
      </div>

      {shown.length === 0 ? (
        <p className={styles.empty}>No goals yet. Add one to start tracking what you are working toward.</p>
      ) : (
        <ul className={styles.list} aria-busy={pending}>
          {shown.map((g) => (
            <li key={g.id} className={`glass ${styles.item} ${g.status !== "ACTIVE" ? styles.dim : ""}`}>
              <div className={styles.itemHead}>
                <strong>{g.title}</strong>
                <span className={styles.pct}>{g.pct}%</span>
              </div>
              <div className={styles.bar} role="progressbar" aria-valuenow={Math.min(g.pct, 100)} aria-valuemin={0} aria-valuemax={100}>
                <span
                  style={{
                    width: `${Math.min(Math.max(g.pct, 0), 100)}%`,
                    background: g.measuredType ? COLORS[g.measuredType] : "var(--accent)",
                  }}
                />
              </div>
              <p className={styles.meta}>
                {g.kind === "MEASURED" && g.measuredType && g.targetValue !== null
                  ? `${formatEntryValue(g.measuredType, g.value)} of ${formatEntryValue(g.measuredType, g.targetValue)}`
                  : "Manual progress"}
                {g.category && ` · ${g.category}`}
                {g.deadline && ` · by ${fmtDay(g.deadline)}`}
                {g.overdue && <span className={styles.flag}> · overdue</span>}
                {g.status !== "ACTIVE" && ` · ${g.status.toLowerCase()}`}
              </p>
              <div className={styles.btns}>
                <button type="button" onClick={() => setEditing(g)}>Edit</button>
                {g.status === "ACTIVE" ? (
                  <>
                    <button type="button" onClick={() => startTransition(() => setGoalStatus(g.id, "DONE"))}>Mark done</button>
                    <button type="button" onClick={() => startTransition(() => setGoalStatus(g.id, "PAUSED"))}>Pause</button>
                  </>
                ) : (
                  <button type="button" onClick={() => startTransition(() => setGoalStatus(g.id, "ACTIVE"))}>Reactivate</button>
                )}
                <button type="button" onClick={() => remove(g)} disabled={pending}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Sheet title={editing === "new" ? "Add goal" : "Edit goal"} onClose={() => setEditing(null)}>
          <GoalForm goal={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </section>
  );
}

function GoalForm({ goal, onDone }: { goal: GoalView | null; onDone: () => void }) {
  const action = goal ? updateGoal.bind(null, goal.id) : createGoal;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const val = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  const [kind, setKind] = useState(val("kind", goal?.kind ?? "MANUAL"));
  const [type, setType] = useState(val("measuredType", goal?.measuredType ?? "STUDY"));
  const err = state.errors ?? {};

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const unit = TYPES.find((t) => t.value === type)?.unit ?? "hours";
  const storedTarget =
    goal?.targetValue != null
      ? String(goal.measuredType === "STUDY" || goal.measuredType === "WORKOUT" ? goal.targetValue / 60 : goal.targetValue)
      : "";

  // The target is typed in the current type's unit, so changing the type clears it.
  const [target, setTarget] = useState(val("target", storedTarget));

  return (
    <form onSubmit={submitWith(formAction)} className={forms.form}>
      <div className={forms.pills} role="radiogroup" aria-label="Goal kind">
        {(["MANUAL", "MEASURED"] as const).map((k) => (
          <label key={k} className={`${forms.pill} ${kind === k ? forms.pillOn : ""}`}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            {k === "MANUAL" ? "I set the progress" : "Measure from my logs"}
          </label>
        ))}
      </div>

      <label className={forms.field}>
        <span>Title</span>
        <input name="title" autoFocus defaultValue={val("title", goal?.title ?? "")} aria-invalid={!!err.title} />
        {err.title && <em role="alert">{err.title}</em>}
      </label>

      <div className={forms.row}>
        <label className={forms.field}>
          <span>Category (optional)</span>
          <input name="category" defaultValue={val("category", goal?.category ?? "")} aria-invalid={!!err.category} />
          {err.category && <em role="alert">{err.category}</em>}
        </label>
        <label className={forms.field}>
          <span>Deadline (optional)</span>
          <input name="deadline" type="date" defaultValue={val("deadline", goal?.deadline ?? "")} aria-invalid={!!err.deadline} />
          {err.deadline && <em role="alert">{err.deadline}</em>}
        </label>
      </div>

      {kind === "MANUAL" ? (
        <label className={forms.field}>
          <span>Progress (0 to 100)</span>
          <input name="progress" inputMode="numeric" defaultValue={val("progress", goal?.progress != null ? String(goal.progress) : "0")} aria-invalid={!!err.progress} />
          {err.progress && <em role="alert">{err.progress}</em>}
        </label>
      ) : (
        <>
          <div className={forms.row}>
            <label className={forms.field}>
              <span>Measure</span>
              <select
                name="measuredType"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as typeof type);
                  setTarget("");
                }}
                aria-invalid={!!err.measuredType}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {err.measuredType && <em role="alert">{err.measuredType}</em>}
            </label>
            <label className={forms.field}>
              <span>Target ({unit})</span>
              <input name="target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} aria-invalid={!!err.target} />
              {err.target && <em role="alert">{err.target}</em>}
            </label>
          </div>
          <label className={forms.field}>
            <span>Count entries from</span>
            <input name="startDate" type="date" defaultValue={val("startDate", goal?.startDate ?? dayKey(new Date()))} aria-invalid={!!err.startDate} />
            {err.startDate && <em role="alert">{err.startDate}</em>}
          </label>
        </>
      )}

      {err.form && <p role="alert" className={forms.formError}>{err.form}</p>}

      <div className={forms.actions}>
        <button type="button" className={forms.cancel} onClick={onDone}>Cancel</button>
        <button type="submit" className={forms.save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

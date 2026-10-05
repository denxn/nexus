"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createProblem,
  deleteOccurrence,
  deleteProblem,
  logOccurrence,
  setProblemStatus,
  updateProblem,
} from "@/app/actions/problems";
import { initialActionState } from "@/lib/action-state";
import type { ProblemView } from "@/lib/plan/types";
import { toRomeLocalInput } from "@/lib/time";
import forms from "../forms.module.css";
import { Sheet } from "../Sheet";
import styles from "./plan.module.css";

const STATUSES = ["ACTIVE", "IMPROVING", "SOLVED"] as const;

const when = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type Sheets = { kind: "edit"; problem: ProblemView | null } | { kind: "occurrence"; problem: ProblemView } | null;

export function ProblemsPanel({ problems }: { problems: ProblemView[] }) {
  const [sheet, setSheet] = useState<Sheets>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const close = () => setSheet(null);
  const expand = (id: string) => setExpanded((prev) => new Set(prev).add(id));

  return (
    <section>
      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={() => setSheet({ kind: "edit", problem: null })}>
          + Add problem
        </button>
      </div>

      {problems.length === 0 ? (
        <p className={styles.empty}>No problems logged. Naming what holds you back is the first step to fixing it.</p>
      ) : (
        <ul className={styles.list} aria-busy={pending}>
          {problems.map((p) => (
            <li key={p.id} className={`glass ${styles.item} ${p.status === "SOLVED" ? styles.dim : ""}`}>
              <div className={styles.itemHead}>
                <strong>{p.title}</strong>
                <span className={styles.pct} title="Severity">Severity {p.severity}/5</span>
              </div>
              {p.trigger && <p className={styles.meta}>Trigger: {p.trigger}</p>}
              {p.counterPlan && <p className={styles.meta}>Instead: {p.counterPlan}</p>}
              <div className={styles.btns}>
                <select
                  aria-label={`Status of ${p.title}`}
                  value={p.status}
                  onChange={(e) => startTransition(() => setProblemStatus(p.id, e.target.value))}
                  className={styles.select}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setSheet({ kind: "occurrence", problem: p })}>Log occurrence</button>
                <button type="button" onClick={() => setSheet({ kind: "edit", problem: p })}>Edit</button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirm(`Delete "${p.title}" and its occurrences?`) && startTransition(() => deleteProblem(p.id))}
                >
                  Delete
                </button>
              </div>
              <details className={styles.details}>
                <summary>{p.occurrenceCount} {p.occurrenceCount === 1 ? "occurrence" : "occurrences"}</summary>
                {p.occurrences.length === 0 ? (
                  <p className={styles.meta}>None logged.</p>
                ) : (
                  <ul className={styles.occ}>
                    {(expanded.has(p.id) ? p.occurrences : p.occurrences.slice(0, 10)).map((o) => (
                      <li key={o.id}>
                        <span>{when.format(new Date(o.occurredAt))}{o.note && ` · ${o.note}`}</span>
                        <button type="button" onClick={() => startTransition(() => deleteOccurrence(o.id))} aria-label="Delete occurrence">×</button>
                      </li>
                    ))}
                  </ul>
                )}
                {!expanded.has(p.id) && p.occurrences.length > 10 && (
                  <button type="button" className={styles.showAll} onClick={() => expand(p.id)}>
                    Show all ({p.occurrenceCount > p.occurrences.length ? `latest ${p.occurrences.length} of ${p.occurrenceCount}` : p.occurrences.length})
                  </button>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}

      {sheet?.kind === "edit" && (
        <Sheet title={sheet.problem ? "Edit problem" : "Add problem"} onClose={close}>
          <ProblemForm problem={sheet.problem} onDone={close} />
        </Sheet>
      )}
      {sheet?.kind === "occurrence" && (
        <Sheet title={`Log occurrence: ${sheet.problem.title}`} onClose={close}>
          <OccurrenceForm problem={sheet.problem} onDone={close} />
        </Sheet>
      )}
    </section>
  );
}

function ProblemForm({ problem, onDone }: { problem: ProblemView | null; onDone: () => void }) {
  const action = problem ? updateProblem.bind(null, problem.id) : createProblem;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const val = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  const err = state.errors ?? {};

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className={forms.form}>
      <label className={forms.field}>
        <span>What is the problem?</span>
        <input name="title" autoFocus defaultValue={val("title", problem?.title ?? "")} aria-invalid={!!err.title} />
        {err.title && <em role="alert">{err.title}</em>}
      </label>
      <label className={forms.field}>
        <span>Trigger (optional)</span>
        <input name="trigger" defaultValue={val("trigger", problem?.trigger ?? "")} aria-invalid={!!err.trigger} />
        {err.trigger && <em role="alert">{err.trigger}</em>}
      </label>
      <label className={forms.field}>
        <span>What will you do instead? (optional)</span>
        <input name="counterPlan" defaultValue={val("counterPlan", problem?.counterPlan ?? "")} aria-invalid={!!err.counterPlan} />
        {err.counterPlan && <em role="alert">{err.counterPlan}</em>}
      </label>
      <div className={forms.row}>
        <label className={forms.field}>
          <span>Severity (1 to 5)</span>
          <input name="severity" inputMode="numeric" defaultValue={val("severity", String(problem?.severity ?? 3))} aria-invalid={!!err.severity} />
          {err.severity && <em role="alert">{err.severity}</em>}
        </label>
        <label className={forms.field}>
          <span>Status</span>
          <select name="status" defaultValue={val("status", problem?.status ?? "ACTIVE")}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
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

function OccurrenceForm({ problem, onDone }: { problem: ProblemView; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(logOccurrence.bind(null, problem.id), initialActionState);
  const [initialWhen] = useState(() => toRomeLocalInput(new Date()));
  const err = state.errors ?? {};

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className={forms.form}>
      <label className={forms.field}>
        <span>Note (optional)</span>
        <input name="note" autoFocus defaultValue={state.values?.note ?? ""} aria-invalid={!!err.note} />
        {err.note && <em role="alert">{err.note}</em>}
      </label>
      <label className={forms.field}>
        <span>When (Rome time)</span>
        <input name="occurredAt" type="datetime-local" required defaultValue={state.values?.occurredAt ?? initialWhen} aria-invalid={!!err.occurredAt} />
        {err.occurredAt && <em role="alert">{err.occurredAt}</em>}
      </label>
      {err.form && <p role="alert" className={forms.formError}>{err.form}</p>}
      <div className={forms.actions}>
        <button type="button" className={forms.cancel} onClick={onDone}>Cancel</button>
        <button type="submit" className={forms.save} disabled={pending}>{pending ? "Saving…" : "Log it"}</button>
      </div>
    </form>
  );
}

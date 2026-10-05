"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createEntry, updateEntry } from "@/app/actions/entries";
import { initialActionState } from "@/lib/action-state";
import { ENTRY_TYPES, typeMeta, type EntryRow, type EntryTypeName } from "@/lib/entries/meta";
import { shouldOpenQuickLog } from "@/lib/hotkey";
import { toRomeLocalInput } from "@/lib/time";
import styles from "./QuickLog.module.css";

type Ctx = { openNew: (type?: EntryTypeName) => void; openEdit: (entry: EntryRow) => void };
const QuickLogContext = createContext<Ctx | null>(null);

export function useQuickLog(): Ctx {
  const ctx = useContext(QuickLogContext);
  if (!ctx) throw new Error("useQuickLog must be used inside QuickLogProvider");
  return ctx;
}

type Sheet = { open: false } | { open: true; entry: EntryRow | null; nonce: number; type?: EntryTypeName };

export function QuickLogProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<Sheet>({ open: false });

  const openNew = useCallback(
    (type?: EntryTypeName) => setSheet((s) => ({ open: true, entry: null, nonce: (s.open ? s.nonce : 0) + 1, type })),
    [],
  );
  const openEdit = useCallback(
    (entry: EntryRow) =>
      setSheet((s) => ({ open: true, entry, nonce: (s.open ? s.nonce : 0) + 1 })),
    [],
  );
  // A save in flight must not be abandoned: Escape, the backdrop and Cancel are ignored meanwhile.
  const savingRef = useRef(false);
  const onPendingChange = useCallback((pending: boolean) => {
    savingRef.current = pending;
  }, []);
  const finish = useCallback(() => setSheet({ open: false }), []);
  const close = useCallback(() => {
    if (!savingRef.current) setSheet({ open: false });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (sheet.open) return;
      if (shouldOpenQuickLog(e as unknown as Parameters<typeof shouldOpenQuickLog>[0])) {
        e.preventDefault();
        openNew();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet.open, close, openNew]);

  const ctx = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);

  return (
    <QuickLogContext.Provider value={ctx}>
      {children}
      <button type="button" className={styles.fab} onClick={() => openNew()} aria-label="Log an entry (N)">
        +
      </button>
      {sheet.open && (
        <div className={styles.backdrop} onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet.entry ? "Edit entry" : "Log an entry"}
            className={`glass ${styles.sheet}`}
            onClick={(e) => e.stopPropagation()}
          >
            <LogForm key={sheet.nonce} entry={sheet.entry} initialType={sheet.type} onDone={finish} onCancel={close} onPendingChange={onPendingChange} />
          </div>
        </div>
      )}
    </QuickLogContext.Provider>
  );
}

function LogForm({
  entry,
  initialType,
  onDone,
  onCancel,
  onPendingChange,
}: {
  entry: EntryRow | null;
  initialType?: EntryTypeName;
  onDone: () => void;
  onCancel: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const action = entry ? updateEntry.bind(null, entry.id) : createEntry;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [type, setType] = useState<EntryTypeName>(
    (state.values?.type as EntryTypeName | undefined) ?? entry?.type ?? initialType ?? "STUDY",
  );

  // Prefilled once per open: now for a new entry, the entry's own time when editing.
  const [initialWhen] = useState(() =>
    toRomeLocalInput(entry ? new Date(entry.occurredAt) : new Date()),
  );

  // Declared before the success effect so the "not saving" state is reported before the sheet closes.
  useEffect(() => {
    onPendingChange(pending);
    return () => onPendingChange(false);
  }, [pending, onPendingChange]);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const meta = typeMeta(type);
  const err = state.errors ?? {};

  return (
    <form action={formAction} className={styles.form}>
      <h2 className={styles.heading}>{entry ? "Edit entry" : "Log an entry"}</h2>

      <div className={styles.pills} role="radiogroup" aria-label="Entry type">
        {ENTRY_TYPES.map((t) => (
          <label
            key={t.type}
            className={`${styles.pill} ${type === t.type ? styles.pillOn : ""}`}
            style={type === t.type ? { borderColor: t.color, color: t.color } : undefined}
          >
            <input
              type="radio"
              name="type"
              value={t.type}
              checked={type === t.type}
              onChange={() => setType(t.type)}
            />
            {t.name}
          </label>
        ))}
      </div>

      <label className={styles.field}>
        <span>Amount ({meta.unit})</span>
        <input
          name="value"
          inputMode="decimal"
          autoFocus
          defaultValue={state.values?.value ?? (entry ? String(entry.value) : "")}
          aria-invalid={!!err.value}
        />
        {err.value && <em role="alert">{err.value}</em>}
      </label>

      <label className={styles.field}>
        <span>Note (optional)</span>
        <input
          name="label"
          placeholder={meta.placeholder}
          defaultValue={state.values?.label ?? entry?.label ?? ""}
          aria-invalid={!!err.label}
        />
        {err.label && <em role="alert">{err.label}</em>}
      </label>

      <label className={styles.field}>
        <span>When (Rome time)</span>
        <input
          name="occurredAt"
          type="datetime-local"
          required
          defaultValue={state.values?.occurredAt ?? initialWhen}
          aria-invalid={!!err.occurredAt}
        />
        {err.occurredAt && <em role="alert">{err.occurredAt}</em>}
      </label>

      {(err.form || err.type) && (
        <p role="alert" className={styles.formError}>
          {err.form ?? err.type}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className={styles.save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

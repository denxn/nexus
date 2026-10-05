"use client";

import { useState } from "react";
import { parseWeekdayList } from "@/lib/recurrence/weekdays";
import forms from "./forms.module.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The "Repeats" part of the event and to-do forms. Weekday choices are kept in one hidden field
 * ("0,2,4") because the form data reader keeps a single value per name.
 */
export function RepeatFields({
  defaults,
  err,
}: {
  defaults: { repeat: string; interval: string; weekdays: string; until: string };
  err: Record<string, string>;
}) {
  const [repeat, setRepeat] = useState(defaults.repeat || "NONE");
  const [weekdays, setWeekdays] = useState<number[]>(parseWeekdayList(defaults.weekdays));
  const unit = repeat === "DAILY" ? "days" : repeat === "WEEKLY" ? "weeks" : "months";

  const toggle = (d: number) => setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <>
      <label className={forms.field}>
        <span>Repeats</span>
        <select name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
          <option value="NONE">Does not repeat</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </label>

      {repeat !== "NONE" && (
        <>
          <div className={forms.row}>
            <label className={forms.field}>
              <span>Every (number of {unit})</span>
              <input name="repeatInterval" inputMode="numeric" defaultValue={defaults.interval || "1"} aria-invalid={!!err.repeatInterval} />
              {err.repeatInterval && <em role="alert">{err.repeatInterval}</em>}
            </label>
            <label className={forms.field}>
              <span>Until (optional)</span>
              <input name="repeatUntil" type="date" defaultValue={defaults.until} aria-invalid={!!err.repeatUntil} />
              {err.repeatUntil && <em role="alert">{err.repeatUntil}</em>}
            </label>
          </div>

          {repeat === "WEEKLY" && (
            <div className={forms.field} role="group" aria-label="Repeat on">
              <span>On (none selected means the same weekday as the first one)</span>
              <div className={forms.pills}>
                {DAYS.map((name, d) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={weekdays.includes(d)}
                    className={`${forms.pill} ${weekdays.includes(d) ? forms.pillOn : ""}`}
                    onClick={() => toggle(d)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <input type="hidden" name="repeatWeekdays" value={[...weekdays].sort((a, b) => a - b).join(",")} />
              {err.repeatWeekdays && <em role="alert">{err.repeatWeekdays}</em>}
            </div>
          )}
        </>
      )}
    </>
  );
}

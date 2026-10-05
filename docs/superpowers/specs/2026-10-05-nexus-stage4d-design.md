# Nexus: Stage 4d design (Recurring items and reminders)

Date: 2026-10-05. Last Stage 4 sub-stage. Earlier Global Constraints apply: Rome day keys (1970 to 2100), `requireSession()` first in every Server Action, Zod on every input including ids, saves through `withSaveErrors`, vitest under TZ=UTC, nothing deployed.

## Purpose

Events and to-dos that repeat, and in-app reminders. Success means weekly lectures, daily habits and monthly chores are entered once, show up in the right places, and Dennis is reminded of what is due today and of events about to start while Nexus is open.

## Part A: Recurrence

Rule fields (on `Event` and `Todo`): `repeat` NONE | DAILY | WEEKLY | MONTHLY (default NONE), `repeatInterval` 1 to 99 (default 1), `repeatWeekdays` (ints 0 = Monday to 6 = Sunday; WEEKLY only; empty means the weekday of the anchor), `repeatUntil` (optional day key, not before the anchor). `Todo` also keeps `repeatMonthDay` (1 to 31) so a monthly rule created on the 31st does not drift after clamping.

Occurrences (pure, `lib/recurrence/`): the anchor is an event's start day or a to-do's due day. DAILY: days with `daysBetween(anchor, d) % interval == 0`. WEEKLY: days whose weekday is in the set and whose Monday-start week is a multiple of `interval` weeks from the anchor's week. MONTHLY: every `interval` months from the anchor's month on the anchor's day of month (or `repeatMonthDay`), clamped to the month's last day. Occurrences are never before the anchor, never after `repeatUntil`, and exclude `skippedDays`.

**Events** are stored once and expanded on demand for the range being shown, at the same Rome wall-clock start (and end) every time, so DST never shifts them. Editing changes the whole series (the form shows the series' own start date). Deleting a recurring occurrence offers "Skip this day" (adds the day to `skippedDays`), "Delete the series" or Cancel. A new action `skipEventDay(id, day)`.

**To-dos** roll forward. Ticking an open recurring to-do (in the Plan tab, the calendar agenda or the Today card): in one transaction create a completed copy (same title, priority, links, the old `dueDate`, `done` true, `doneAt` now, `repeat` NONE) and move the original to its next occurrence, which is the first occurrence strictly after `max(oldDue, today)`; when there is none (past `repeatUntil`) the original becomes done instead. A new action `skipTodo(id)` rolls forward without a completed copy. A recurring to-do requires a due date. Unticking a completed copy just reopens that one item.

Forms: a "Repeats" section (Does not repeat, Daily, Weekly with weekday pills, Monthly; Every N; Until). Lists and agendas show a "↻" tag with a plain-words label ("Weekly on Mon, Wed", "Every 2 weeks until 5 Nov").

## Part B: Reminders

- `Event.remindMinutes` optional: 5, 10, 15, 30, 60 or 1440.
- **Today card** on the dashboard: overdue open to-dos, to-dos due today (tickable, with skip for recurring ones), today's events with times and a state (past, now, later), and an "Enable notifications" button.
- **Scheduler** (client, mounted for the whole app): receives the next 48 hours of reminder occurrences (recurring events expanded), sets timers, and when one is due shows an in-app notice and, if the user granted permission, a browser notification. Each (event, start instant) fires once: fired keys are remembered in `localStorage`. On load, reminders whose time passed in the last 60 seconds and whose event has not started yet fire immediately. It only works while a Nexus tab is open (no server push, email or background service).

## Architecture

Pure tested modules: `lib/recurrence/rule.ts` (`expandOccurrences`, `nextOccurrence`, `weekdayOf`), `lib/recurrence/label.ts` (`repeatLabel`), `lib/recurrence/events.ts` (`expandEvent`: an event row to occurrence instants), `lib/reminders/due.ts` (`upcomingReminders`). Zod: event and to-do schemas gain the rule fields (weekdays as a comma list from a hidden field). One additive migration (new columns with defaults only). `getCalendarData` expands recurring events; `getTodos` and the views carry the rule; `app/actions/todos.ts` gains the roll-forward in `toggleTodo` and `skipTodo`; `app/actions/events.ts` gains `skipEventDay`.

## Testing

Unit tests first: every rule kind; DST days (2026-03-29, 2026-10-25) for events; monthly on the 31st and on 29 February; every 2 weeks across a year boundary; `until` (inclusive); skipped days; an anchor in the future; empty weekday sets; `nextOccurrence` including none; labels; reminder windows (exactly now, 60 seconds late, after the start, a 1440-minute reminder, recurring expansion); schema bounds (interval 0 and 100, weekday 7, until before the anchor, repeat without a due date). Live checks on the demo data: create a weekly event and see it on every matching day across month navigation, edit the series, skip one day, delete the series; create a daily and a monthly to-do, tick them (history gets a completed copy, the original rolls to the right date), skip; the Today card; a reminder firing in the page (a short-lead test event) and not firing twice after a reload. A Playwright test covers the recurring event, the recurring to-do roll-forward and the Today card.

## Delivery

One branch (`feat/stage4d`), one migration (columns only), a fresh-reviewer pass, then merge.

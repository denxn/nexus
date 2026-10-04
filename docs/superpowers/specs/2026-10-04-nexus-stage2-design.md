# Nexus: Stage 2 design (Plan, Calendar, This Week)

Date: 2026-10-04. Builds on `2026-10-04-nexus-stage1-design.md` (merged). Everything in Stage 1's Global Constraints still applies: Europe/Rome day cut, Zod on every Server Action, `requireSession()` first in every action, saves through `withSaveErrors`, secrets only in env files.

## Purpose

Add the planning half of Nexus, following the mockup: a **Plan** area (Goals, Problems, To-do), a **Calendar** with a day agenda, and a **This Week** grid, plus dashboard previews of each. Success means Dennis can record what he is working toward, what holds him back and what he must do, see all of it next to his logged data, and add or tick things off in a few taps.

## Scope

In: Goal, Problem (with occurrences), Todo and Event tables; `/plan` with three tabs; `/calendar`; This Week grid; dashboard cards for Goals, This Week and a mini Calendar.

Out (YAGNI): recurring events, drag-and-drop, reminders or notifications, subtasks, imports (Events carry `source`/`externalId` only so Google Calendar can be added later), correlation and AI brief (Stage 3).

## Data model

Date-only fields (`deadline`, `startDate`, `dueDate`) are stored as `String` day keys `"YYYY-MM-DD"` (Rome days), so they never shift with timezones.

`Goal`
- `id`, `title` (1 to 80 chars), `category` (optional, up to 30 chars), `deadline` (optional day key), `status`: ACTIVE | DONE | PAUSED, `createdAt`
- `kind`: MANUAL | MEASURED
- MANUAL: `progress` Int 0 to 100, set by the user
- MEASURED: `measuredType` (WORKOUT | STUDY | SLEEP | MEAL; not MOOD), `targetValue` Float > 0, `startDate` day key. Units match `Entry` (minutes, minutes, hours, kcal); the form shows hours for WORKOUT and STUDY and converts to minutes.
- Measured progress = sum of matching `Entry.value` with Rome day >= `startDate`, divided by `targetValue`, as a whole-number percent, uncapped. It is computed, never stored. There is no end date; the user marks the goal DONE.

`Problem`
- `id`, `title` (1 to 80), `trigger` (optional, up to 120), `counterPlan` (optional, up to 160), `severity` Int 1 to 5, `status`: ACTIVE | IMPROVING | SOLVED, `createdAt`
- `ProblemOccurrence`: `id`, `problemId` (cascade delete), `occurredAt` DateTime, `note` (optional, up to 160)

`Todo`
- `id`, `title` (1 to 120), `dueDate` (optional day key), `priority`: LOW | MEDIUM | HIGH (default MEDIUM), `done` Boolean, `doneAt` DateTime?, `goalId?`, `problemId?` (both SetNull on delete), `createdAt`

`Event`
- `id`, `title` (1 to 80), `startsAt` DateTime, `endsAt` DateTime? (must be after `startsAt`), `source` (default MANUAL), `externalId?`, unique on (`source`, `externalId`)

## Pages

- `/plan?tab=goals|problems|todo` (default goals). `/goals` redirects to `/plan?tab=goals`, `/flaws` to `/plan?tab=problems`. Forms open in a sheet like quick-log; add, edit and delete are all available.
  - **Goals tab:** active goals with progress bars (the bar caps at 100%, the label shows the real percent), deadline, and an "overdue" flag when the deadline has passed and the goal is ACTIVE. Done and paused goals are behind a "Show done and paused" toggle.
  - **Problems tab:** title, severity, status, occurrence count, trigger and counter-plan. A "Log occurrence" button adds one (now, plus an optional note). Occurrences are listed per problem, newest first, and can be deleted.
  - **To-do tab:** open todos sorted overdue first, then by due date, then by priority (HIGH first), with undated last. A checkbox toggles done (setting or clearing `doneAt`). Completed todos are collapsed under "Completed". A linked Goal or Problem shows as a small tag.
- `/calendar?month=YYYY-MM&day=YYYY-MM-DD` (defaults to the current month and today). A month grid (Monday first) with small markers per day (event, todo due, entries logged) and a day agenda listing, in order: Events (with times), todos due that day (tickable), and a "Logged" summary of that day's entries. "+ Add" creates an Event (title, date, start time, optional end time, Rome time).
- **Dashboard** gains three cards: **Goals** (up to 5 ACTIVE goals, soonest deadline first, then newest), **This Week**, and a **mini Calendar** (current month plus today's agenda). Links go to `/plan` and `/calendar`.

## This Week grid

Monday to Sunday of the current Rome week; rows Workout, Study, Sleep, Calories, Mood; each cell has three states computed from `Entry` and the Stage 1 targets, never stored:
- **none:** nothing logged (future days are always none, drawn faded)
- **partial:** something logged but the target is not met
- **met:**
  - Workout: at least one workout
  - Study: study minutes >= daily target
  - Sleep: sleep hours >= daily target
  - Calories: kcal within 90% to 110% of the daily target
  - Mood: any mood logged (there is no mood target)

## Architecture

- Pure, unit-tested modules in `lib/plan/`: `goalProgress`, `weekGrid`, `monthMatrix`, `todoOrder`, plus Zod schemas per entity. DB access stays in thin query files and Server Actions (`app/actions/goals.ts`, `problems.ts`, `todos.ts`, `events.ts`). Dashboard cards and pages are Server Components; forms reuse the sheet pattern.
- Reuse `lib/time` (`dayKey`, `addDays`, `weekStartKey`, `romeLocalToDate`, `toRomeLocalInput`); add what Stage 2 needs there (month math) with tests.
- The Prisma schema change ships as one new migration.

## Validation and errors

Zod bounds as listed above; day keys must be real dates; `endsAt` must be after `startsAt`; a measured goal needs `measuredType`, `targetValue` and `startDate`, a manual goal needs `progress`. Errors appear inline and keep typed values; a missing record on edit shows "That entry no longer exists." (same pattern as Stage 1).

## Testing

Unit tests first for all pure logic: measured progress (no entries, over target, entries before `startDate` ignored, Rome day boundaries and DST), the week grid in every state including calories at 89%/90%/110%/111%, the month matrix (31-day, 28-day, leap February, weeks starting on Sunday and Monday), todo ordering (overdue, undated, priority ties), and schema bounds. The Playwright smoke test is extended: add a goal, a to-do and an event, and see each on the dashboard and calendar. Everything is verified live on the local database; nothing is deployed.

## Delivery

One branch (`feat/stage2`), one migration, a plan with tasks in dependency order (schema and pure logic first, then actions, then pages, then dashboard cards, then smoke test), reviewed by a fresh reviewer before merge.

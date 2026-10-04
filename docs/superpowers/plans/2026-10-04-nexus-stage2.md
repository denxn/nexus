# Nexus Stage 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Goals, Problems, To-do (`/plan`), Events and a Calendar (`/calendar`), a This Week grid, and dashboard previews, per the Stage 2 spec.

**Architecture:** Same patterns as Stage 1. Pure tested logic in `lib/plan/` and `lib/time`; thin Server Actions (each starting with `requireSession()`, saving through `withSaveErrors`); Server Component pages with sheet-based forms.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + Postgres, Zod 4, Vitest (runs in TZ=UTC), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-nexus-stage2-design.md`

## Global Constraints

- Europe/Rome day cut; date-only fields are `String` day keys `"YYYY-MM-DD"`.
- Every Server Action: `await requireSession()` first, Zod validation, `withSaveErrors` around the DB write, `revalidatePath` on success.
- Bounds: Goal title 1-80, category <=30, progress 0-100, targetValue > 0; Problem title 1-80, trigger <=120, counterPlan <=160, severity 1-5, occurrence note <=160; Todo title 1-120; Event title 1-80, `endsAt` after `startsAt`.
- Measured goal types: WORKOUT, STUDY, SLEEP, MEAL (not MOOD). Form shows hours for WORKOUT/STUDY, stored in minutes.
- Measured progress = sum of matching entries with Rome day >= `startDate` / `targetValue`, whole-number percent, uncapped; bar caps at 100%.
- Week grid states none/partial/met; calories met within 90% to 110% of target inclusive; mood met when logged; future days none.
- Todo order: overdue first, then by due date, then priority HIGH>MEDIUM>LOW, undated last.
- Deleting a Goal or Problem sets linked Todo `goalId`/`problemId` to null; deleting a Problem cascades its occurrences.
- Out of scope: recurring events, drag-drop, reminders, subtasks, imports, Stage 3 features. Nothing is deployed.

## Review Focus

- A measured goal with no entries shows 0%; entries before `startDate` are ignored; a 23:30 Rome entry counts on its Rome day (Task 3).
- Month grid is right for leap February, a 28-day February starting Monday, and a month starting on Sunday (Task 2).
- Invalid day keys such as `2026-02-30` and malformed `?month`/`?day`/`?tab` params fall back safely, never crash (Tasks 2, 6, 9).
- An event whose end is not after its start is rejected inline (Task 6).
- A done todo with a past due date is not shown overdue; undated todos sort last (Task 5).
- Deleting a goal that has linked todos keeps the todos (Task 7, verified live).

---

### Task 1: Schema and migration

**Files:** Modify `prisma/schema.prisma`; Create the migration via Prisma.

**Interfaces:** Produces Prisma models `Goal`, `Problem`, `ProblemOccurrence`, `Todo`, `Event` and enums `GoalKind` (MANUAL|MEASURED), `GoalStatus` (ACTIVE|DONE|PAUSED), `ProblemStatus` (ACTIVE|IMPROVING|SOLVED), `Priority` (LOW|MEDIUM|HIGH), per the spec's data model; `Event` has `@@unique([source, externalId])` reusing the existing `Source` enum.

- [ ] **Step 1:** Add the models and enums to `prisma/schema.prisma` exactly per the spec (day keys as `String`, relations with `onDelete: SetNull` for Todo links and `Cascade` for occurrences, `@@index` on Todo.dueDate and Event.startsAt).
- [ ] **Step 2:** Run `npx prisma validate` and `npx prisma generate`. Expected: valid, client generated.
- [ ] **Step 3:** Run `npx prisma migrate dev --name stage2_plan` against the local dev DB. Expected: migration applied.
- [ ] **Step 4:** Commit `feat: stage 2 schema`.

### Task 2: Month and day-key helpers

**Files:** Modify `lib/time.ts`; Test `lib/time.test.ts`.

**Interfaces:** Produces `isDayKey(s: string): boolean` (real calendar date), `monthKeyOf(day: string): string` ("YYYY-MM"), `addMonths(month: string, n: number): string`, `monthMatrix(month: string): { day: string; inMonth: boolean }[][]` (Monday-first weeks covering the month, 4 to 6 rows), `parseMonth(v: string | undefined): string` and `parseDay(v: string | undefined): string | null` (valid value or fallback: current Rome month / null).

- [ ] **Step 1:** Write failing tests: `isDayKey("2026-02-30")` false, `("2028-02-29")` true, `("2026-13-01")` false, `("x")` false; `monthMatrix("2026-02")` has 4 rows with first cell `2026-02-02`... verify against a real calendar: Feb 2026 starts on a Sunday so first cell is `2026-01-26` and `inMonth` false for it; `monthMatrix("2027-02")` (starts Monday, 28 days) is exactly 4 rows from `2027-02-01`; `monthMatrix("2028-02")` includes `2028-02-29` inMonth; `addMonths("2026-12", 1)` is `"2027-01"`, `addMonths("2026-01", -1)` is `"2025-12"`; `parseMonth("junk")` returns the current Rome month; `parseDay("2026-02-30")` is null.
- [ ] **Step 2:** Run `npx vitest run lib/time.test.ts`. Expected: FAIL (not defined).
- [ ] **Step 3:** Implement the five helpers with the signatures above using UTC date arithmetic like the existing key helpers.
- [ ] **Step 4:** Run tests. Expected: PASS. Commit `feat: month matrix and day-key helpers`.

### Task 3: Goal progress

**Files:** Create `lib/plan/goalProgress.ts`; Test `lib/plan/goalProgress.test.ts`.

**Interfaces:** Consumes `dayKey` from `lib/time`, `EntryLike` from `lib/stats`. Produces `type GoalLike = { kind: "MANUAL"|"MEASURED"; progress: number | null; measuredType: "WORKOUT"|"STUDY"|"SLEEP"|"MEAL"|null; targetValue: number | null; startDate: string | null }` and `goalProgress(goal: GoalLike, entries: EntryLike[]): { value: number; pct: number }` (`value` is the measured sum, or the manual percent).

- [ ] **Step 1:** Write failing tests: manual goal with progress 40 gives pct 40; measured study goal (target 12000 min since 2026-10-01) with entries 600 + 300 on/after start gives value 900, pct 8 (rounded); an entry on 2026-09-30 is ignored; no entries gives pct 0; over target gives pct 125 (uncapped); an entry at `2026-10-01T21:30:00Z` (23:30 Rome on 10-01) counts for start 2026-10-01 while `2026-09-30T21:30:00Z` (23:30 Rome on 09-30) does not; entries of another type are ignored; measured goal with `targetValue` 0 gives pct 0 (no NaN).
- [ ] **Step 2:** Run the test file. Expected: FAIL.
- [ ] **Step 3:** Implement `goalProgress` as a pure function.
- [ ] **Step 4:** Run. Expected: PASS. Commit `feat: goal progress`.

### Task 4: Week grid

**Files:** Create `lib/plan/weekGrid.ts`; Test `lib/plan/weekGrid.test.ts`.

**Interfaces:** Consumes `DayStats`, `Targets`, `weekStartKey`, `addDays`. Produces `type CellState = "none"|"partial"|"met"`, `type WeekRow = { metric: "workout"|"study"|"sleep"|"calories"|"mood"; cells: { day: string; state: CellState; future: boolean }[] }` and `weekGrid(stats: DayStats[], targets: Targets, todayKey: string): WeekRow[]` (five rows in that order, 7 cells Monday to Sunday; `stats` may lack some days, which are `none`).

- [ ] **Step 1:** Write failing tests: workout 1 entry is met, 0 is none; study 239 min is partial, 240 met; sleep 7 h partial, 8 met; calories 2520 (90%) met, 2519 partial, 3080 (110%) met, 3081 partial, 0 none; mood logged is met, null is none; a future day (after `todayKey`) is `none` with `future: true` even if stats exist; a day missing from `stats` is none.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement per the Global Constraints rules.
- [ ] **Step 4:** Run. Expected: PASS. Commit `feat: week grid logic`.

### Task 5: Todo ordering

**Files:** Create `lib/plan/todoOrder.ts`; Test `lib/plan/todoOrder.test.ts`.

**Interfaces:** Produces `type TodoLike = { id: string; done: boolean; dueDate: string | null; priority: "LOW"|"MEDIUM"|"HIGH" }`, `isOverdue(t: TodoLike, todayKey: string): boolean` (false when done or undated) and `orderTodos<T extends TodoLike>(todos: T[], todayKey: string): { open: T[]; completed: T[] }`.

- [ ] **Step 1:** Write failing tests: overdue open todos come before due-today before future before undated; same due date sorts HIGH, MEDIUM, LOW; equal everything keeps input order (stable); a done todo with a past date is not overdue and lands in `completed`; undated open todos sort last.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS. Commit `feat: todo ordering`.

### Task 6: Zod schemas for the plan entities

**Files:** Create `lib/plan/schemas.ts`; Test `lib/plan/schemas.test.ts`.

**Interfaces:** Consumes `isDayKey`, `romeLocalToDate`. Produces `goalSchema`, `problemSchema`, `occurrenceSchema`, `todoSchema`, `eventSchema` (Zod; form-data friendly: blank strings become undefined, numbers coerce, decimal comma accepted). `goalSchema` is a discriminated union on `kind`; for MEASURED a `targetHours` field (WORKOUT/STUDY) is converted to `targetValue` in minutes by the schema transform, while SLEEP/MEAL use `targetValue` directly. `eventSchema` takes `title`, `date` (day key), `startTime` ("HH:mm"), `endTime?` and outputs `{title, startsAt: Date, endsAt?: Date}`.

- [ ] **Step 1:** Write failing tests: valid manual goal passes; manual goal with progress 101 fails; measured STUDY goal with `targetHours: "10"` outputs `targetValue` 600; measured goal with measuredType MOOD fails; measured goal without startDate fails; `startDate: "2026-02-30"` fails; problem severity 0 and 6 fail, 3 passes; todo with title of 121 chars fails; todo `dueDate` blank becomes undefined; event with `date: "2026-10-05"`, `startTime: "09:00"`, `endTime: "10:30"` gives startsAt `2026-10-05T07:00:00.000Z` and endsAt `...08:30:00.000Z` (Rome summer); `endTime` equal to or before `startTime` fails with an error on `endTime`; `date: "2026-02-30"` fails.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the schemas per the Interfaces and Global Constraints.
- [ ] **Step 4:** Run. Expected: PASS. Commit `feat: plan entity schemas`.

### Task 7: Plan page shell and Goals tab

**Files:** Create `app/(app)/plan/page.tsx` (replace the placeholder), `app/(app)/goals/page.tsx` and `app/(app)/flaws/page.tsx` (redirects), `app/actions/goals.ts`, `lib/plan/queries.ts`, `components/plan/PlanTabs.tsx`, `components/plan/GoalsPanel.tsx`, `components/plan/Sheet.tsx` (reusable sheet extracted from the QuickLog pattern), CSS modules.

**Interfaces:** Consumes `goalSchema`, `goalProgress`, `withSaveErrors`, `requireSession`, `ActionState`. Produces actions `createGoal(prev, formData)`, `updateGoal(id, prev, formData)`, `deleteGoal(id)`, `setGoalStatus(id, status)`; `Sheet` component `({ title, onClose, children })`; query `getGoals(): Promise<GoalView[]>` returning each goal with computed `{ value, pct }` and `overdue`; `/plan?tab=` parsed by `parseTab(v): "goals"|"problems"|"todo"` (junk falls back to goals).

- [ ] **Step 1:** Write a failing test `lib/plan/tab.test.ts` for `parseTab` ("problems", "todo", "goals" accepted; "x", undefined, array fall back to "goals").
- [ ] **Step 2:** Run it. Expected: FAIL. Implement `parseTab` in `lib/plan/tab.ts`; run. Expected: PASS.
- [ ] **Step 3:** Implement actions, query, `Sheet`, `PlanTabs` and `GoalsPanel` (progress bars cap at 100% with real percent label, deadline, overdue flag, status toggle, "Show done and paused", add/edit/delete). `/goals` and `/flaws` redirect to the right tab.
- [ ] **Step 4:** Verify live in the browser pane: add a manual goal and a measured study goal; log a study entry; the measured percent moves; edit and delete work; invalid input shows inline errors.
- [ ] **Step 5:** Run the whole suite and `npx tsc --noEmit`. Commit `feat: plan page and goals`.

### Task 8: Problems tab

**Files:** Create `app/actions/problems.ts`, `components/plan/ProblemsPanel.tsx`; Modify `lib/plan/queries.ts`, `app/(app)/plan/page.tsx`.

**Interfaces:** Consumes `problemSchema`, `occurrenceSchema`, `Sheet`. Produces actions `createProblem`, `updateProblem(id, ...)`, `deleteProblem(id)`, `setProblemStatus(id, status)`, `logOccurrence(problemId, prev, formData)`, `deleteOccurrence(id)`; query `getProblems()` with occurrence count and the latest occurrences.

- [ ] **Step 1:** Implement actions and panel (title, severity, status, trigger, counter-plan, occurrence count, "Log occurrence" sheet with optional note, occurrences listed newest first with delete).
- [ ] **Step 2:** Verify live: create a problem, log two occurrences, delete one, change status; deleting the problem removes its occurrences.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: problems tab`.

### Task 9: To-do tab

**Files:** Create `app/actions/todos.ts`, `components/plan/TodoPanel.tsx`; Modify `lib/plan/queries.ts`, `app/(app)/plan/page.tsx`.

**Interfaces:** Consumes `todoSchema`, `orderTodos`, `isOverdue`. Produces actions `createTodo`, `updateTodo(id, ...)`, `deleteTodo(id)`, `toggleTodo(id, done: boolean)` (sets or clears `doneAt`); query `getTodos()`; optional goal/problem selects in the form populated from existing goals and problems.

- [ ] **Step 1:** Implement actions and panel (ordered open list with overdue flags, checkbox toggle, "Completed" collapsed, goal/problem tags, add/edit/delete).
- [ ] **Step 2:** Verify live: create dated, undated and overdue todos and see the order; tick one and it moves to Completed; delete a goal that has a linked todo and the todo remains without its tag.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: to-do tab`.

### Task 10: Calendar page

**Files:** Create `app/(app)/calendar/page.tsx` (replace placeholder), `app/actions/events.ts`, `lib/plan/calendar.ts`, `components/calendar/MonthGrid.tsx`, `components/calendar/DayAgenda.tsx`, `components/calendar/EventSheet.tsx`, CSS modules.

**Interfaces:** Consumes `monthMatrix`, `parseMonth`, `parseDay`, `eventSchema`, `Sheet`, `dayKey`. Produces actions `createEvent`, `updateEvent(id, ...)`, `deleteEvent(id)`; `getCalendarData(month: string): Promise<{ markers: Record<string, { event: boolean; todo: boolean; logged: boolean }>; events: EventView[]; todos: TodoView[]; entries: EntryRow[] }>` (covering the visible matrix range); the page reads `?month=` and `?day=` (invalid values fall back; a `day` outside the month is allowed and shows its agenda).

- [ ] **Step 1:** Write a failing test `lib/plan/calendar.test.ts` for a pure `buildMarkers(days: string[], events, todos, entries)` returning the marker map (event on its Rome start day, todo on its due day when not done, logged when any entry exists that Rome day); then implement it. Expected: FAIL then PASS.
- [ ] **Step 2:** Implement the page: month navigation (prev/next via `?month=`), grid with markers and the selected day highlighted, agenda in order (events with times, todos due with tick, "Logged" summary), "+ Add" event sheet, edit/delete events.
- [ ] **Step 3:** Verify live: add an event, see its marker and agenda entry; month navigation across a year boundary; `?month=junk` and `?day=2026-02-30` do not crash.
- [ ] **Step 4:** Suite and `tsc`. Commit `feat: calendar and events`.

### Task 11: Dashboard cards

**Files:** Create `components/GoalsCard.tsx`, `components/WeekGridCard.tsx`, `components/MiniCalendar.tsx`; Modify `app/(app)/page.tsx`.

**Interfaces:** Consumes `getGoals`, `weekGrid`, `getCalendarData`, `monthMatrix`. Produces the three cards, wired into the dashboard under the stat cards; Goals shows up to 5 ACTIVE goals (soonest deadline first, then newest) with bars; This Week renders the dot grid with the three states and faded future days; the mini calendar shows the current month with markers plus today's agenda; each card links to `/plan` or `/calendar`.

- [ ] **Step 1:** Write a failing test for `selectDashboardGoals(goals, limit)` in `lib/plan/dashboardGoals.test.ts` (only ACTIVE; deadline ascending with undated last; ties newest first; limit 5), then implement. Expected: FAIL then PASS.
- [ ] **Step 2:** Implement the three cards and wire them into the page (fetch in parallel with the existing queries).
- [ ] **Step 3:** Verify live at phone width: all cards render with an empty database and with seeded data; no console errors; layout holds.
- [ ] **Step 4:** Suite and `tsc`. Commit `feat: dashboard goals, this week and calendar cards`.

### Task 12: Smoke test extension and README

**Files:** Modify `e2e/smoke.spec.ts` (or add `e2e/plan.spec.ts`), `README.md`.

**Interfaces:** Consumes the running app via `playwright.config.ts` (port 3200, throwaway credentials).

- [ ] **Step 1:** Add a Playwright test: log in, add a goal "e2e goal" on `/plan`, add a to-do "e2e todo due today", add an event "e2e event" on `/calendar` for today; see the goal on the dashboard Goals card, the event and todo in today's agenda; delete all three so the run leaves no data.
- [ ] **Step 2:** Run `npx playwright test`. Expected: all PASS.
- [ ] **Step 3:** Update `README.md` with the Plan and Calendar pages. Run `npx vitest run` and `npx tsc --noEmit`. Commit `test: stage 2 smoke test and README`.

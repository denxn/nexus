# Nexus Stage 4d Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recurring events and to-dos plus in-app reminders, per the Stage 4d spec.

**Architecture:** Pure recurrence and reminder logic; additive columns; expansion on read for events; roll-forward with a completed copy for to-dos; client scheduler fed by the server.

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, Vitest (TZ=UTC), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-nexus-stage4d-design.md`

## Global Constraints

- Weekday numbering 0 = Monday to 6 = Sunday; interval 1 to 99; reminder minutes 5, 10, 15, 30, 60, 1440; recurring to-dos need a due date; `repeatUntil` is inclusive and not before the anchor.
- Event occurrences keep the Rome wall-clock start and end; never before the anchor; skipped days excluded.
- To-do roll-forward: next = first occurrence strictly after `max(oldDue, today)`; completed copy keeps the old due date; no next means the original becomes done.
- Reminders fire once per (event id, start instant); only while a tab is open.
- Standing rules: `requireSession()` first, ids through `parseId`, `withSaveErrors`, existing behavior unchanged for rows with `repeat` NONE. Nothing deployed.

## Review Focus

- DST days, month clamping (31st, Feb 29), biweekly across a year boundary (Task 1).
- Ticking a recurring to-do twice quickly never creates two copies or skips an occurrence (Task 3).
- A non-recurring event/to-do behaves exactly as before in every list, the calendar and the score (Tasks 3, 4).
- A reminder never fires twice for the same occurrence, including after a reload (Task 5).

---

### Task 1: Recurrence logic

**Files:** Create `lib/recurrence/rule.ts`, `label.ts`, `events.ts` and tests.

**Interfaces:** `type Rule = { repeat: "NONE"|"DAILY"|"WEEKLY"|"MONTHLY"; interval: number; weekdays: number[]; until: string | null; monthDay: number | null }`; `weekdayOf(day: string): number`; `expandOccurrences(rule: Rule, anchor: string, from: string, to: string, skipped?: string[]): string[]`; `nextOccurrence(rule: Rule, anchor: string, after: string, skipped?: string[]): string | null`; `repeatLabel(rule: Rule): string`; `expandEvent(ev: { startsAt: Date; endsAt: Date | null; skippedDays: string[] } & Rule, fromDay: string, toDay: string): { day: string; startsAt: Date; endsAt: Date | null }[]`.

- [ ] **Step 1:** Write failing tests per the spec's Testing section. **Step 2:** Run, expect FAIL. **Step 3:** Implement. **Step 4:** Run, expect PASS. Commit `feat: recurrence logic`.

### Task 2: Reminder logic

**Files:** Create `lib/reminders/due.ts` and test.

**Interfaces:** `upcomingReminders(items: { id: string; title: string; startsAt: Date; remindMinutes: number | null }[], now: Date, horizonMs: number): { key: string; title: string; fireAt: Date; startsAt: Date }[]` (items with a reminder whose fire time is from 60 s before `now` to `now + horizon` and whose start is not before `now`; key `${id}:${startsAt.toISOString()}`; sorted by fire time).

- [ ] **Step 1-4:** failing tests (exactly now, 60 s late included, 61 s late excluded, already started excluded, no remindMinutes excluded, horizon edge, 1440, sorting), implement, pass. Commit `feat: reminder logic`.

### Task 3: Data, validation and actions

**Files:** Modify `prisma/schema.prisma`, `lib/plan/schemas.ts` (+ tests), `app/actions/events.ts`, `app/actions/todos.ts`, `lib/plan/queries.ts`, `lib/plan/types.ts`; create migration.

**Interfaces:** enum `Repeat`; columns per the spec; schemas parse `repeat`, `repeatInterval`, `repeatWeekdays` (comma list), `repeatUntil`, `remindMinutes`; `skipEventDay(id, day)`, `skipTodo(id)`, `toggleTodo` roll-forward.

- [ ] **Step 1:** Failing schema tests (interval 0/100, weekday 7, until before the anchor, repeat without a due date, valid combos, defaults). **Step 2:** schema + migration (diff + deploy) + actions + views. **Step 3:** suite, `tsc`. Commit `feat: recurrence data, validation and actions`.
- [ ] **Step 4:** Live: tick a daily and a monthly to-do (copy created, original rolled), tick an overdue one, skip, `until` exhausted, rapid double tick.

### Task 4: Calendar expansion and forms

**Files:** Modify `getCalendarData`, `components/calendar/DayAgenda.tsx`, `components/plan/TodoPanel.tsx`, create `components/RepeatFields.tsx`.

- [ ] **Step 1:** Expand recurring events into markers and agenda; EventView carries series fields; forms get RepeatFields and the remind select; tags and the delete/skip sheet. **Step 2:** Live checks across month navigation, edit series, skip day, delete series, non-recurring unchanged. **Step 3:** suite, `tsc`. Commit `feat: recurring events and to-dos in the UI`.

### Task 5: Today card and reminders

**Files:** Create `lib/reminders/queries.ts`, `components/TodayCard.tsx`, `components/ReminderScheduler.tsx`, `components/NotifyButton.tsx`; modify `app/(app)/layout.tsx`, `app/(app)/page.tsx`.

- [ ] **Step 1:** Implement. **Step 2:** Live: Today card contents, a short-lead event fires once (and not again after reload), notification button states. Commit `feat: today card and reminders`.

### Task 6: End-to-end and README

- [ ] Playwright for a recurring event, a recurring to-do roll-forward and the Today card; README; full suite; commit `test: recurrence smoke test and README`.

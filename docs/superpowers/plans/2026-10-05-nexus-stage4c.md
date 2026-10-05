# Nexus Stage 4c Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notes: a `/notes` page and calendar integration per the Stage 4c spec.

**Architecture:** Pure `lib/notes/` modules; Prisma `Note` model with one migration; Server Actions with the standard guards; shared `NoteForm`; calendar markers and agenda extended.

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, Vitest (TZ=UTC), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-nexus-stage4c-design.md`

## Global Constraints

- Body 1 to 5000 chars (trimmed ends, inner newlines kept); title up to 80; `day` a real Rome day key with year 1970 to 2100; 20 notes per page; preview 140 chars; search `q` up to 100 chars, substring, case-insensitive, `%` and `_` literal.
- Actions: `requireSession()` first, ids through `parseId`, validation through `parseWith`, writes through `withSaveErrors`, revalidate `/notes`, `/calendar` and `/`.
- No dependency on Stage 4d. Nothing deployed.

## Review Focus

- Empty, whitespace-only and 5001-char bodies rejected inline; an impossible date rejected (Task 1).
- `%` and `_` in search match literally; `q` with quotes or unicode never errors (Task 2, live).
- A note on a day appears in exactly that day's agenda and marker; deleting it removes the marker (Task 4).
- Preview never splits an emoji or combining sequence (Task 1).
- Junk `?q`, `?day`, `?page` never crash `/notes` (Tasks 1, 3).

---

### Task 1: Pure notes logic

**Files:** Create `lib/notes/schema.ts`, `params.ts`, `preview.ts`, `group.ts` and their tests; Modify `lib/plan/calendar.ts`, `lib/plan/calendar.test.ts`.

**Interfaces:** `noteSchema` (fields `day`, `title?`, `body`; output `{ day: string; title?: string; body: string }`); `parseNotesParams(p: { q?; day?; page? }): { q: string | null; day: string | null; page: number }`; `notePreview(body: string, max?: number): string` (default 140); `groupNotesByDay<T extends { day: string; createdAt: Date }>(notes: T[]): { day: string; notes: T[] }[]`; `buildMarkers(days, events, todos, entries, notes?: { day: string }[])` and `DayMarkers = { event; todo; logged; note }`.

- [ ] **Step 1:** Write failing tests per the spec's Testing section and the Review Focus; update the existing `buildMarkers` tests for the new `note: false` field and add: a note marks its day, several notes on a day mark it once, notes outside the requested days are ignored.
- [ ] **Step 2:** Run `npx vitest run lib/notes lib/plan/calendar.test.ts`. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: notes logic`.

### Task 2: Table, actions and query

**Files:** Modify `prisma/schema.prisma`; Create the migration, `app/actions/notes.ts`, `lib/notes/queries.ts`.

**Interfaces:** model `Note`; `getNotes(params: { q: string | null; day: string | null; page: number }): Promise<{ groups: { day: string; notes: NoteView[] }[]; pagination: { page: number; pages: number; total: number } }>` with `NoteView = { id; day; title: string | null; body; createdAt: string }`; actions `createNote(prev, formData)`, `updateNote(id, prev, formData)`, `deleteNote(id)`.

- [ ] **Step 1:** Add the model; generate the migration SQL with `prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script`, apply with `npx prisma migrate deploy`, `npx prisma generate`.
- [ ] **Step 2:** Implement the actions and query (search with Prisma `contains` + `mode: "insensitive"`, order by `day desc, createdAt desc, id desc`, count then clamp the page, skip/take 20).
- [ ] **Step 3:** `npx tsc --noEmit`, suite. Commit `feat: notes table, actions and query`.

### Task 3: The /notes page

**Files:** Create `components/notes/NoteForm.tsx`, `NotesList.tsx`, `notes.module.css`, `app/(app)/notes/page.tsx` (replace the placeholder).

- [ ] **Step 1:** Implement: header with "+ Add note", search form (GET) with the active day chip, grouped list with Edit/Delete, pagination via `components/history/Pagination`, empty states.
- [ ] **Step 2:** Verify live on the demo data (stop the dev server to seed; seed 25 notes across days including `%`, `_`, quotes, unicode and multi-line bodies): create with errors inline (empty body, 5001 chars), search incl. `%` and `_` literal, day filter, edit, delete, page 2, junk params, phone width, no console errors.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: notes page`.

### Task 4: Calendar integration

**Files:** Modify `lib/plan/queries.ts` (`getCalendarData`), `lib/plan/types.ts`, `components/calendar/MonthGrid.tsx`, `components/calendar/DayAgenda.tsx`, `components/calendar/calendar.module.css`.

- [ ] **Step 1:** `getCalendarData` fetches notes for the visible days (day between first and last) and returns `markers` with `note`, and `agenda.notes: { id; title: string | null; preview: string }[]` for the selected day. MonthGrid draws a fourth dot. DayAgenda shows the Notes section, "+ Note" (sheet with `NoteForm` preset to the day) and an "Open" link to `/notes?day=…`.
- [ ] **Step 2:** Verify live: marker on days with notes (calendar and dashboard mini calendar), agenda section with previews, "+ Note" adds to the selected day and the marker appears, delete removes it, the link filters `/notes`.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: notes on the calendar`.

### Task 5: End-to-end test and README

**Files:** Add `e2e/notes.spec.ts`; Modify `README.md`.

- [ ] **Step 1:** Playwright: log in, add a note with a unique title and a multi-line body on `/notes`, find it by search, edit the body, open the calendar for today and see the marker and agenda preview, delete it.
- [ ] **Step 2:** Run `npx playwright test` (all pass, no `LoginAttempt` rows left); update the README; `npx vitest run` and `npx tsc --noEmit`. Commit `test: notes smoke test and README`.

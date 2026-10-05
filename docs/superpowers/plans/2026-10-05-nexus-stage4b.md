# Nexus Stage 4b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real Workouts, Study and Sleep pages: range, summary tiles, daily chart, label filter, paginated history with edit and delete.

**Architecture:** Pure functions in `lib/history/` plus a one-query helper feed Server Components; small client pieces for interaction. No new tables.

**Tech Stack:** Next.js 16, Prisma 7, Recharts, Vitest (TZ=UTC), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-nexus-stage4b-design.md`

## Global Constraints

- URL params `range` (7, 30, 90, 365, all; default 30), `label` (trim, max 80, blank = none), `page` (>= 1, clamped); invalid values fall back.
- Window = last N Rome days ending today; `all` starts at the first entry of the type (max 3650 days; none = 30).
- No NaN or Infinity on screen: empty ranges give zeros or dashes.
- Labels grouped case-insensitively on the trimmed text; 50 history entries per page; 8 label chips.
- Reuse Stage 1 `updateEntry`/`deleteEntry` (they already validate ids and require a session). No migration.

## Review Focus

- Empty window, a single entry, ties (best day, top subject) never crash or produce NaN (Task 3).
- A 23:30 Rome entry and a DST-change day group under the right Rome day (Task 2).
- Label grouping across case and spaces; filter narrows tiles, chart and list together (Tasks 2, 4, 6).
- Junk `?range`, `?label`, `?page` never crash any of the three pages (Tasks 1, 6).
- Study and sleep targets compared at exactly the target (Task 3).

---

### Task 1: Params and pagination

**Files:** Create `lib/history/params.ts`, `lib/history/paginate.ts`; Test `lib/history/params.test.ts`, `lib/history/paginate.test.ts`.

**Interfaces:** Produces `type HistoryRange = 7|30|90|365|"all"`, `parseHistoryParams(p: { range?: string|string[]; label?: string|string[]; page?: string|string[] }): { range: HistoryRange; label: string | null; page: number }`; `paginate<T>(items: T[], page: number, size: number): { items: T[]; page: number; pages: number; total: number }` (page clamped to 1..pages, pages at least 1).

- [ ] **Step 1:** Write failing tests: each valid range accepted (`"all"` kept as `"all"`), junk/empty/array fall back to 30 (first array value used); label trimmed, blank becomes null, over 80 characters is cut to 80; page `"3"` is 3, `"0"`, `"-2"`, `"x"`, `"2.5"` become 1; `paginate` of 120 items size 50: page 1 has 50 items, page 3 has 20, page 9 clamps to 3, page 0 clamps to 1, empty list gives pages 1 and no items.
- [ ] **Step 2:** Run `npx vitest run lib/history`. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: history params and pagination`.

### Task 2: Time helper, labels and grouping

**Files:** Modify `lib/time.ts`, `lib/time.test.ts`; Create `lib/history/labels.ts`, `lib/history/group.ts` and tests.

**Interfaces:** Produces `romeMinutesOfDay(d: Date): number` (0 to 1439, Rome wall clock) and `formatClock(minutes: number): string` ("06:42"); `labelBreakdown(entries: { label: string | null; value: number }[], limit: number): { key: string; display: string; count: number; total: number }[]` (key = trimmed lowercase, empty or null labels skipped, display = the most frequent trimmed original spelling with ties going to the first seen, sorted by total desc, then count desc, then key); `groupByDay<T extends { occurredAt: Date; value: number }>(entries: T[]): { day: string; total: number; entries: T[] }[]` (Rome day keys, newest day first, newest entry first within a day).

- [ ] **Step 1:** Write failing tests: `romeMinutesOfDay(new Date("2026-10-04T21:30:00Z"))` is 1410 (23:30 CEST) and `new Date("2026-01-15T22:30:00Z")` is 1410 (23:30 CET); `formatClock(402)` is "06:42" and `formatClock(0)` is "00:00"; label grouping merges "Maths", "maths " and "MATHS" into one row with count 3 and the summed total, shows the most frequent spelling, skips null and blank labels, respects the limit and sorts by total then count; `groupByDay` puts 2026-10-04T21:30Z (23:30 Rome) in day 2026-10-04 and 2026-10-04T22:30Z (00:30 Rome) in 2026-10-05, orders days and entries newest first, sums values per day, and handles the DST-end day 2026-10-25.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: labels and day grouping`.

### Task 3: Summaries

**Files:** Create `lib/history/summaries.ts`; Test `lib/history/summaries.test.ts`.

**Interfaces:** Consumes `EntryLike`/`DayStats`-style inputs, `Targets`, `weekStartKey`, `dayKey`, `romeMinutesOfDay`, `labelBreakdown`. Produces `type Entry = { type: "WORKOUT"|"STUDY"|"SLEEP"|"MEAL"|"MOOD"; occurredAt: Date; value: number; label: string | null }`; `summarizeWorkouts(entries: Entry[], windowDays: number, targets: Targets, todayKey: string): { sessions: number; totalMin: number; avgMin: number; longestMin: number; perWeek: number; weekCount: number; weekTarget: number }`; `summarizeStudy(entries, targets): { totalMin: number; studyDays: number; avgPerStudyDay: number; best: { day: string; minutes: number } | null; daysMetTarget: number; subjects: ReturnType<typeof labelBreakdown> }` (top 5); `summarizeSleep(entries, targets): { days: number; avgHours: number; best: { day: string; hours: number } | null; worst: { day: string; hours: number } | null; daysMetTarget: number; debtHours: number; avgWakeMinutes: number | null }`. All take only entries of their own type (the function filters by type as well).

- [ ] **Step 1:** Write failing tests: workouts with 4 sessions (30, 45, 60, 45 min) in a 28-day window gives total 180, avg 45, longest 60, perWeek 1; empty input gives zeros; `weekCount` counts only sessions from this Monday through today; study: two entries on one day sum into that day, best day picks the larger day (ties go to the earlier day), `daysMetTarget` counts a day at exactly 240 minutes and not 239, avgPerStudyDay divides by study days not window days, subjects group "Maths"/"maths " together and cap at 5; sleep: two entries on one day sum, avg over logged days only, best and worst days, `daysMetTarget` at exactly 8 h counts and 7.99 does not, debt counts only shortfalls (7 h and 9 h against 8 gives debt 1, not 0), `avgWakeMinutes` is the mean of Rome clock minutes (06:00 and 07:00 gives 390) and null with no entries; every empty input returns finite numbers.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: history summaries`.

### Task 4: History query

**Files:** Create `lib/history/queries.ts`.

**Interfaces:** Consumes the pure modules, `getTargets`, prisma, `aggregateDaily`, `rangeKeys`. Produces `getHistory(type: "WORKOUT"|"STUDY"|"SLEEP", params: { range: HistoryRange; label: string | null; page: number }): Promise<{ windowDays: number; days: DayStats[]; chips: { key: string; display: string; count: number; total: number }[]; activeLabel: string | null; groups: ReturnType<typeof groupByDay<HistoryEntry>>; pagination: { page: number; pages: number; total: number }; entries: Entry[]; targets: Targets; today: string }` where the history list is the filtered entries paginated by 50 (pages split the entry list, then grouped by day), `days` is the zero-filled daily stats of the filtered entries, and `chips` come from the unfiltered window entries. One database query for the entries; for `all`, a second tiny query finds the first entry's date.

- [ ] **Step 1:** Implement the query. **Step 2:** `npx tsc --noEmit`. Commit `feat: history query`. (Verified live in Task 6.)

### Task 5: Components and quick-log type preselection

**Files:** Create `components/history/RangeTabs.tsx`, `SummaryTiles.tsx`, `HistoryChart.tsx`, `LabelChips.tsx`, `HistoryList.tsx`, `Pagination.tsx`, `LogButton.tsx`, `history.module.css`; Modify `components/QuickLog.tsx`.

**Interfaces:** `useQuickLog().openNew(type?: EntryTypeName)` preselects the type (default Study as today). `RangeTabs({ range, hrefFor })`, `LabelChips({ chips, active, hrefFor })`, `Pagination({ page, pages, hrefFor })` are server-renderable link lists (`withParams` from Stage 3 builds hrefs and keeps other params; changing range or label resets `page`). `SummaryTiles({ tiles: { label: string; value: string; sub?: string }[] })`. `HistoryChart({ days, kind: "bars" | "line", color, target?: number, unit })` (client, Recharts, dashed `ReferenceLine` for the target). `HistoryList({ groups, type })` (client: day heading with total, rows with time, label and value, Edit via `openEdit`, Delete via `deleteEntry` after confirm). `LogButton({ type, label })`.

- [ ] **Step 1:** Implement the components and the `openNew(type)` change (keep the N hotkey and the + button unchanged).
- [ ] **Step 2:** `npx tsc --noEmit` and the suite. Commit `feat: history components`.

### Task 6: The three pages

**Files:** Modify `app/(app)/workouts/page.tsx`, `study/page.tsx`, `sleep/page.tsx`; Create `components/history/HistoryPage.tsx` (shared server template).

**Interfaces:** `HistoryPage({ type, params, basePath })` calls `getHistory`, formats tiles (using `formatDuration`, `formatEntryValue`, `formatClock`), and renders header with the `LogButton`, range tabs, label chips, tiles, chart, list and pagination; each route reads `searchParams` and calls `parseHistoryParams`.

- [ ] **Step 1:** Implement. **Step 2:** Verify live on the demo data (stop the dev server to seed if needed): all three pages render with tiles, chart, chips and list; range tabs change the numbers; a label chip narrows tiles, chart and list together and clears again; Edit changes an entry and the tiles update; Delete removes it; "Log study" opens the sheet with Study selected; pagination with more than 50 entries (seed extra); junk `?range=x&label=%20&page=-4` and an empty database render without errors or NaN; phone width has no overflow.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: workouts, study and sleep pages`.

### Task 7: End-to-end test and README

**Files:** Add `e2e/history.spec.ts`; Modify `README.md`.

- [ ] **Step 1:** Playwright: log in, open `/study`, log a study entry with a unique label via "Log study", see it in the history list, click its label chip (URL gains `label=`), edit it to a different amount and see the list update, delete it; also open `/workouts` and `/sleep` and see their headings and summary tiles without NaN.
- [ ] **Step 2:** Run `npx playwright test`; all pass and no `LoginAttempt` rows remain. Update the README (three pages). Run `npx vitest run` and `npx tsc --noEmit`. Commit `test: history pages smoke test and README`.

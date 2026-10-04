# Nexus Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stage 1 Nexus dashboard: login, quick-log, four stat cards, Life Timeline, Recent Activity and a sidebar shell.

**Architecture:** One Next.js App Router app. Server Components read daily aggregates from Prisma/Neon through a single pure aggregation layer (`lib/stats`); Server Actions write entries. A single env-var password plus a signed cookie guards every route via middleware. Pure logic (time, stats, timeline normalization, validation, auth tokens) lives in small tested modules; UI components stay thin.

**Tech Stack:** Next.js (App Router, TypeScript), Prisma, Neon Postgres, Zod, Recharts, jose, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-nexus-stage1-design.md`

## Global Constraints

- Days are cut in the `Europe/Rome` timezone.
- A sleep entry belongs to the day the user wakes up (its `occurredAt` day).
- Units: workout = minutes, study = minutes, sleep = hours, meal = kcal, mood = 1 to 10.
- Default targets: study 240 min/day, sleep 8 h/day, calories 2800 kcal/day, workouts 4/week.
- Totals and percentages are computed from `Entry` against `Target`, never stored.
- `Entry` has `source` (MANUAL | APPLE_HEALTH | GOOGLE_CAL; only MANUAL used) and `externalId`, unique together.
- Timeline: range 7/30/90 days; each metric normalized to 0 to 10; tooltip shows real values; legend toggles metrics.
- Metric accent colors: workout green, study blue, sleep purple, calories orange, mood yellow.
- Zod validates every Server Action input; errors show inline and keep typed values.
- Secrets (database URL, password, session secret) live in environment variables, never in the repo.
- Out of scope: Goals, Problems, To-do, Calendar, correlation, AI brief, imports, deployment.

## Review Focus

Behaviors the spec implies but a user could hit; each is pinned by a test in the owning task.

- An entry at 23:30 Rome time, and one on a daylight-saving change day, lands on the correct local day (Task 2).
- A day with no entries yields 0 totals, 0% rings and a null mood, never NaN (Tasks 3, 4).
- Values over target show the real number while the ring caps at 100% (Task 3).
- Out-of-range input (negative minutes, sleep over 24 h, mood 0 or 11, absurd kcal) is rejected with an inline error (Task 5).
- Missing `APP_PASSWORD` or `SESSION_SECRET` fails closed: nobody can log in, and the app does not fall back to open access (Task 6).
- Pressing `N` while typing in a text field must not open the quick-log sheet (Task 8).

---

### Task 1: Scaffold, theme and schema

**Files:**
- Create: Next.js app in `/Users/denn/Jarvis` (`app/`, `package.json`, `tsconfig.json`), `prisma/schema.prisma`, `lib/db.ts`, `.env.example`, `vitest.config.ts`, `app/globals.css`
- Test: `lib/sanity.test.ts` (deleted after Task 2 adds real tests)

**Interfaces:**
- Produces: `prisma` (`lib/db.ts`: exported PrismaClient singleton); Prisma models `Entry`, `Target`; enums `EntryType`, `Source`, `Period`; CSS variables `--c-workout`, `--c-study`, `--c-sleep`, `--c-calories`, `--c-mood`, `--bg`, `--glass`.

- [ ] **Step 1: Scaffold** with `create-next-app` (TypeScript, App Router, no Tailwind, `src/` not used) into the existing git repo; add deps `prisma @prisma/client zod recharts jose` and dev deps `vitest @playwright/test`; add `test` script `vitest run`.
- [ ] **Step 2: Write `prisma/schema.prisma`** with `Entry` (id, type, occurredAt, value Float, label String?, meta Json?, source default MANUAL, externalId String?, `@@unique([source, externalId])`, index on occurredAt) and `Target` (type, period, value Float, `@@unique([type, period])`), matching the spec's data model.
- [ ] **Step 3: Write `.env.example`** listing `DATABASE_URL`, `APP_PASSWORD`, `SESSION_SECRET` with placeholder values; confirm `.env*` (except example) is in `.gitignore`. The user creates `.env.local` themselves with a Neon dev-branch URL.
- [ ] **Step 4: Write `app/globals.css`** with the dark glass theme variables listed above (dark background, translucent card surface, one accent per metric).
- [ ] **Step 5: Write a trivial test** `lib/sanity.test.ts` asserting `1 + 1 === 2`; run `npx vitest run`. Expected: PASS.
- [ ] **Step 6: Migrate** with `npx prisma migrate dev --name init` against the user's dev database. Expected: migration applied. If `.env.local` is missing, stop and ask the user to create it.
- [ ] **Step 7: Commit** `chore: scaffold app, theme and schema`.

### Task 2: Time helpers (Europe/Rome)

**Files:**
- Create: `lib/time.ts`
- Test: `lib/time.test.ts`

**Interfaces:**
- Produces:
  - `TZ = "Europe/Rome"`
  - `dayKey(d: Date): string` returns `"YYYY-MM-DD"` in Rome time
  - `addDays(key: string, n: number): string`
  - `weekStartKey(key: string): string` returns the Monday of that week
  - `rangeKeys(endKey: string, days: number): string[]` returns oldest to newest, ending at `endKey`

- [ ] **Step 1: Write failing tests** in `lib/time.test.ts`: `dayKey(new Date("2026-03-14T22:30:00Z"))` is `"2026-03-14"` (23:30 Rome, winter) and `dayKey(new Date("2026-03-14T23:30:00Z"))` is `"2026-03-15"` (00:30 Rome); `dayKey(new Date("2026-10-24T22:30:00Z"))` is `"2026-10-25"` (DST ends that night, 00:30 Rome); `weekStartKey("2026-10-04")` is `"2026-09-28"`; `addDays("2026-02-28", 1)` is `"2026-03-01"`; `rangeKeys("2026-10-04", 3)` is `["2026-10-02","2026-10-03","2026-10-04"]`.
- [ ] **Step 2: Run** `npx vitest run lib/time.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `lib/time.ts` using `Intl.DateTimeFormat` with `timeZone: TZ` for `dayKey`; do key arithmetic on UTC dates parsed from the key so it is unaffected by the machine's timezone.
- [ ] **Step 4: Run** the tests. Expected: PASS. Delete `lib/sanity.test.ts`.
- [ ] **Step 5: Commit** `feat: Europe/Rome day helpers`.

### Task 3: Daily stats aggregation

**Files:**
- Create: `lib/stats.ts`, `lib/targets.ts`
- Test: `lib/stats.test.ts`

**Interfaces:**
- Consumes: `dayKey`, `weekStartKey`, `rangeKeys` from `lib/time`; `prisma` from `lib/db`.
- Produces:
  - `type EntryLike = { type: "WORKOUT"|"STUDY"|"SLEEP"|"MEAL"|"MOOD"; occurredAt: Date; value: number }`
  - `type DayStats = { day: string; workoutMin: number; workoutCount: number; studyMin: number; sleepH: number; kcal: number; mood: number | null }` (mood is the day's average)
  - `aggregateDaily(entries: EntryLike[], days: string[]): DayStats[]` (one row per key, zero-filled)
  - `DEFAULT_TARGETS = { studyMin: 240, sleepH: 8, kcal: 2800, workoutsPerWeek: 4 }` and `type Targets` (in `lib/targets.ts`); `getTargets(): Promise<Targets>` reads the `Target` table and falls back to the defaults per field
  - `type CardSummary = { value: number; target: number; pct: number; week: number[] }` and `summarizeCards(stats: DayStats[], targets: Targets): { workout: CardSummary; study: CardSummary; sleep: CardSummary; calories: CardSummary }`, using the last row of `stats` as today. Workout `value` is the week-to-date count (Monday through today), `target` is workouts per week. `pct` is a whole-number percent, uncapped. `week` is the last 7 days' values (workout: minutes).
  - `getDailyStats(days: number): Promise<DayStats[]>` queries entries for the range and calls `aggregateDaily`

- [ ] **Step 1: Write failing tests** in `lib/stats.test.ts`: two study entries on one day sum; a sleep entry at 06:30 Rome counts on that day; an empty day gives `{workoutMin:0, workoutCount:0, studyMin:0, sleepH:0, kcal:0, mood:null}`; two mood entries (6 and 8) average to 7; `summarizeCards` with study 300 min against target 240 gives `value: 300` and `pct: 125`; a day with no entries gives `pct: 0` (not NaN); workout `value` counts only entries from Monday of the current week through today.
- [ ] **Step 2: Run** `npx vitest run lib/stats.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `aggregateDaily` and `summarizeCards` as pure functions; `getDailyStats` fetches entries with `occurredAt` from the oldest day minus one day to now (the extra day is filtered by `dayKey`, so DST offsets cannot drop entries).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: daily stats aggregation and card summaries`.

### Task 4: Timeline series

**Files:**
- Create: `lib/timeline.ts`
- Test: `lib/timeline.test.ts`

**Interfaces:**
- Consumes: `DayStats`, `Targets` from `lib/stats` and `lib/targets`.
- Produces: `type TimelinePoint = { day: string; workout: number | null; study: number | null; sleep: number | null; calories: number | null; mood: number | null; raw: DayStats }` and `toTimelineSeries(stats: DayStats[], targets: Targets): TimelinePoint[]`.

Normalization (a decision the spec leaves open): each metric is `min(value / dailyTarget, 1) * 10`. Workout uses 60 minutes as its daily reference. Study, sleep and calories use their targets. Mood is already 0 to 10 and is passed through. A zero total is `0`, except mood with no entry, which is `null` (a gap in the line).

- [ ] **Step 1: Write failing tests**: study 120 min against 240 gives `5`; study 600 min caps at `10`; a day with no entries gives `0` for the four totals and `null` for mood; `raw` carries the original `DayStats` for the tooltip.
- [ ] **Step 2: Run** `npx vitest run lib/timeline.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `toTimelineSeries` as a pure function.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: timeline normalization`.

### Task 5: Entry validation and Server Actions

**Files:**
- Create: `lib/entries/schema.ts`, `app/actions/entries.ts`
- Test: `lib/entries/schema.test.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db`; `verifySession` from `lib/auth` is not needed here (middleware guards the routes).
- Produces:
  - `entryInputSchema` (Zod): fields `type`, `value`, `label?`, `occurredAt?` (defaults to now). Bounds: workout 1 to 600 min, study 1 to 960 min, sleep 0.5 to 24 h, meal 1 to 10000 kcal, mood integer 1 to 10. `label` max 80 chars.
  - `type ActionState = { ok: boolean; errors?: Record<string, string>; values?: Record<string, string> }`
  - `createEntry(prev: ActionState, formData: FormData): Promise<ActionState>`
  - `updateEntry(id: string, prev: ActionState, formData: FormData): Promise<ActionState>`
  - `deleteEntry(id: string): Promise<void>`
  - Each write calls `revalidatePath("/")`. On validation failure, return `ok: false` with per-field `errors` and the submitted `values` so the form keeps what was typed.

- [ ] **Step 1: Write failing tests** for `entryInputSchema`: valid study entry passes; `value: -5` fails; sleep `25` fails; mood `0` and mood `11` fail; mood `7.5` fails (not an integer); meal `1000000` fails; empty `label` is accepted as undefined.
- [ ] **Step 2: Run** `npx vitest run lib/entries/schema.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the schema (Zod `discriminatedUnion` on `type` or a single schema with a refinement per type; either is fine) and the three Server Actions in `app/actions/entries.ts` (`"use server"`).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: entry validation and server actions`.

### Task 6: Auth and login page

**Files:**
- Create: `lib/auth.ts`, `middleware.ts`, `app/login/page.tsx`, `app/actions/auth.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Produces:
  - `checkPassword(input: string): boolean` compares in constant time against `process.env.APP_PASSWORD`; returns `false` when `APP_PASSWORD` is unset or empty.
  - `createSession(): Promise<string>` returns a signed JWT (jose, HS256, 30-day expiry) using `SESSION_SECRET`; throws when the secret is unset.
  - `verifySession(token: string | undefined): Promise<boolean>` returns `false` for a missing, tampered, expired or secret-mismatched token, and for an unset secret.
  - `login(prev: ActionState, formData: FormData): Promise<ActionState>` and `logout(): Promise<void>` Server Actions. The cookie is httpOnly, sameSite lax, secure in production.
  - `middleware.ts` redirects every path except `/login` and Next internals/static files to `/login` when `verifySession` fails.

- [ ] **Step 1: Write failing tests** in `lib/auth.test.ts`: correct password passes and wrong password fails; with `APP_PASSWORD` unset, even an empty-string input fails; a token from `createSession` verifies; a token with one character changed fails; an expired token fails (create one with a past expiry via jose directly); with `SESSION_SECRET` unset, `verifySession` returns `false` and `createSession` throws.
- [ ] **Step 2: Run** `npx vitest run lib/auth.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/auth.ts`, the actions, `middleware.ts` and the login page (single password field, inline error "Wrong password", themed to match).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Verify manually** with the dev server: visiting `/` redirects to `/login`; the correct password reaches the (still empty) dashboard; a wrong password shows the inline error.
- [ ] **Step 6: Commit** `feat: single-password auth`.

### Task 7: Dashboard shell and stat cards

**Files:**
- Create: `components/Sidebar.tsx`, `components/StatCard.tsx`, `components/Ring.tsx`, `components/BarStrip.tsx`, `app/(app)/layout.tsx`, `app/(app)/page.tsx`, placeholder pages for `plan`, `workouts`, `study`, `sleep`, `calendar`, `goals`, `analytics`, `flaws`, `notes`, `components/ComingSoon.tsx`
- Test: `components/Ring.test.tsx` is not needed; the pure percent logic is covered in Task 3.

**Interfaces:**
- Consumes: `getDailyStats`, `summarizeCards`, `getTargets`.
- Produces: `<Ring pct={number} color={string} />` (the arc is drawn capped at 100%, the label shows the real uncapped number); `<StatCard title unit summary color />`; `<Sidebar />` with the nav list from the spec and a logout button. The Dashboard page passes `getDailyStats(7)` for the cards.

- [ ] **Step 1: Move** the authenticated pages under the `(app)` route group so `/login` stays outside the sidebar layout.
- [ ] **Step 2: Implement** the components. Workout card text shows "n/4 this week"; other cards show "value / target unit". Ring color uses the metric's CSS variable.
- [ ] **Step 3: Implement** the placeholder routes using `ComingSoon` ("Coming soon").
- [ ] **Step 4: Verify** in the browser pane: log in, see four cards with 0% rings on an empty database, sidebar links resolve, no console errors, and the layout holds at phone width (375 px).
- [ ] **Step 5: Commit** `feat: dashboard shell and stat cards`.

### Task 8: Quick-log sheet and Recent Activity

**Files:**
- Create: `components/QuickLog.tsx`, `components/RecentActivity.tsx`, `lib/hotkey.ts`
- Test: `lib/hotkey.test.ts`

**Interfaces:**
- Consumes: `createEntry`, `updateEntry`, `deleteEntry`, `ActionState`.
- Produces:
  - `shouldOpenQuickLog(e: { key: string; target: { tagName?: string; isContentEditable?: boolean } | null; metaKey: boolean; ctrlKey: boolean; altKey: boolean }): boolean` is true only for `n` or `N` with no modifier and a target that is not an input, textarea, select or contenteditable.
  - `<QuickLog />`: floating `+` button, opens a sheet on click or `N`. A type selector, then a value field (labelled with the unit) and an optional label; submit calls `createEntry`; on `ok` the sheet closes, otherwise errors show inline with values kept. Sleep entries default `occurredAt` to now (the wake-up time).
  - `<RecentActivity entries />`: the 8 most recent entries with time, label and value; each row has Edit (opens the sheet prefilled, calling `updateEntry`) and Delete (calls `deleteEntry` after a confirm).

- [ ] **Step 1: Write failing tests** for `shouldOpenQuickLog`: `n` on the body opens; `n` with target `INPUT` does not; target `TEXTAREA` does not; contenteditable does not; `n` with `ctrlKey` does not; `x` does not.
- [ ] **Step 2: Run** `npx vitest run lib/hotkey.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/hotkey.ts`, then `QuickLog` and `RecentActivity`, and mount both in the dashboard layout and page.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Verify** in the browser pane: log one study entry of 90 minutes; the Study card ring and bar strip update and the entry appears in Recent Activity; submitting `-5` shows the inline error and keeps the typed value; edit and delete both work.
- [ ] **Step 6: Commit** `feat: quick-log sheet and recent activity`.

### Task 9: Life Timeline

**Files:**
- Create: `components/LifeTimeline.tsx`
- Modify: `app/(app)/page.tsx` to add the timeline

**Interfaces:**
- Consumes: `toTimelineSeries`, `TimelinePoint`; stats come from `getDailyStats(range)`.
- Produces: `<LifeTimeline />`; the range (7, 30 or 90) is held in the URL as `?range=30` (default 30) so the Server Component can fetch the right days. Recharts `ComposedChart`: bars for workout and study, smooth lines for sleep, calories and mood (mood line leaves gaps for null days). Legend toggles each metric. The tooltip shows the day and the real values from `raw` (for example "Study 2 h 30 m", "Sleep 7 h 0 m", "Calories 2,420 kcal", "Mood 8/10"). SVG glow filter on the lines for the mockup's look.

- [ ] **Step 1: Implement** the component and add `?range` handling to the page.
- [ ] **Step 2: Verify** in the browser pane: with a few logged entries across different days, all five series render; the 7/30/90 selector changes the span; legend toggles hide and show a metric; the tooltip shows real values; an empty database renders without errors or NaN.
- [ ] **Step 3: Commit** `feat: life timeline`.

### Task 10: End-to-end smoke test and README

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `README.md`

**Interfaces:**
- Consumes: the running app with `APP_PASSWORD` and `SESSION_SECRET` set in the environment for the test run.

- [ ] **Step 1: Write the smoke test** in `e2e/smoke.spec.ts`: unauthenticated visit to `/` lands on `/login`; log in with the test password; open quick-log, add a study entry of 90 minutes labelled "Mathematics"; the Study card shows "1.5" hours and the entry appears in Recent Activity; delete the entry.
- [ ] **Step 2: Configure** `playwright.config.ts` to start `npm run dev` as its web server and read the password and secret from the environment (a throwaway test secret, not the user's real one).
- [ ] **Step 3: Run** `npx playwright test`. Expected: PASS against the dev database.
- [ ] **Step 4: Write `README.md`**: how to create `.env.local` from `.env.example`, run migrations, start the dev server, and run unit and e2e tests.
- [ ] **Step 5: Run the whole suite** `npx vitest run`. Expected: all PASS.
- [ ] **Step 6: Commit** `test: e2e smoke test and README`.

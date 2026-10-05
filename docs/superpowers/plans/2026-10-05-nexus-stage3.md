# Nexus Stage 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the discipline score, deterministic daily brief, Performance Overview, correlation chart and Flaws analytics, per the Stage 3 spec.

**Architecture:** Pure, unit-tested functions in `lib/insights/` fed by `DayStats[]` and DB rows; thin query helpers; Server Component cards; client-side pickers only update URL params. No new tables, no new Server Actions.

**Tech Stack:** Next.js 16, Prisma 7, Recharts, Vitest (TZ=UTC), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-nexus-stage3-design.md`

## Global Constraints

- Rome day keys; `DayStats` rows run oldest to newest and the last row is today.
- Active day = any entry (workout count, study, sleep, kcal > 0, or mood non-null). Correlation window = last 90 stats rows.
- Score weights 35/25/25/15 over a rolling 7 days; calories met = within 90% to 110% by integer comparison.
- Correlation caption rules: n < 10 "Not enough data yet"; r null or abs(r) < 0.3 "No clear link"; strength weak/moderate/strong at 0.3/0.5/0.7.
- Flaws: problem needs >= 3 occurrences in the last 90 days; a finding needs >= 3 after-days, >= 3 other-days and abs(change) >= 15%.
- No NaN or Infinity anywhere: zero variance, empty series, zero targets and empty previous periods yield null or 0 as specified.
- Search params go through parsers with fallbacks. No data leaves the app; no Server Actions added.

## Review Focus

- Pearson with zero variance, fewer than 2 pairs, and exactly 9 vs 10 pairs (Task 2).
- Lag 1 across a missing day does not pair non-adjacent days (Task 2).
- Score with no data is 0 (todos neutral) and with everything met is 100; streak before the first entry of today (Task 3).
- Period change when the previous period is empty or zero (Task 4).
- Flaws thresholds: 2 vs 3 occurrences, 14% vs 15% (Task 5).
- Junk `?perf`, `?cx`, `?cy`, `?lag` never crash the dashboard or `/analytics` (Tasks 1, 8, 9).

---

### Task 1: Param parsers

**Files:** Create `lib/insights/params.ts`; Test `lib/insights/params.test.ts`.

**Interfaces:** Produces `type PerfPeriod = "week"|"month"|"year"`, `parsePerf(v: string | string[] | undefined, fallback?: PerfPeriod): PerfPeriod` (default fallback "week"); `type CorrMetric = "sleep"|"study"|"workout"|"calories"|"mood"`, `CORR_METRICS: readonly CorrMetric[]`, `parseLag(v): 0 | 1`, `parseCorrelationParams(p: { cx?: string|string[]; cy?: string|string[]; lag?: string|string[] }): { x: CorrMetric; y: CorrMetric; lag: 0 | 1 }` (defaults sleep, study, 0; unknown values fall back to the default; if x equals y then y becomes "sleep" when x is "study", otherwise "study").

- [ ] **Step 1:** Write failing tests: each valid value accepted; junk, empty, undefined and arrays fall back (first array value used); `parseLag("1")` is 1, `"2"` and `"x"` are 0; `cx=study&cy=study` gives y "sleep"; `cx=mood&cy=mood` gives y "study"; defaults give sleep/study/0; the dashboard default perf is week and `parsePerf(undefined, "month")` is month.
- [ ] **Step 2:** Run `npx vitest run lib/insights/params.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: insight param parsers`.

### Task 2: Correlation

**Files:** Create `lib/insights/activeDay.ts`, `lib/insights/correlation.ts`; Test `lib/insights/correlation.test.ts`.

**Interfaces:** Consumes `DayStats`, `CorrMetric`, `addDays`. Produces `isActiveDay(s: DayStats): boolean`; `metricValue(metric: CorrMetric, s: DayStats): number | null` (sleep needs sleepH > 0, calories kcal > 0, mood non-null, study and workout return their value on any active day, else null); `type Pair = { day: string; x: number; y: number }`; `correlationPairs(stats: DayStats[], x: CorrMetric, y: CorrMetric, lag: 0 | 1): Pair[]` (uses only the last 90 rows; y is read from the row for `addDays(day, lag)` and only when that exact day exists); `pearson(pairs: Pair[]): number | null`; `trendLine(pairs: Pair[]): { slope: number; intercept: number } | null`; `captionFor(x: CorrMetric, y: CorrMetric, lag: 0|1, n: number, r: number | null): string`; `correlate(stats, x, y, lag): { pairs: Pair[]; n: number; r: number | null; trend: {slope:number;intercept:number} | null; caption: string }`; `strongestCorrelation(stats: DayStats[]): { x: CorrMetric; y: CorrMetric; r: number; n: number; caption: string } | null` over the pairs (sleep, study), (sleep, mood), (study, mood), (workout, mood), lag 0, only those with n >= 10 and abs(r) >= 0.3, highest abs(r) wins.

- [ ] **Step 1:** Write failing tests: `pearson` of y = 2x over 5 points is 1, y = -x is -1, the textbook set x [1,2,3,4,5] y [2,4,5,4,5] is 0.7746 (to 4 decimals); constant x or constant y gives null; 0 or 1 pairs gives null; `trendLine` of y = 2x + 1 gives slope 2 intercept 1 and is null for zero variance in x; `metricValue("sleep")` is null for sleepH 0 and `metricValue("study")` is null on an inactive day but 0 on a day with only a meal; lag 1 pairs Monday's x with Tuesday's y and does not pair across a missing day; `correlationPairs` ignores rows older than the last 90; captions: n 9 gives "Not enough data yet", n 10 with r 0.2 gives "No clear link", r null gives "No clear link", r 0.62 sleep->study gives a caption containing "Higher sleep goes with higher study" and "moderate" and "0.62", r -0.75 workout->mood contains "lower mood" and "strong", lag 1 contains "the next day"; `strongestCorrelation` returns the pair with the highest abs(r) and null when none qualifies.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: correlation analysis`.

### Task 3: Discipline score and streak

**Files:** Modify `lib/plan/weekGrid.ts` (export `stateFor`); Create `lib/insights/score.ts`; Test `lib/insights/score.test.ts`.

**Interfaces:** Consumes `stateFor(metric, s, targets): CellState` (newly exported from `lib/plan/weekGrid.ts`), `isActiveDay`, `Targets`, `rangeKeys`. Produces `disciplineScore(input: { stats: DayStats[]; targets: Targets; todos: { dueDate: string | null; done: boolean }[]; todayKey: string }): { score: number; parts: { targets: number; workouts: number; todos: number; logging: number } }` (parts are 0 to 1 fractions; window = the 7 days ending `todayKey`; missing stats days count as nothing logged) and `loggingStreak(stats: DayStats[], todayKey: string): number`.

- [ ] **Step 1:** Write failing tests: no data and no todos gives score 25 (only the neutral todo component) with parts targets 0, workouts 0, todos 1, logging 0; everything met for 7 days (study, sleep, calories met, 4 workouts, active every day, all due todos done) gives 100; targets part counts only met slots (14 of 21 gives 0.667); workouts part caps at 1 (6 workouts of 4); todos part is done/due within the 7-day window, ignores todos due outside it and undated ones; logging part is active days / 7; the score rounds; streak: 3 active days ending today gives 3; today empty but the previous 3 days active gives 3; an inactive day yesterday and active today gives 1; no entries gives 0; a gap breaks the streak.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Export `stateFor`, implement score and streak. **Step 4:** Run the whole suite. Expected: PASS. Commit `feat: discipline score and streak`.

### Task 4: Performance overview

**Files:** Create `lib/insights/performance.ts`; Test `lib/insights/performance.test.ts`.

**Interfaces:** Consumes `DayStats`, `Targets`, `PerfPeriod`. Produces `type PerfMetric = { key: "training"|"study"|"sleep"|"nutrition"; current: number; previous: number; change: number | null; spark: number[] }` and `performance(stats: DayStats[], targets: Targets, period: PerfPeriod): PerfMetric[]` (order training, study, sleep, nutrition; `stats` ends today; N = 7, 30 or 365; current = last N rows, previous = the N rows before them, possibly fewer or none; sums for training and study, mean over logged days for sleep, mean adherence over logged days for nutrition; `change` is the whole-number percent change or null when previous is 0; `spark` is the current period's daily values for week and month, and 52 weekly sums or means for year).

- [ ] **Step 1:** Write failing tests: week training 120 vs previous 100 gives change 20; previous 0 gives null; study decrease gives a negative change; sleep averages only logged days (7 and 8 and an unlogged day gives 7.5); nutrition adherence of 2800 vs target 2800 is 100, 2520 is 90, 5600 is 0 (floored), unlogged days ignored; empty stats give zeros, null changes and no NaN; week spark has 7 values and month 30; year spark has 52 values; stats shorter than 2N still work.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: performance overview`.

### Task 5: Flaws analytics

**Files:** Create `lib/insights/flaws.ts`; Test `lib/insights/flaws.test.ts`.

**Interfaces:** Consumes `DayStats`, `dayKey`, `addDays`, `weekStartKey`. Produces `type ProblemInput = { id: string; title: string; occurrences: Date[] }`, `type Finding = { metric: "sleep"|"study"|"mood"; changePct: number; n: number }`, `type ProblemFindings = { problemId: string; title: string; occurrenceCount: number; findings: Finding[]; weekly: number[]; direction: "up"|"down"|"flat" }`, `flawsAnalytics(stats: DayStats[], problems: ProblemInput[], todayKey: string): ProblemFindings[]` (window = last 90 stats rows; only problems with >= 3 occurrences in the window; after-days are the distinct Rome days following an occurrence day, using only after-days that exist in the window and have a value for the metric; other-days are the remaining window days with a value; a finding needs >= 3 after-days, >= 3 other-days, other-mean > 0 and abs(changePct) >= 15; `weekly` holds 4 occurrence counts for the Monday-start weeks ending with the current one; `direction` compares the last 2 weeks to the 2 before: lower is down, higher is up, equal is flat).

- [ ] **Step 1:** Write failing tests: a problem with 2 occurrences is excluded and with 3 included; a clear study drop (after-days 100 vs other-days 200) gives changePct -50 and n 3; a 14% difference is not reported while 15% is; fewer than 3 after-days or other-days gives no finding; a metric with no logged values on after-days is skipped; occurrences outside the 90-day window are ignored; weekly counts bucket by Rome Monday-start weeks (an occurrence at 23:30 Rome on Sunday counts in that week); direction up, down and flat; a day after an occurrence that is today or in the future is not an after-day.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: flaws analytics`.

### Task 6: Daily brief

**Files:** Create `lib/insights/brief.ts`; Test `lib/insights/brief.test.ts`.

**Interfaces:** Consumes the types above. Produces `type BriefInput = { greeting: string; score: number; streak: number; hasData: boolean; correlation: { caption: string } | null; flaw: { title: string; metric: "sleep"|"study"|"mood"; changePct: number } | null; overdueTodos: number; goal: { title: string; daysLeft: number; pct: number } | null; yesterdaySleepH: number | null; sleepTarget: number; daysSinceWorkout: number | null }` and `buildBrief(input: BriefInput): { headline: string; lines: string[] }`.

- [ ] **Step 1:** Write failing tests: no data gives the "Log your first entries and I will start finding patterns." line; headline contains the greeting, "Discipline score 72/100" and, only when streak >= 2, "{n}-day streak"; lines follow the priority order (correlation caption, flaw, overdue, goal, suggestion) and never exceed 4; the flaw line uses the title and the absolute percent with "lower" for negative and "higher" for positive; overdue 1 reads "1 to-do is overdue" and 2 reads "2 to-dos are overdue"; the goal line reads "{title} is due in {n} days at {pct}%" and "today" when daysLeft is 0; the sleep suggestion appears when yesterday's sleep is under target and is replaced by the workout suggestion only when sleep does not trigger and daysSinceWorkout >= 3; with 5 applicable items only the first 4 appear.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: daily brief`.

### Task 7: Insight queries

**Files:** Create `lib/insights/queries.ts`.

**Interfaces:** Consumes `getDailyStats`, `getTargets`, prisma, all insight functions, `selectDashboardGoals`-style goal data via `getGoals`. Produces `getInsightData(opts: { perf: PerfPeriod; correlation: { x: CorrMetric; y: CorrMetric; lag: 0|1 }; greeting: string }): Promise<{ score: ReturnType<typeof disciplineScore>; streak: number; brief: ReturnType<typeof buildBrief>; performance: PerfMetric[]; correlation: ReturnType<typeof correlate> & { x: CorrMetric; y: CorrMetric; lag: 0|1 }; flaws: ProblemFindings[] }>`; it fetches `getDailyStats(max(730 if perf is year else 2N, 90))` once and derives everything from it, plus open todos, active goals and problem occurrences from the last 90 days.

- [ ] **Step 1:** Implement the query helper and the glue that builds `BriefInput` (overdue todos from `isOverdue`, nearest-deadline active goal within 7 days and pct < 100, yesterday's sleep from the second-to-last stats row, days since the last workout from stats).
- [ ] **Step 2:** `npx tsc --noEmit`. Expected: clean. Commit `feat: insight queries`. (Verified live in Task 8.)

### Task 8: Brief and Discipline cards on the dashboard

**Files:** Create `components/BriefCard.tsx`, `components/ScoreCard.tsx`, `components/insights.module.css`; Modify `app/(app)/page.tsx`.

**Interfaces:** Consumes `getInsightData`. Produces the two cards in a row under the greeting; `ScoreCard` shows the score as a ring with the four parts as small labelled bars and the streak; `BriefCard` shows the headline and lines.

- [ ] **Step 1:** Implement the cards and wire them in with `getInsightData` (perf and correlation from search params via the parsers).
- [ ] **Step 2:** Verify live in the browser pane at 280px and desktop: empty database shows the first-entries message and score 25; after seeding a week of entries, the score, streak and brief lines are sensible and there is no NaN; junk `?perf=x&cx=zzz&lag=9` does not crash.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: brief and discipline cards`.

### Task 9: Performance and Correlation cards

**Files:** Create `components/PerformanceCard.tsx`, `components/CorrelationCard.tsx`, `components/CorrelationPicker.tsx`; Modify `app/(app)/page.tsx`, `components/insights.module.css`.

**Interfaces:** Produces `PerformanceCard({ metrics, period, base })` (period links `?perf=`, four tiles with change % in green or red, "new" or a dash for null, and a sparkline via Recharts `AreaChart`), `CorrelationCard({ data, base })` (Recharts `ScatterChart` with the trend line as a two-point line, r and the caption, axes labelled with units), `CorrelationPicker` (client; two selects and a lag toggle that call `router.replace` with `cx`, `cy`, `lag` preserved alongside other params).

- [ ] **Step 1:** Implement the components and mount both on the dashboard before Recent Activity.
- [ ] **Step 2:** Verify live with seeded data (about 3 weeks): sparklines render, week/month/year links work, scatter and trend line show, the picker changes the chart and the URL, an empty database shows "Not enough data yet", no console errors.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: performance and correlation cards`.

### Task 10: Analytics page

**Files:** Create `components/FlawsAnalytics.tsx`; Modify `app/(app)/analytics/page.tsx`.

**Interfaces:** Produces `/analytics` with: the correlation explorer (`CorrelationCard` with `base="/analytics"`), the Performance Overview (`base="/analytics"`, default period month), and `FlawsAnalytics({ items })` (one block per problem: title, occurrence count, the 4-week bar mini-chart with direction arrow, and findings phrased "After '{title}', your {metric} is {n}% lower|higher than usual ({k} days)"; an empty state that says problems need at least 3 occurrences in 90 days).

- [ ] **Step 1:** Implement and verify live: with a seeded problem (4 occurrences on different days and a study dip the day after) a finding appears; with fewer occurrences the empty state shows; junk params do not crash.
- [ ] **Step 2:** Suite and `tsc`. Commit `feat: analytics page`.

### Task 11: Smoke test and README

**Files:** Modify `e2e/smoke.spec.ts` (or add `e2e/insights.spec.ts`), `README.md`.

- [ ] **Step 1:** Add a Playwright test: log in, see the Brief and Discipline cards and the Correlation card ("Not enough data yet" or a caption) on the dashboard, open `/analytics` and see its three sections; log a study entry and see the score card still renders; delete the entry.
- [ ] **Step 2:** Run `npx playwright test`. Expected: all PASS.
- [ ] **Step 3:** Update `README.md` for Stage 3. Run `npx vitest run` and `npx tsc --noEmit`. Commit `test: stage 3 smoke test and README`.

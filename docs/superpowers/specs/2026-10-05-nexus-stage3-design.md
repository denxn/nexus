# Nexus: Stage 3 design (Insights)

Date: 2026-10-05. Builds on the merged Stage 1 and Stage 2 specs. Their Global Constraints still apply: Europe/Rome day cut, `requireSession()` first in every Server Action, Zod on every input including ids, saves through `withSaveErrors`, secrets only in env files, vitest under TZ=UTC.

## Purpose

Turn the logged data into insight, following the mockup: a discipline score, a Jarvis-style daily brief, a Performance Overview, an Activity Correlation chart and Flaws analytics. Success means Dennis opens the dashboard and immediately sees how the week is going, what seems to drive it, and what to do next, without any claim the data does not support.

## Decisions (agreed)

- **No AI and no API key.** The daily brief is deterministic, computed from the user's own data on every load. Nothing leaves the app.
- **No new tables, no migration.** Everything is computed from `Entry`, `Goal`, `Problem`/`ProblemOccurrence` and `Todo`.
- Charts use Recharts, like the Life Timeline.

## Scope

In: discipline score and streak, daily brief, Performance Overview (week, month, year), correlation chart (any two metrics, same day or next day), Flaws analytics, dashboard cards, `/analytics`.

Out (YAGNI): forecasting, notifications, per-metric custom targets in the UI, exports, any external service.

## Metrics and definitions

All computations are pure functions in `lib/insights/`, fed by `DayStats[]` (Stage 1), `Targets`, todos, goals and problem occurrences. `DayStats` days are Rome days.

**Active day:** a day with at least one entry of any type (workout, study, sleep, meal or mood).

**Discipline score (0 to 100, rolling last 7 days ending today):**
- 35%: share of day-metric slots met across study, sleep and calories (7 days x 3 metrics). "Met" uses the Stage 2 week-grid rules (study and sleep at or above target; calories within 90% to 110%, compared with integers).
- 25%: `min(workouts in the 7 days / workoutsPerWeek, 1)`.
- 25%: share of todos with a due date inside the 7-day window (today minus 6 through today) that are done; 1 if none are due.
- 15%: active days / 7.
- `score = round(100 x sum)`. Future days do not exist in the window (it ends today).
- **Streak:** consecutive active days counting back from today, or from yesterday if today has no entries yet (so it does not reset in the morning).

**Performance Overview:** period `week` (7 days), `month` (30) or `year` (365). Current period = the last N days ending today; previous period = the N days before it. Four metrics:
- **Training:** sum of workout minutes.
- **Study:** sum of study minutes.
- **Sleep:** average sleep hours over days with sleep logged.
- **Nutrition:** mean daily adherence over days with calories logged, where adherence = `max(0, 100 - abs(kcal/target - 1) x 100)`.
- Each shows `change` = `(current - previous) / previous x 100` rounded to a whole number, or `null` when the previous period is 0 or empty (shown as "new" when current > 0, otherwise a dash). A sparkline series for the current period: daily values for week and month, 52 weekly buckets for year.

**Correlation:** metrics `sleep` (hours), `study` (minutes), `workout` (minutes), `calories` (kcal), `mood` (1 to 10 average). Window: the last 90 days.
- A day provides a value for sleep, calories and mood only if it is logged (greater than 0, or non-null for mood). Study and workout provide their value (including 0) on any active day.
- Pairs are (x on day d, y on day d + lag) where lag is 0 (same day) or 1 (next day); a pair exists only when both days provide a value.
- **Pearson r** is `null` with fewer than 2 pairs or when either series has zero variance (never NaN). A least-squares trend line (slope, intercept) is returned when r is not null.
- **Caption:** fewer than 10 pairs gives "Not enough data yet"; r null or `abs(r) < 0.3` gives "No clear link"; otherwise "Higher {x} goes with higher|lower {y}" plus "the next day" for lag 1, with a strength word: weak (0.3 to under 0.5), moderate (0.5 to under 0.7), strong (0.7 and above), and the r value.

**Flaws analytics:** for each problem with at least 3 occurrences in the last 90 days, and each of sleep, study and mood:
- `afterDays` = the distinct days following an occurrence day (that have a value for the metric); `otherDays` = all other days in the window with a value.
- Reported only when there are at least 3 afterDays and at least 3 otherDays, and the difference `(mean(after) - mean(other)) / mean(other) x 100` is at least 15% in absolute value.
- **Weekly trend:** occurrence counts for the last 4 Monday-start weeks (oldest to newest), with a direction comparing the last 2 weeks to the 2 before: `down`, `up` or `flat`.

**Daily brief:** `buildBrief(input)` returns `{ headline, lines }` with at most 4 lines, chosen in this priority order, skipping any that do not apply:
1. Headline: the greeting plus "Discipline score {n}/100" and the streak when it is 2 days or more.
2. The strongest same-day correlation among sleep to study, sleep to mood, study to mood and workout to mood that passes the caption rules (at least 10 pairs, abs(r) at least 0.3).
3. The strongest Flaws finding, phrased with the problem title.
4. Overdue to-dos count ("2 to-dos are overdue").
5. The active goal with the nearest deadline within 7 days and progress under 100% ("{title} is due in {n} days at {pct}%").
6. One suggestion: if yesterday's sleep was under target, "Aim for an earlier night tonight"; otherwise, if there has been no workout for 3 days, "A workout today would keep your week on track"; otherwise nothing.
If there is no data at all, the brief says "Log your first entries and I will start finding patterns."

## Pages

- **Dashboard:** a Brief card and a Discipline score card in a row under the greeting; the existing cards and timeline; then a Performance Overview card and a Correlation card (default sleep vs study, same day) before Recent Activity. `?perf=week|month|year` (default week) and `?cx`, `?cy`, `?lag` params; invalid values fall back to the defaults.
- **`/analytics`:** the full correlation explorer (any two different metrics, lag toggle), the Performance Overview (default month), and Flaws analytics (one block per problem with findings and the weekly trend). Empty states explain what data is needed.

## Architecture

- `lib/insights/`: `score.ts`, `performance.ts`, `correlation.ts`, `flaws.ts`, `brief.ts`, `params.ts` (parsers with fallbacks), each pure and unit-tested. Thin query helpers fetch `getDailyStats` over the needed span (up to 730 days for the year view), todos, goals and occurrences.
- Components: `ScoreCard`, `BriefCard`, `PerformanceCard` (sparklines), `CorrelationCard` (scatter plus trend line, client-side pickers that update the URL), `FlawsAnalytics`.
- No Server Actions are added, so there are no new write paths.

## Validation and errors

Search params go through parsers that fall back to defaults; a hand-typed junk value never crashes a page. Division by zero, empty series and zero variance never produce NaN or Infinity in any output or on screen.

## Testing

Unit tests first for all insight logic: Pearson r on known datasets (perfect positive and negative, a textbook example), constant series, fewer than 2 and fewer than 10 pairs, lag alignment across a missing day, the correlation window; score at its extremes (all zero, everything met) and component weights; streak with and without entries today; period deltas with an empty or zero previous period; flaws thresholds (2 vs 3 occurrences, 14% vs 15% difference); the brief's priority order, its 4-line cap and its empty state; param parsers. The Playwright smoke test is extended to log entries and see the score, brief and charts appear. Everything is verified live on the local database; nothing is deployed.

## Delivery

One branch (`feat/stage3`), a plan with tasks in dependency order (pure logic first, then queries, then cards, then pages, then smoke test), reviewed by a fresh reviewer before merge.

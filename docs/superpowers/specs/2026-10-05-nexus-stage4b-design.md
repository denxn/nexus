# Nexus: Stage 4b design (Detail pages)

Date: 2026-10-05. Second Stage 4 sub-stage (4a release readiness is merged; 4c notes and 4d reminders follow). Earlier Global Constraints still apply: Rome day cut, `requireSession()` first in every Server Action, Zod on every input including ids, Rome day keys bounded to 1970 to 2100, vitest under TZ=UTC, nothing is deployed.

## Purpose

Make the Workouts, Study and Sleep sidebar pages real: full history of one entry type with a range, summary numbers, a daily chart, filters and edit/delete. Success means Dennis can answer "how much have I trained, studied or slept lately, and when?" in one page per type.

## Scope

In: `/workouts`, `/study`, `/sleep` on one shared template; range selector; per-type summary tiles; daily chart; subject/note filter; paginated history grouped by day with edit and delete; a "Log {type}" button that opens quick-log with the type preselected.
Out (YAGNI): Mood and Calories pages, exercise-by-exercise workout details, CSV export or import, new tables or migrations, new Server Actions (edit and delete reuse the Stage 1 actions).

## URL parameters (all optional, invalid values fall back)

- `range`: `7`, `30`, `90`, `365` or `all` (default `30`). A window is the last N Rome days ending today; `all` starts at the first entry of that type (at most 3650 days back; with no entries it is 30 days).
- `label`: trimmed, at most 80 characters; blank means no filter. Matching is case-insensitive on the trimmed label.
- `page`: integer >= 1 (default 1), clamped to the last page.

## Summary tiles (computed from the filtered entries in the window)

- **Workouts:** sessions; total time; average length (0 when none); longest session; sessions per week (`sessions / (window days / 7)`, one decimal); "n/target this week" for the current Monday to today week.
- **Study:** total time; study days (days with study > 0); average per study day; best day (day and minutes); days that met the daily study target; top 5 subjects by minutes (entries grouped by label).
- **Sleep:** average hours over days with sleep logged (several entries a day add up); best and worst day; days that met the sleep target; sleep debt = sum over logged days of `max(0, target - hours)`; average wake-up time = mean of the Rome clock time of the sleep entries (a plain average, documented as unsuitable for waking near midnight).
Empty ranges show zeros or dashes, never NaN.

## Chart and list

- Daily chart over the window (zero-filled): bars for workout and study minutes, a line for sleep hours, with a dashed target line for study (daily target) and sleep.
- Label chips: the 8 most frequent labels in the window (unfiltered by label), grouped case-insensitively, shown with the most common original spelling; clicking one sets `label`, clicking the active one clears it.
- History: entries grouped by Rome day, newest day first and newest entry first within a day, each day with a total; 50 entries per page with Previous and Next; each entry has Edit (opens the quick-log sheet) and Delete (confirm, then the existing `deleteEntry` action).

## Architecture

Pure tested modules in `lib/history/`: `params.ts` (`parseHistoryParams`), `paginate.ts`, `labels.ts` (`labelBreakdown`), `group.ts` (`groupByDay`), `summaries.ts` (`summarizeWorkouts`, `summarizeStudy`, `summarizeSleep`); `lib/time.ts` gains `romeMinutesOfDay` and a clock formatter. `lib/history/queries.ts` reads the entries of one type for the window (one query), derives chips from all of them, then applies the label filter in memory. Server Components render the pages; small client components handle the range tabs' links, label chips, history list actions and the "Log" button. `QuickLog`'s `openNew` takes an optional type.

## Testing

Unit tests first for every pure function: params fallbacks (junk, arrays, `all`, page 0 or negative, long labels), pagination clamping, label grouping (case, whitespace, ties, empty labels), grouping by Rome day around 23:30 and DST, each summary with empty, single-entry and tied inputs, the target comparisons at exactly the target, wake-up time formatting. A Playwright test covers the three pages, a label filter and an edit. Everything is verified live on the demo data; nothing is deployed.

## Delivery

One branch (`feat/stage4b`), no migration, tasks in dependency order, a fresh-reviewer pass, then merge.

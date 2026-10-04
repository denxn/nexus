# Nexus: Personal Life Dashboard (Stage 1 design)

Date: 2026-10-04

## Purpose

A single-user "Jarvis-style" life dashboard (working name **Nexus**) for Dennis, modeled on the supplied mockup: dark glass UI, daily stat cards with progress rings, a combined Life Timeline, and later goals, problems, to-dos and AI insights. Success means logging a workout, study session, sleep, meal or mood takes about 5 seconds, and the dashboard shows an accurate picture of the day and the last 30 days.

## Decisions (agreed)

- **Data entry:** manual first; structure allows imports (Apple Health, Google Calendar) later.
- **Platform:** web app, usable from phone and laptop.
- **Storage:** cloud Postgres (Neon), deployed to Vercel. Single user, simple login.
- **Stack:** Next.js (App Router, TypeScript), Prisma, Recharts, Zod.
- **Delivery in stages**, each with its own spec, plan and build:
  - **Stage 1 (this spec):** login, quick-log, stat cards, Life Timeline, sidebar shell.
  - **Stage 2:** Plan area (Goals, Problems, To-do), Calendar and agenda, This Week grid, Recent Activity expansion.
  - **Stage 3:** Performance Overview, correlation scatter, AI daily brief, discipline score, Flaws analytics.
  - **Later:** Apple Health and Google Calendar imports.

## Scope of Stage 1

In: auth, `Entry` and `Target` data model, quick-log sheet, four stat cards (Workout, Study, Sleep, Calories), Life Timeline (7/30/90 days, five metrics including Mood), Recent Activity feed with edit and delete, sidebar with placeholder routes, dark glass theme.

Out: Goals, Problems, To-do, Calendar, correlation, AI brief, and imports. The `source` and `externalId` fields exist on `Entry` so imports can be added later, but no import code is written in Stage 1.

## Data model

`Entry`
- `id`
- `type`: WORKOUT | STUDY | SLEEP | MEAL | MOOD
- `occurredAt` (timestamp)
- `value` (number): workout = minutes, study = minutes, sleep = hours, meal = kcal, mood = 1 to 10
- `label` (string, optional)
- `meta` (JSON, optional): type-specific extras (exercises, sleep quality)
- `source`: MANUAL | APPLE_HEALTH | GOOGLE_CAL (only MANUAL used now)
- `externalId` (string, optional); unique together with `source` so re-imports never duplicate

`Target`
- `type`, `period` (DAY | WEEK), `value`. Defaults: study 240 min/day, sleep 8 h/day, calories 2800 kcal/day, workouts 4/week.

Stage 2 will add `Goal`, `Problem` (with occurrence log) and `Todo`; Stage 1 does not create these tables.

Rules:
- Days are cut in the **Europe/Rome** timezone.
- A sleep entry belongs to the day the user **wakes up**.
- Totals and percentages are computed from `Entry` against `Target`, never stored.

## Pages

- `/login`: password form.
- `/`: Dashboard (four stat cards, Life Timeline, Recent Activity).
- `/plan`, `/workouts`, `/study`, `/sleep`, `/calendar`, `/goals`, `/analytics`, `/flaws`, `/notes`: sidebar placeholders showing "coming soon"; `/plan` is filled in Stage 2.
- Quick-log: floating `+` button, and the `N` key on desktop, opens a sheet. Choose a type, fill 1 or 2 fields, defaults to now, save. Entries can be edited or deleted from Recent Activity.

## Dashboard behavior

- **Stat card:** today's total, ring (today against `Target`), 7-day bar strip. Workout card shows "n/4 this week".
- **Life Timeline:** range selector 7/30/90 days. Each metric is normalized to 0 to 10 for overlay; the hover tooltip shows real values for that day. Metrics toggle on and off via the legend.

## Architecture

- Server Components read daily aggregates through Prisma. Server Actions handle create, update and delete of entries; no separate API layer.
- `lib/db`: Prisma client and queries. `lib/stats`: `getDailyStats(range)` producing everything the cards and timeline need, in one place. `components/`: UI.
- Theme through CSS variables; one accent per metric (workout green, study blue, sleep purple, calories orange, mood yellow).
- Auth: single password in an environment variable; successful login sets a signed session cookie; middleware requires it on every route except `/login`. No user table.

## Errors and validation

Zod validates every Server Action input. Errors appear inline in the log sheet. Failed saves never fail silently and keep the typed values.

## Testing

- Unit tests for `lib/stats`: Europe/Rome day boundaries, sleep attributed to wake date, target percentages, empty days.
- Playwright smoke test: log in, log a study entry, see the Study card update.

## Delivery

Run locally first. Deploy to Vercel with Neon only after the user approves; secrets (database URL, password, session secret) live in environment variables, never in the repo.

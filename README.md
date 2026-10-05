# Nexus

A personal life dashboard: log workouts, study, sleep, meals and mood, then see them as daily stat cards and one combined Life Timeline. Specs and plans live in `docs/superpowers/`.

**Stack:** Next.js (App Router), Prisma, Postgres (Neon), Recharts, Zod, Vitest, Playwright.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from the example and fill it in (never commit it):

   ```bash
   cp .env.example .env.local
   ```

   - `DATABASE_URL`: a Postgres connection string (for example a Neon dev branch).
   - `APP_PASSWORD`: the single password you log in with.
   - `SESSION_SECRET`: a long random string, for example from `openssl rand -base64 32`.

   If `APP_PASSWORD` or `SESSION_SECRET` is missing, nobody can log in.

3. Create the tables:

   ```bash
   npx prisma migrate deploy
   ```

4. Start the app and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Using it

- **Plan** (`/plan`) has three tabs: Goals (manual, or measured from your logs), Problems (with occurrences) and To-do. `/goals` and `/flaws` redirect there.
- **Calendar** (`/calendar`) shows a month grid and a day agenda with your events, to-dos due and what you logged. Add events with **+ Add**.
- The dashboard shows a Daily brief and a Discipline score at the top, then Goals, This Week and a mini Calendar under the timeline, and a Performance overview and Activity correlation chart below.
- **Analytics** (`/analytics`) has the full Performance overview, a correlation explorer (any two metrics, same day or next day) and Flaws analytics: how a problem's occurrences relate to sleep, study and mood on the following day.
- The brief, score and insights are computed from your own data. Nothing leaves the app, and no API key is needed.
- Press **N** (or tap **+**) to log an entry. Entries can be edited or deleted from Recent Activity.
- The **When** field defaults to now (Rome time); change it to back-date an entry, for example last night's sleep. Decimal commas work (`7,5`).
- Days are cut in the Europe/Rome timezone. A sleep entry counts for the day you wake up.
- Default daily targets: study 4 h, sleep 8 h, calories 2,800, workouts 4 per week.

## Tests

Unit tests (no database needed):

```bash
npm test
```

End-to-end smoke test. It starts its own dev server on port 3200 using the database in your env files, logs in with throwaway credentials, logs a study entry and deletes it again. Install the browser once, then run:

```bash
npx playwright install chromium
npx playwright test
```

## Stages

Stage 1 covers login, quick-log, stat cards and the Life Timeline. Stage 2 adds Plan (Goals, Problems, To-do), the Calendar and the This Week grid. Stage 3 adds the discipline score, daily brief, performance overview, correlation chart and Flaws analytics.

# Nexus

A personal life dashboard: log workouts, study, sleep, meals and mood, then see them as daily stat cards and one combined Life Timeline. Stage 1 of the plan in `docs/superpowers/`.

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

- Press **N** (or tap **+**) to log an entry. Entries can be edited or deleted from Recent Activity.
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

Stage 1 (this) covers login, quick-log, stat cards and the Life Timeline. Goals, Problems, To-do and the Calendar come in Stage 2; the correlation view and AI daily brief in Stage 3.

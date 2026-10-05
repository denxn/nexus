# Nexus: Stage 4a design (Release readiness)

Date: 2026-10-05. First of four Stage 4 sub-stages (4a release readiness, 4b detail pages, 4c notes, 4d reminders and recurring; each gets its own spec and plan). Builds on the merged Stage 1 to 3 specs; their Global Constraints still apply (Rome day cut, `requireSession()` first in every Server Action, Zod on every input including ids, saves through `withSaveErrors`, secrets only in env files, vitest under TZ=UTC).

## Purpose

Make the app safe and ready to put online: throttle password guessing, handle crashes gracefully, close the minor issues deferred from Stages 1 to 3, add basic security and privacy headers, and document deployment to Vercel with Neon. Success means the app can be deployed by following one guide, a guessing attack is slowed to a crawl, and no known minor defect remains open.

## Scope

In: login throttling, error and not-found pages, the deferred minor fixes listed below, security headers and noindex, build scripts and a deployment guide.

Out (YAGNI): two-factor or passkeys, multiple users, email alerts, a CSP header (Next's inline scripts make it risky), actually deploying (only on an explicit go-ahead later), and Stage 4b to 4d features.

## 1. Login throttling

**Data:** new table `LoginAttempt` (`id`, `ip` String, `at` DateTime default now, index on `at`) and one migration. Only failed attempts are stored.

**Rules** (pure function `evaluateLockout(failures: { ip: string; at: Date }[], ip: string, now: Date, limits)` in `lib/loginLockout.ts`):
- Window = 15 minutes. A failure counts while `at > now - window`.
- **Per IP:** locked when that IP has at least 5 failures in the window. **Global:** locked for everyone when all IPs together have at least 20 failures in the window.
- A lock ends when the oldest failure counting toward the limit leaves the window: for a limit of N it ends at `(the Nth most recent counting failure).at + window`. The result is `{ locked: false }` or `{ locked: true, retryAfterMinutes }` with minutes rounded up and at least 1.
- Limits are overridable by env vars `LOGIN_MAX_ATTEMPTS` (5), `LOGIN_GLOBAL_MAX` (20) and `LOGIN_WINDOW_MINUTES` (15); invalid or non-positive values fall back to the defaults.

**Login flow (`login` action):** 1) read the IP from `x-forwarded-for` (first entry, trimmed), else `x-real-ip`, else `"unknown"`; 2) load failures in the window and evaluate; if locked, return "Too many attempts. Try again in N minute(s)." without comparing the password (so even the correct password is refused and nothing is recorded); 3) otherwise check the password; 4) wrong: record a failure, prune rows older than one day, wait about 500 ms, return "Wrong password"; 5) correct: delete that IP's failures and set the session. If the lockout check itself throws, the login is refused with "Try again later" (fail closed).

## 2. Error handling

`app/error.tsx` (client), `app/global-error.tsx` and `app/not-found.tsx`: a short friendly message, a "Try again" button (`reset`) and a "Log in again" link to `/login` (which covers an expired session). No stack traces or error details are shown.

## 3. Deferred minor fixes

Each has a test first where there is logic to test.

Stage 1:
- `shouldOpenQuickLog` does not throw when `key` is undefined (returns false).
- The quick-log sheet cannot be closed (Escape, backdrop, Cancel) while a save is pending.

Stage 2:
- An event whose end is not after its start as instants is rejected, including across the DST gap (for example 02:30 to 03:15 on the spring-forward day); error on `endTime`.
- A STUDY or WORKOUT goal target whose converted minutes would be less than 1 is rejected with an error on `target`.
- Completed to-dos are ordered newest-completed first by sorting the completed subset on its own (not via a comparator that returns 0 for mixed pairs).
- `withSaveErrors` maps Prisma `P2003` (foreign key: parent deleted) as well as `P2025` to "That entry no longer exists."
- Changing the Measure type in the goal edit form clears the Target field.
- Problem occurrences: the query loads up to 100 per problem; the panel shows the latest 10 with a "Show all (n)" toggle.

Stage 3:
- The Flaws 15% threshold is applied to the unrounded change (the displayed value stays rounded).
- The brief's workout suggestion also applies when there is no workout in the whole fetched window, provided the user has at least 3 active days.
- `correlate` returns a trend line only when r is not null.
- The correlation strength word is derived from r rounded to 2 decimals, so it always agrees with the printed value.
- Accessibility: the score ring is labelled "Discipline score 72 out of 100"; the same-day/next-day toggle exposes `aria-pressed`; the Flaws weekly bars have a real role and summary label; the weekly bars stay proportional (counts and labels sit outside the fixed-height bar area).
- The correlation picker shows a pending state (selects disabled, `aria-busy`) while the page reloads, and picking the same metric twice normalizes the URL with the same rule as the server.
- Query cost: the dashboard fetches daily stats once (span from `insightSpan`, at least 365 days) and derives the timeline range and cards from it; `getInsightData` accepts the prefetched stats, targets and goals; the todos read is bounded to open todos plus those due in the last 60 days.

## 4. Security headers and privacy

`next.config.ts` adds headers to all routes: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. `app/robots.ts` disallows everything and the root metadata sets `robots: { index: false, follow: false }`.

## 5. Deployment readiness

- `package.json`: `postinstall` runs `prisma generate`; `vercel-build` runs `prisma generate && prisma migrate deploy && next build`; `engines.node` is `>=20`.
- `prisma.config.ts` reads `DIRECT_URL` for migrations when set, falling back to `DATABASE_URL` (Neon recommends a direct, non-pooled URL for migrations). `.env.example` documents `DIRECT_URL` as optional and the login limits as optional.
- `docs/deploy.md`: create the Neon project and copy both connection strings; create the Vercel project from the repo; set `DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET` (with the `openssl rand -base64 32` command) and the optional limits; what the first deploy does; a first-login checklist (log in, log an entry, check the dashboard, check a wrong password locks out after 5 tries); rollback notes; and a reminder that `x-forwarded-for` is only trustworthy behind Vercel's proxy.
- Nothing is deployed in this stage.

## Testing

Unit tests first for: `evaluateLockout` (exactly 4, 5 and 6 failures; a failure at the window edge; per-IP isolation; the global cap; `retryAfterMinutes` rounding and its minimum of 1; the unlock time with more than N failures), IP header parsing, env limit parsing, and every logic fix above. Live checks on the local database: 5 wrong passwords lock the login, the correct password is then refused, the message shows the minutes left, a different IP is unaffected, and the attempts are cleared afterwards; the error and not-found pages render; the headers are present. The Playwright suite stays green (the login throttle must not break it: its runs succeed on the first try, so no failures are recorded).

## Delivery

One branch (`feat/stage4a`), one migration, a plan with tasks in dependency order (lockout logic, then the login flow and migration, then error pages and headers, then the minor fixes grouped by area, then deployment files and the guide), a fresh-reviewer pass, then merge.

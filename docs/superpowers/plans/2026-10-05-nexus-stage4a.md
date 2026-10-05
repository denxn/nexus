# Nexus Stage 4a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release readiness: login throttling, error pages, the deferred minor fixes from Stages 1 to 3, security headers, and deployment files and guide.

**Architecture:** Pure lockout logic in `lib/loginLockout.ts` consumed by the `login` Server Action with a `LoginAttempt` table; Next error and not-found files; targeted fixes with tests first; config and docs for Vercel and Neon. Nothing is deployed.

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, Vitest (TZ=UTC), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-nexus-stage4a-design.md`

## Global Constraints

- Lockout: window 15 min; per IP 5 failures; global 20 failures; lock ends when the oldest counting failure leaves the window; attempts during a lock are not recorded; retry minutes rounded up, minimum 1; env overrides `LOGIN_MAX_ATTEMPTS`, `LOGIN_GLOBAL_MAX`, `LOGIN_WINDOW_MINUTES` fall back on invalid or non-positive values.
- Login fails closed: a lockout-check error refuses the login.
- Wrong passwords wait about 500 ms; a successful login clears that IP's failures; rows older than one day are pruned on each failure write.
- Security headers on all routes: nosniff, frame DENY, strict-origin-when-cross-origin referrer, camera/microphone/geolocation disabled; no CSP; noindex everywhere.
- Every minor fix gets a failing test first where there is logic.
- Standing rules: `requireSession()` first in every Server Action, Zod on every input including ids, Rome day keys, vitest under TZ=UTC. Nothing is deployed.

## Review Focus

- Exactly 4, 5 and 6 failures; a failure exactly at the window edge; one IP locked while another is not; the global cap; the correct password refused while locked (Task 1, 2).
- A thrown error while checking the lockout never lets a login through (Task 2).
- The Playwright suite still logs in on the first try and records no failures (Task 8).
- Event end before start across the DST gap; a goal target that rounds to 0 minutes (Task 5).
- Error and not-found pages never leak details; headers actually present (Task 3).

---

### Task 1: Lockout logic, IP parsing and limits

**Files:** Create `lib/loginLockout.ts`; Test `lib/loginLockout.test.ts`.

**Interfaces:** Produces `type Limits = { perIp: number; global: number; windowMinutes: number }`, `parseLimits(env: Record<string, string | undefined>): Limits` (defaults 5, 20, 15; invalid or non-positive values fall back per field), `clientIp(headers: { get(name: string): string | null }): string` (first entry of `x-forwarded-for` trimmed, else `x-real-ip`, else `"unknown"`), and `evaluateLockout(failures: { ip: string; at: Date }[], ip: string, now: Date, limits: Limits): { locked: false } | { locked: true; retryAfterMinutes: number }`.

- [ ] **Step 1:** Write failing tests: 4 failures from one IP not locked, 5 locked, 6 locked; a failure exactly `window` old does not count (and `window - 1s` old does); another IP with 0 failures is not locked while the first is; 19 global failures across IPs not locked, 20 locked for an IP with none; retry minutes: lock ending in 14m30s gives 15, in 1s gives 1, never below 1; with 7 failures the unlock time is set by the 5th most recent (the Nth), not the oldest; `parseLimits({})` gives 5/20/15, `{LOGIN_MAX_ATTEMPTS: "3"}` gives perIp 3, `"0"`, `"-2"`, `"abc"`, `""` fall back; `clientIp` takes the first of `"1.2.3.4, 10.0.0.1"` trimmed, falls back to `x-real-ip`, then `"unknown"`.
- [ ] **Step 2:** Run `npx vitest run lib/loginLockout.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit `feat: login lockout rules`.

### Task 2: LoginAttempt table and the login flow

**Files:** Modify `prisma/schema.prisma`, `app/actions/auth.ts`; Create the migration; Create `lib/loginAttempts.ts`.

**Interfaces:** Consumes Task 1. Produces model `LoginAttempt { id, ip, at default now, @@index([at]) }`; `lib/loginAttempts.ts` with `recentFailures(windowMinutes: number, now?: Date): Promise<{ ip: string; at: Date }[]>`, `recordFailure(ip: string): Promise<void>` (inserts, then deletes rows older than 1 day), `clearFailures(ip: string): Promise<void>`. The `login` action: read headers via `next/headers`; `parseLimits(process.env)`; if the check throws return `{ ok: false, errors: { form: "Try again later" } }`; if locked return `{ ok: false, errors: { form: "Too many attempts. Try again in N minute(s)." } }` without comparing the password; wrong password records a failure, waits 500 ms and returns "Wrong password"; correct password clears the IP's failures then sets the session.

- [ ] **Step 1:** Add the model; generate the migration SQL with `prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script` into a new migration folder and apply with `npx prisma migrate deploy` (the local dev DB cannot run `migrate dev`); `npx prisma generate`.
- [ ] **Step 2:** Implement `lib/loginAttempts.ts` and rewire `login`.
- [ ] **Step 3:** Suite and `tsc`. Verify live on the local DB with the dev server: 5 wrong passwords then the 6th attempt (even correct) shows "Too many attempts…" with minutes; a request with a different `x-forwarded-for` header still works; the DB shows 5 rows and not 6; after clearing the table the correct password logs in; a correct login removes that IP's rows. Clear `LoginAttempt` afterwards.
- [ ] **Step 4:** Commit `feat: throttle login attempts`.

### Task 3: Error pages, headers and noindex

**Files:** Create `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/robots.ts`; Modify `next.config.ts`, `app/layout.tsx`.

**Interfaces:** `error.tsx` client component `({ reset }: { error: Error; reset: () => void })` with a message, a "Try again" button and a "Log in again" link to `/login`; it renders no error details. `not-found.tsx` links to the dashboard. `robots.ts` returns `{ rules: { userAgent: "*", disallow: "/" } }`. `next.config.ts` `headers()` adds the four headers to `/:path*`. Root metadata gets `robots: { index: false, follow: false }`.

- [ ] **Step 1:** Implement the files.
- [ ] **Step 2:** Verify live: `/nope` shows the not-found page; the four headers are present on `/login`; `/robots.txt` disallows all; force an error (temporarily throw in a scratch route, then remove it) and confirm the friendly page with no details.
- [ ] **Step 3:** Suite and `tsc`. Commit `feat: error pages, security headers and noindex`.

### Task 4: Stage 1 minor fixes

**Files:** Modify `lib/hotkey.ts`, `lib/hotkey.test.ts`, `components/QuickLog.tsx`.

- [ ] **Step 1:** Add a failing test: `shouldOpenQuickLog` with `key` undefined returns false and does not throw. Run: FAIL. Fix with optional chaining. Run: PASS.
- [ ] **Step 2:** In `QuickLog.tsx`, report the form's pending state to the provider (`onPendingChange`) and ignore Escape, backdrop clicks and Cancel while pending (the Cancel button is disabled). Verify live that the sheet stays open while a save is in flight (slow it down temporarily by logging with the dev server's network throttled, or by an artificial delay removed afterwards).
- [ ] **Step 4:** Suite and `tsc`. Commit `fix: stage 1 minors (hotkey without key, sheet closing while saving)`.

### Task 5: Stage 2 minor fixes

**Files:** Modify `lib/plan/schemas.ts`, `lib/plan/schemas.test.ts`, `lib/entries/save.ts`, `lib/entries/save.test.ts`, `lib/plan/queries.ts`, `components/plan/GoalsPanel.tsx`, `components/plan/ProblemsPanel.tsx`.

- [ ] **Step 1:** Failing tests: event on 2026-03-29 with 02:30 to 03:15 is rejected with an error on `endTime` (compare instants); an event 09:00 to 10:00 still passes; STUDY `target: "0.005"` is rejected with an error on `target` and `target: "0.02"` (1.2 minutes, rounds to 1) passes; WORKOUT behaves the same; SLEEP and MEAL targets are unaffected; `withSaveErrors` maps `{ code: "P2003" }` to "That entry no longer exists."; a pure `sortCompleted(todos: { doneAt: Date | null }[])` in `lib/plan/todoOrder.ts` orders newest `doneAt` first with nulls last, stable on ties.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement: instant comparison in `eventSchema`; minutes >= 1 check in `goalSchema`; P2003 mapping; `sortCompleted` used by `getTodos`; occurrences query `take: 100`; `ProblemsPanel` shows the latest 10 with a "Show all (n)" toggle; `GoalsPanel` clears the Target field when the Measure select changes (controlled value reset).
- [ ] **Step 4:** Run the suite. Expected: PASS. Verify live: the occurrence toggle with more than 10 occurrences (seed), the target field clearing, a completed-todo order check. Commit `fix: stage 2 minors`.

### Task 6: Stage 3 minor fixes

**Files:** Modify `lib/insights/flaws.ts`, `brief.ts`, `briefInput.ts`, `correlation.ts`, `queries.ts` and their tests; `components/ScoreCard.tsx`, `Ring.tsx`, `CorrelationPicker.tsx`, `FlawsAnalytics.tsx`, `insights.module.css`; `app/(app)/page.tsx`, `app/(app)/analytics/page.tsx`.

- [ ] **Step 1:** Failing tests: flaws threshold on the unrounded change (after-mean 85.4 vs 100 is not reported; 85.0 is; the displayed percent is still rounded); `correlate` returns `trend: null` when r is null (constant y) and a trend otherwise; `captionFor` with r 0.4996 says "moderate" and prints "0.50", 0.6996 says "strong" and prints "0.70", 0.2996 gives "No clear link" (rounded 0.30 passes the threshold: decide on the rounded value consistently and assert it); brief: with `daysSinceWorkout: null` and `activeDays: 3` the workout suggestion appears, with `activeDays: 2` it does not, and a sleep trigger still wins; `normalizeCorrelation(cx, cy)` (extracted from `parseCorrelationParams`) returns two different metrics for equal inputs.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement those. Then the UI: `Ring` takes an optional `label`; `ScoreCard` passes "Discipline score N out of 100"; the lag toggle gets `aria-pressed`; `FlawsAnalytics` weekly bars container gets `role="img"` and an `aria-label` such as "Occurrences per week: 2, 2, 1, 0" and the bar area gets a fixed height with count and label outside it; `CorrelationPicker` uses `useTransition` (selects disabled and `aria-busy` while pending) and normalizes cy when equal to cx before updating the URL.
- [ ] **Step 4:** Query cost: add `BriefInput.activeDays`; `getInsightData` accepts an optional prefetched `{ stats, targets, goals }`; the dashboard fetches `getDailyStats(insightSpan(perf))`, `getTargets()` and `getGoals()` once, passes them in, and derives the timeline and cards with `stats.slice(-range)`; the todos read becomes `where: { OR: [{ done: false }, { dueDate: { gte: <60 days ago> } }] }`. `/analytics` keeps calling `getInsightData` without prefetch.
- [ ] **Step 5:** Suite, `tsc` and a live look at the dashboard and `/analytics` (same numbers as before, cards intact, no console errors). Commit `fix: stage 3 minors`.

### Task 7: Deployment files and guide

**Files:** Modify `package.json`, `prisma.config.ts`, `.env.example`, `README.md`; Create `docs/deploy.md`.

- [ ] **Step 1:** `package.json`: `"postinstall": "prisma generate"`, `"vercel-build": "prisma generate && prisma migrate deploy && next build"`, `"engines": { "node": ">=20" }`. `prisma.config.ts`: `datasource.url` from `DIRECT_URL` when set, else `DATABASE_URL`. `.env.example`: add optional `DIRECT_URL` and the login limit variables with comments.
- [ ] **Step 2:** Write `docs/deploy.md` per the spec (Neon project and both strings, Vercel project, env vars with the secret-generation command, what the first deploy does, first-login checklist including the lockout check, rollback notes, the `x-forwarded-for` caveat, and an explicit note that the guide was not run). Link it from the README and mention throttling and the error pages.
- [ ] **Step 3:** Verify `npm run build` succeeds locally with the dummy env (stop the dev server first) and `npx prisma generate` runs from `postinstall`. Commit `chore: deployment scripts and guide`.

### Task 8: End-to-end check

**Files:** Modify `e2e/smoke.spec.ts` or add `e2e/release.spec.ts`.

- [ ] **Step 1:** Add a Playwright test: an unknown route shows the not-found page with a link back; the response headers on `/login` include the security headers; `/robots.txt` disallows everything. Do not trigger lockouts (that would affect the other specs).
- [ ] **Step 2:** Run `npx playwright test`. Expected: all PASS, and the `LoginAttempt` table has no rows afterwards. Run `npx vitest run` and `npx tsc --noEmit`. Commit `test: release readiness checks`.

# Deploying Nexus to Vercel with Neon

This guide takes the app from your machine to a private URL. **It has not been run end to end yet**: nothing has been deployed. Follow it step by step and check each result; the local build command in step 6 has been tested.

Nexus is a single-user app protected by one password, so treat the password and the session secret like keys.

## What you need

- A GitHub (or GitLab/Bitbucket) account. The project has no remote yet; create an empty private repository and push this one to it.
- A [Neon](https://neon.tech) account (free tier is fine) and a [Vercel](https://vercel.com) account.
- Node 20 or newer and `openssl` on your machine, for generating secrets.

## 1. Create the database (Neon)

1. Create a Neon project. Pick the region closest to you (for Rome, an EU region).
2. In the project's **Connect** dialog copy two connection strings:
   - the **pooled** one (the host contains `-pooler`): this is `DATABASE_URL`, used by the running app;
   - the **direct** one (no `-pooler`): this is `DIRECT_URL`, used only for migrations.
3. Both must end with `?sslmode=require`. Keep them private; never commit them.

## 2. Generate the secrets

```bash
openssl rand -base64 32   # SESSION_SECRET
```

Choose `APP_PASSWORD` yourself: a long passphrase (16+ characters). It is the only thing protecting your data.

## 3. Create the Vercel project

1. In Vercel choose **Add New, Project** and import the repository.
2. Framework preset: **Next.js** (detected automatically). Leave the install command alone. Vercel automatically uses the `vercel-build` script from `package.json`, which runs `prisma generate`, `prisma migrate deploy` and `next build`.
3. Before the first deploy, open **Environment Variables** and add these for **Production** (and Preview too if you want preview deployments to work):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `APP_PASSWORD` | your passphrase |
| `SESSION_SECRET` | the `openssl` output |

Optional login limits (defaults are 5 failures per IP, 20 in total, over 15 minutes): `LOGIN_MAX_ATTEMPTS`, `LOGIN_GLOBAL_MAX`, `LOGIN_WINDOW_MINUTES`.

If `APP_PASSWORD` or `SESSION_SECRET` is missing, nobody can log in: the app fails closed.

## 4. First deploy

Click **Deploy**. During the build, `prisma migrate deploy` creates all the tables in Neon (it only applies migrations that are not applied yet). The build fails, and nothing goes live, if a migration fails.

## 5. First-login checklist

Open the deployment URL and check, in order:

- [ ] `/` redirects to `/login`.
- [ ] A wrong password shows "Wrong password"; the correct one lands on the dashboard.
- [ ] Log an entry with the **+** button (or `N`) and see it on the dashboard and in Recent Activity. Delete it.
- [ ] The Plan and Calendar pages load.
- [ ] `/robots.txt` shows `Disallow: /`, and the response headers on `/login` include `X-Frame-Options: DENY` (browser dev tools, Network tab).
- [ ] Lockout: in a private window enter a wrong password 5 times. The 6th attempt, even with the correct password, shows "Too many attempts. Try again in N minutes." Wait it out, or clear the table: in the Neon SQL editor run `DELETE FROM "LoginAttempt";`.

## 6. Test the build on your machine first (recommended)

This runs the same steps Vercel runs, against whatever `DATABASE_URL` is in your `.env.local` or `.env`:

```bash
npm run vercel-build
```

Use a throwaway database for this, not production data. (Migrations are additive, but it is a good habit.)

## Operating notes

- **Client IP and throttling:** the login throttle identifies a visitor by the `x-forwarded-for` header. Behind Vercel's proxy that is trustworthy. If you ever host somewhere without a proxy that sets it, visitors could spoof the header; the global limit (20 failures) still stops guessing.
- **Backups:** Neon keeps a point-in-time history on its plans; check its retention before relying on it, and consider an occasional export.
- **Rollback:** in Vercel, use **Instant Rollback** on a previous deployment. Database migrations are not reverted automatically. All migrations so far only add things, so an older app version keeps working against a newer schema.
- **Changing the password or secret:** update the environment variable in Vercel and redeploy. Changing `SESSION_SECRET` signs everyone out.
- **Custom domain:** optional; add it under the project's Domains. HTTPS is automatic and session cookies are marked `secure` in production.
- **Privacy:** the app sends nothing to third parties. Pages are marked `noindex` and `robots.txt` disallows crawling.

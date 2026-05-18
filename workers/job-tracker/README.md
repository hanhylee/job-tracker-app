# Job Tracker API

Cloudflare Worker API for tracking job applications. Built with [Hono](https://hono.dev), [Better Auth](https://www.better-auth.com), Drizzle, and remote **D1**.

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in secrets
wrangler login
```

Generate a secret: `npx auth@latest secret`

## Development

```bash
npm run dev
```

Open **http://localhost:8787**. The worker uses your **remote** D1 database (`wrangler.jsonc` has `"remote": true`).

Set in `.dev.vars`:

```env
BETTER_AUTH_URL=http://localhost:8787
FRONTEND_URL=http://localhost:5173
```

## Frontend (Vercel)

The web app lives in `frontend/` at the repo root. See [`frontend/README.md`](../../frontend/README.md).

The browser only ever calls `https://www.cancareer.com/api/*` — Vercel rewrites those to this worker server-side (see root `vercel.json`). The worker is **not** exposed to the browser directly; cookies are scoped to `www.cancareer.com` so iOS WebKit ITP doesn't block them.

Production env (`wrangler.jsonc` → `env.production.vars`):

```jsonc
"BETTER_AUTH_URL": "https://www.cancareer.com",
"FRONTEND_URL":    "https://cancareer.com,https://www.cancareer.com"
```

**Do not** set `BETTER_AUTH_URL` to the workers.dev URL or to `api.cancareer.com` — better-auth uses this value to build OAuth callback URLs and cookie domain; it must match what the browser sees. Better-auth also uses the URL's pathname as its `basePath`, so the URL must have an empty path (or you must also change the worker mount path in `src/index.ts`).

CORS and better-auth `trustedOrigins` are derived from `FRONTEND_URL`. The `/api/auth/*` handler in `src/index.ts` explicitly re-wraps better-auth's raw `Response` to attach CORS headers (Hono's middleware skips raw responses returned directly from handlers).

GitHub OAuth App callback URL: `https://www.cancareer.com/api/auth/callback/github`.

### Applications API

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/applications` | Session cookie |
| `POST` | `/api/applications` | Session cookie |
| `GET` | `/api/applications/:id` | Session cookie |
| `PATCH` | `/api/applications/:id` | Session cookie |
| `DELETE` | `/api/applications/:id` | Session cookie |
| `PUT` | `/api/applications/:id/resume` | Session cookie — PDF body |
| `GET` | `/api/applications/:id/resume` | Session cookie — streams PDF |
| `DELETE` | `/api/applications/:id/resume` | Session cookie |
| `GET` | `/api/r2/usage` | Session cookie — monthly R2 free-tier counters |
| `POST` | `/api/applications/:id/analyze` | Pro + session — starts ATS analysis (`202`) |
| `GET` | `/api/applications/:id/analysis` | Pro + session — latest analysis status/result |
| `GET` | `/api/applications/analyses/:analysisId` | Pro + session — poll by analysis id |

`PATCH` accepts optional `jobDescription` (pasted JD text). Analysis requires Pro (`user.is_pro = 1`) and the **resume-analyzer** worker via service binding. See [`workers/resume-analyzer/README.md`](../resume-analyzer/README.md).

## Sign in (magic link)

```powershell
Invoke-RestMethod -Uri "http://localhost:8787/api/auth/sign-in/magic-link" `
  -Method Post `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email": "you@example.com", "callbackURL": "http://localhost:8787/"}'
```

The link is printed in the terminal. After verifying, use the session cookie on protected routes (`/api/applications/*`).

## API integration tests

Smoke tests against the local dev server (`test/test-api.ts`). Keep `npm run dev` running in another terminal.

### Configure `.dev.vars`

Add these (in addition to auth secrets from `.dev.vars.example`):

```env
BASE_URL=http://localhost:8787
SESSION_TOKEN=
```

Use the URL Wrangler prints (`Ready on http://...`). Do not commit `.dev.vars`.

### Get `SESSION_TOKEN`

1. Start dev: `npm run dev`
2. Request a magic link (same host/port as `BASE_URL`):

   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8787/api/auth/sign-in/magic-link" `
     -Method Post `
     -ContentType "application/json" `
     -Body '{"email": "you@example.com", "callbackURL": "http://localhost:8787/"}'
   ```

3. Open the link from the Wrangler terminal logs.
4. In the browser: **DevTools → Application → Cookies →** `http://localhost:8787`
5. Copy the **Value** of `better-auth.session_token` (not the cookie name).
6. Set `SESSION_TOKEN=<value>` in `.dev.vars` — value only, no `better-auth.session_token=` prefix, no quotes.

Log in on the same host as `BASE_URL`. If tests return 401, log in again and refresh the token.

### Verify session (optional)

```powershell
$token = "paste-token-value"
Invoke-RestMethod -Uri "http://localhost:8787/api/auth/get-session" -Headers @{
  Cookie = "better-auth.session_token=$token"
}
```

### Run tests

```bash
npm run test:api      # applications CRUD
npm run test:resume   # R2 resume upload/download/delete + /api/r2/usage
npm run test:analysis # Pro gate, analyze preconditions; optional full E2E
npm run test          # all of the above
```

`test:resume` covers: PDF validation, upload/download/replace, resume delete, application delete cleanup, ownership checks, and usage counter shape. Requires R2 binding (`job-tracker-resumes` bucket) and migration `0003` applied (`npm run db:migrate:remote`).

`test:analysis` requires migration `0004`, session cookie, and (for full pipeline) `user.is_pro = 1`. By default it runs Pro-gate and `400` precondition checks. For end-to-end Workers AI + queue polling:

```bash
# Terminal 1
npm run dev:workers

# Terminal 2
ANALYSIS_E2E=1 npm run test:analysis -w job-tracker-api
```

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` | Start `npm run dev`; set `BASE_URL` to Wrangler’s URL (port **8787**) |
| `401 Unauthorized` | Refresh `SESSION_TOKEN`; align login host with `BASE_URL` and `BETTER_AUTH_URL` |
| `Missing SESSION_TOKEN` | Set `SESSION_TOKEN` in `.dev.vars` |

## Deploy (Cloudflare Git)

In **Workers & Pages → your worker → Settings → Build**, set **Path** to `/` and use one of these **Deploy command** values (must include `--env production` or Secrets Store bindings are omitted):

```bash
cd workers/job-tracker && npx wrangler deploy --env production
```

or:

```bash
cd workers/job-tracker && npm run deploy
```

**Non-production branch deploy command** (optional previews):

```bash
cd workers/job-tracker && npx wrangler versions upload --env production
```

Plain `npx wrangler deploy` without `--env production` deploys the default env (localhost URLs, no secrets) and will break auth in production.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local API |
| `npm run deploy` | Upload worker version |
| `npm run auth:generate` | Regenerate `src/db/auth-schema.ts` |
| `npm run db:generate` | New Drizzle migration from schema |
| `npm run db:migrate:remote` | Apply migrations to remote D1 |
| `npm run test:api` | Smoke-test `/api/applications` |
| `npm run test:resume` | Resume + R2 usage endpoints |
| `npm run test` | Run `test:api` then `test:resume` |

## Layout

- `src/index.ts` — app entry, auth mount, route wiring
- `src/routes/` — application and R2 usage HTTP handlers
- `src/lib/resume-storage.ts` — R2 resume put/get/delete wrappers
- `src/lib/r2-usage.ts` — monthly free-tier counters and limits
- `src/lib/better-auth/` — auth config and middleware
- `src/db/auth-schema.ts` — Better Auth tables (generated)
- `src/db/application-schema.ts` — `applications` table
- `test/helpers.ts` — shared fetch helpers for integration tests
- `test/test-api.ts` — applications CRUD smoke tests
- `test/test-resume.ts` — R2 resume + usage smoke tests

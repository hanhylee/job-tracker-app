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

Production (Cloudflare dashboard → Worker → Settings → Variables and Secrets):

```env
BETTER_AUTH_URL=https://job-tracker-app.0xhanhy.workers.dev
# or https://api.cancareer.com once custom domain is wired

FRONTEND_URL=https://cancareer.com
# www is added automatically; list both only if you use other hosts too
```

Set the same values as **secrets** if you use Wrangler secrets. Redeploy the worker after changing them.

`VITE_API_URL` on Vercel must match `BETTER_AUTH_URL` (same API host).

CORS and Better Auth `trustedOrigins` use `FRONTEND_URL`. If the browser origin is not allowed, you will see **No Access-Control-Allow-Origin**. Cross-site cookies (`SameSite=None`) apply when `BETTER_AUTH_URL` is HTTPS.

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
npm run test          # both
```

`test:resume` covers: PDF validation, upload/download/replace, resume delete, application delete cleanup, ownership checks, and usage counter shape. Requires R2 binding (`job-tracker-resumes` bucket) and migration `0003` applied (`npm run db:migrate:remote`).

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` | Start `npm run dev`; set `BASE_URL` to Wrangler’s URL (port **8787**) |
| `401 Unauthorized` | Refresh `SESSION_TOKEN`; align login host with `BASE_URL` and `BETTER_AUTH_URL` |
| `Missing SESSION_TOKEN` | Set `SESSION_TOKEN` in `.dev.vars` |

## Deploy (Cloudflare Git)

From the **repo root**, set the deploy command to:

```bash
npm run deploy
```

(Not `npx wrangler …` from root — wrangler lives in the worker workspace.)

Or set the project **root directory** to `workers/job-tracker` and use `npx wrangler versions upload`.

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

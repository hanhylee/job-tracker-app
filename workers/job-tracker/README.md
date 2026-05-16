# Job Tracker API

Cloudflare Worker API for tracking job applications. Built with [Hono](https://hono.dev), [chanfana](https://chanfana.pages.dev) (OpenAPI), [Better Auth](https://www.better-auth.com), and remote **D1**.

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

Open http://localhost:8787 for Swagger. The worker uses your **remote** D1 database (`wrangler.jsonc` has `"remote": true`).

## Sign in (magic link)

```powershell
Invoke-RestMethod -Uri "http://localhost:8787/api/auth/sign-in/magic-link" `
  -Method Post `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email": "you@example.com", "callbackURL": "http://localhost:8787/api/applications"}'
```

The link is printed in the terminal. After verifying, use the session cookie on protected routes (`/api/applications/*`).

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

## Layout

- `src/index.ts` — routes and OpenAPI
- `src/endpoints/` — application CRUD handlers
- `src/lib/better-auth/` — auth config and middleware
- `src/db/auth-schema.ts` — Better Auth tables (generated)
- `src/db/schema.ts` — app tables (`applications`)

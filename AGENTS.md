# Repo guide for AI agents

## Architecture (read first)

The browser only sees `https://www.cancareer.com`. The Cloudflare Worker is reached via a **Vercel rewrite** at `/api/*` so requests are same-origin in the browser. This is intentional — it solves iOS WebKit ITP blocking cross-site auth cookies.

```
Browser → www.cancareer.com/api/*   (same-origin, no CORS preflight)
   → Vercel rewrite (vercel.json at REPO ROOT)
   → https://job-tracker-app.0xhanhy.workers.dev/api/*
   → Worker handles, Set-Cookie scoped to www.cancareer.com
```

## Critical rules — do not violate without explicit user approval

1. **Only one `vercel.json` exists, at the repo root.** Do not create `frontend/vercel.json`; Vercel ignores it (project Root Directory is the repo root). When debugging Vercel routing, always check the root file.

2. **Rewrite order in `vercel.json` matters.** The `/api/:path*` rewrite must come **before** the `/(.*) → /index.html` SPA fallback, or POSTs to `/api/*` will return 405 (POST against the static `index.html`).

3. **`BETTER_AUTH_URL` is `https://www.cancareer.com`, NOT `api.cancareer.com` or the workers.dev URL.** Better-auth uses this URL to build OAuth callback URLs and cookie domain. It must match what the browser sees so cookies attach to the same origin.

4. **Better-auth treats the `BETTER_AUTH_URL` pathname as its basePath**, overriding the default `/api/auth`. If you ever add a path to `BETTER_AUTH_URL`, you must change the worker mount in `workers/job-tracker/src/index.ts` to match, or every auth endpoint will 404.

5. **Frontend `VITE_API_URL` is empty in production.** The auth client uses `window.location.origin` as baseURL, the API client uses relative `/api/*` paths. Setting `VITE_API_URL=https://api.cancareer.com` reintroduces cross-origin requests and breaks iOS login.

6. **The worker's `auth(env).handler(c.req.raw)` returns a raw `Response`.** Hono's CORS middleware buffers headers via `c.header()` and applies them only to responses it builds itself, so raw responses lose CORS headers. The `/api/auth/*` route in `src/index.ts` explicitly re-wraps the response with CORS headers. If you refactor that route, preserve that wrapping.

7. **`api.cancareer.com` is legacy and currently unused by the frontend.** If you reintroduce it as a destination, Vercel will resolve it as an internal alias (since `cancareer.com` is a Vercel-owned domain) and return `DEPLOYMENT_NOT_FOUND`. Always use the `workers.dev` URL in Vercel rewrites.

8. **GitHub OAuth callback URL must match `BETTER_AUTH_URL`:** `https://www.cancareer.com/api/auth/callback/github`. If you change `BETTER_AUTH_URL`, update the GitHub OAuth App settings too.

## Troubleshooting CORS / auth failures

Quick diagnosis from a single `curl` (PowerShell — use `curl.exe`, not the alias):

```powershell
curl.exe -s -D - "https://www.cancareer.com/api/auth/get-session"
```

| Symptom | Likely cause |
|---|---|
| Response is `index.html` (HTML body, `Content-Disposition: filename=\"index.html\"`) | The `/api/*` rewrite is missing or after the SPA fallback in root `vercel.json` |
| `405 Method Not Allowed` on POST, server `Vercel` | Same as above — POST hit the static `index.html` |
| `404` with `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` | Rewrite destination resolves to a Vercel-owned domain (e.g. `api.cancareer.com`); use the `workers.dev` URL instead |
| `404` with `Cf-Ray` header present | Rewrite reached the worker, but the worker's better-auth `basePath` doesn't match the URL. Check `BETTER_AUTH_URL` pathname matches the worker's mount path |
| Missing `Access-Control-Allow-Origin` on `/api/auth/*` response | The raw better-auth response is bypassing Hono's CORS middleware. The wrapping in `src/index.ts` should fix this |
| Works on desktop, fails on iOS Safari/Chrome | A cross-origin request slipped in. Confirm the browser sees only `www.cancareer.com` (Network tab — no requests to `api.cancareer.com` or `workers.dev`) |

## Where things live

| Concern | File |
|---|---|
| Vercel rewrites | `/vercel.json` (repo root) |
| Worker config + prod env vars | `/workers/job-tracker/wrangler.jsonc` |
| CORS allowlist logic | `/workers/job-tracker/src/lib/cors.ts` |
| Auth route mount + CORS wrapping | `/workers/job-tracker/src/index.ts` (`/api/auth/*` handler) |
| Frontend auth client | `/frontend/src/lib/auth-client.ts` |
| Frontend API client | `/frontend/src/api/client.ts` + `/frontend/src/lib/api-base.ts` |

## Cloudflare Workers (general)

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

- Docs: https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`
- Limits: each product's `/platform/limits/` page (e.g. `/workers/platform/limits`)

Run `npx wrangler types` after changing bindings in `wrangler.jsonc`.

## Deployment

- **Frontend:** Vercel deploys on push to main (reads root `vercel.json`).
- **Worker:** `cd workers/job-tracker && npx wrangler deploy --env production`. Without `--env production`, the default env is used (localhost URLs, no Secrets Store bindings) and auth will break in prod.

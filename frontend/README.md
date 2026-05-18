# CanCareer Frontend

Vite + React SPA for the job tracker API. Deployed on **Vercel** at [cancareer.com](https://www.cancareer.com).

## Development

From the **repo root**:

```bash
npm install
```

Terminal 1 — API + resume analyzer (port 8787):

```bash
npm run dev:workers
```

Use `dev:workers` (not `dev:api` alone) so the **resume-analyzer** service binding is connected. Analysis endpoints return 503 if only the job-tracker worker is running.

Legacy (API only, no analysis):

```bash
npm run dev -w job-tracker-api
```

Set in `workers/job-tracker/.dev.vars`:

```env
FRONTEND_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:8787
```

Terminal 2 — frontend (port 5173):

```bash
npm run dev:web
```

Open **http://localhost:5173**. Vite proxies `/api` to the worker, so you do not need `VITE_API_URL` locally.

## Build

```bash
npm run build:web
```

Output: `frontend/dist/`

## Vercel

| Setting | Value |
|---------|--------|
| Root Directory | repo root (`.`) — **not** `frontend/` |
| Build Command | `npm run build:web` |
| Output Directory | `frontend/dist` |
| Install Command | `npm install` |

Vercel reads the **root** `vercel.json`, which rewrites `/api/*` to the Cloudflare Worker. There must **not** be a `frontend/vercel.json` — it would be ignored and only cause confusion.

### Production environment variable

```env
VITE_API_URL=        # leave empty / unset
```

The browser calls `https://www.cancareer.com/api/*` (same-origin); Vercel rewrites server-side to the worker. Setting `VITE_API_URL` to an absolute URL like `https://api.cancareer.com` will reintroduce cross-origin requests and break login on iOS (WebKit ITP blocks cross-site auth cookies).

## DNS

- **cancareer.com / www.cancareer.com** → Vercel (frontend + `/api/*` rewrite to worker)
- The Cloudflare Worker is reached via Vercel only. No public DNS for the API.

## Auth client

`src/lib/auth-client.ts` must use `window.location.origin` as the better-auth `baseURL`. Better-auth uses the URL's pathname as its basePath, so a non-trivial pathname (e.g. `/proxy`) would override the default `/api/auth` and silently break every auth call.

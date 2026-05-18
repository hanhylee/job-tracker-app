# CanCareer Frontend

Vite + React SPA for the job tracker API. Deployed on **Vercel** at [cancareer.com](https://cancareer.com).

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

To call the API directly (cross-origin), create `frontend/.env.development`:

```env
VITE_API_URL=http://localhost:8787
```

## Build

```bash
npm run build:web
```

Output: `frontend/dist/`

## Vercel

| Setting | Value |
|---------|--------|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` (from monorepo root) |

**Production environment variable:**

```env
VITE_API_URL=https://api.cancareer.com
```

Ensure the worker allows `https://cancareer.com` via `FRONTEND_URL` and uses `BETTER_AUTH_URL=https://api.cancareer.com`.

## DNS

- **cancareer.com** → Vercel
- **api.cancareer.com** → Cloudflare Worker custom domain

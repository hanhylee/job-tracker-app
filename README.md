# CanCareer — Job Tracker

A job application tracker with resume / job-description matching analysis. Live at [**www.cancareer.com**](https://www.cancareer.com).

## What's inside

| Package | Stack | Purpose |
|---|---|---|
| [`frontend/`](frontend) | Vite + React + TypeScript, deployed on Vercel | The web app at `www.cancareer.com` |
| [`workers/job-tracker/`](workers/job-tracker) | Cloudflare Worker, Hono, Better Auth, Drizzle, D1, R2 | Auth + applications + resume storage API |
| [`workers/resume-analyzer/`](workers/resume-analyzer) | Cloudflare Worker, Workers AI | Scores resumes against job descriptions |

## Quickstart

You need [Node.js](https://nodejs.org/) and a Cloudflare account (`wrangler login`).

```bash
git clone <repo>
cd job-tracker-app
npm install
```

Copy and fill in dev secrets:

```bash
cp workers/job-tracker/.dev.vars.example workers/job-tracker/.dev.vars
```

Run both workers + the frontend in two terminals:

```bash
# Terminal 1 — API + analyzer on http://localhost:8787
npm run dev:workers

# Terminal 2 — frontend on http://localhost:5173
npm run dev:web
```

Open <http://localhost:5173>.

## Contributing

1. Fork & create a feature branch.
2. Read [`AGENTS.md`](AGENTS.md) — it captures the production architecture and the non-obvious gotchas (Vercel rewrites, iOS WebKit cookie scoping, better-auth basePath quirks). Skim it before touching auth, CORS, or deploy config.
3. Run the smoke tests in [`workers/job-tracker/`](workers/job-tracker/README.md#api-integration-tests) for API changes.
4. Open a PR — keep changes focused and describe how you tested locally.

## Docs

- [`AGENTS.md`](AGENTS.md) — architecture, critical rules, CORS/auth troubleshooting
- [`frontend/README.md`](frontend/README.md) — frontend dev, Vercel config
- [`workers/job-tracker/README.md`](workers/job-tracker/README.md) — API, schema, integration tests
- [`workers/resume-analyzer/README.md`](workers/resume-analyzer/README.md) — analyzer worker

## Tech overview

```
Browser (www.cancareer.com)
   │
   ▼  same-origin /api/*  (Vercel rewrite — see AGENTS.md)
Cloudflare Worker: job-tracker
   ├── Better Auth → D1 (sessions, users)
   ├── Applications API → D1
   ├── Resume storage → R2
   └── Service binding → Cloudflare Worker: resume-analyzer (Workers AI)
```

## License

MIT (see [`LICENSE`](LICENSE) if present).

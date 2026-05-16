# Job Tracker

Monorepo for a job application tracker.

## API

The backend is a Cloudflare Worker in [`workers/job-tracker`](workers/job-tracker).

```bash
npm install
npm run deploy          # deploy API from repo root
```

## Frontend

The web app is in [`frontend`](frontend) (Vite + React). Deployed on Vercel at **cancareer.com**.

```bash
npm run dev:web         # http://localhost:5173 (run API separately)
npm run build:web
```

See [`frontend/README.md`](frontend/README.md) for Vercel and environment variables.

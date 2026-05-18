# Resume Analyzer Worker

Cloudflare Worker that runs ATS-style resume vs job-description analysis using Workers AI. Invoked via **service binding** from `job-tracker` (not public in production).

## Prerequisites

- Shared D1 database and R2 bucket with `job-tracker`
- Workers AI enabled on the account
- Queue: `resume-analysis`

```bash
npm run queues:create -w resume-analyzer
```

## Local development

Run both workers (from repo root):

```bash
npx wrangler dev -c workers/job-tracker/wrangler.jsonc -c workers/resume-analyzer/wrangler.jsonc
```

Or in two terminals on ports 8787 and 8788 with service binding configured in job-tracker.

Set a test user to Pro in D1:

```sql
UPDATE user SET is_pro = 1 WHERE email = 'you@example.com';
```

## Internal API (service binding)

| Method | Path | Body / query |
|--------|------|----------------|
| POST | `/internal/analyze` | `{ applicationId, userId, force? }` → `202` or cached `200` |
| GET | `/internal/analyses/:analysisId` | `?userId=` |
| GET | `/internal/applications/:applicationId/analysis/latest` | `?userId=` |

Public proxy (job-tracker, Pro required):

- `POST /api/applications/:id/analyze`
- `GET /api/applications/:id/analysis`
- `GET /api/applications/analyses/:analysisId`

## Analysis result (`schemaVersion: 1`)

See `src/lib/analysis-types.ts` for the Zod schema. Response includes `overallScore`, `categories`, `keywords`, `actions`, and `meta` (model, hashes, timestamp).

## Configuration

| Var | Default |
|-----|---------|
| `ANALYSIS_LLM_MODEL` | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` |

## Deploy

```bash
npm run deploy -w resume-analyzer
npm run deploy -w job-tracker-api -- --env production
```

Apply D1 migrations from job-tracker first: `npm run db:migrate:remote -w job-tracker-api`

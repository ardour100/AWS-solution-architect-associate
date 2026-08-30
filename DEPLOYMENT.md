# Deployment Runbook — Vercel + Neon

How this project is deployed, in plain language, so the whole flow can be
reproduced on a fresh setup. (Written after deploying on 2026-08-30.)

## Architecture in one sentence

**Frontend** = static files on Vercel. **Backend** = the Express app running
as *one* Vercel serverless function, in a **second** Vercel project from the
same GitHub repo. **Database** = Neon (cloud Postgres). No server to keep
awake, no cold-start billing, no 30-day DB expiry.

```
Browser ──> Vercel frontend (aws-seven-rouge.vercel.app, static)
Browser ──> Vercel backend (…vercel.app/api/*, serverless function) ──> Neon Postgres
```

The frontend calls `/api/*` with `VITE_API_BASE_URL` pointing at the
backend origin (baked into the bundle at build time).

## Why the backend can run on Vercel

- `backend/api/index.ts` — default-exports the Express app
  (`backend/src/app.ts`), which Vercel runs as a serverless function
- `backend/vercel.json` — rewrites every `/api/(.*)` request into that
  function; the health check lives at **`/api/health`** (bare `/health`
  does not work on Vercel)
- `backend/package.json` — declares `"engines": { "node": ">=20.19.0" }`
  (zod 4 requirement; Vercel respects it)
- Migrations do **not** run inside the function — they run locally/CI
  against Neon (step 2 below)

## Full setup from scratch (copy-paste flow)

### 1. Create the Neon database

1. neon.tech → New Project → copy the **pooled** connection string
   (host contains `-pooler` — mandatory for serverless, the direct one
   exhausts connections).
2. From `backend/` on your machine:

   ```bash
   DATABASE_URL='<pooled connection string>' npm run db:migrate
   DATABASE_URL='<pooled connection string>' npm run db:seed    # creates admin@example.com / admin1234
   ```

### 2. Create the backend Vercel project

1. Vercel → Add New Project → import the GitHub repo
2. **Root Directory: `backend`** (wrong value = bizarre build errors)
3. Deploy, then immediately:
   - Settings → Deployment Protection → **Vercel Authentication: Off**
     (default ON = every API call 302-redirects to SSO and breaks CORS)
   - Settings → Environment Variables (Production):

     | Name | Value |
     | --- | --- |
     | `DATABASE_URL` | the **pooled** Neon connection string |
     | `JWT_SECRET` | `openssl rand -hex 32` output |
     | `CORS_ORIGIN` | `https://<frontend>.vercel.app` |

4. Redeploy after adding the variables.

### 3. Point the frontend at the backend

1. Frontend Vercel project → Environment Variables:
   `VITE_API_BASE_URL` = backend origin (trailing slash tolerated, but
   cleaner without it; the client appends `/api` itself).
2. **Redeploy** — the variable is baked at build time.

### 4. Verify (do this with curl, not a logged-in browser)

```bash
curl -s https://<backend>.vercel.app/api/health
# → {"status":"ok","database":"connected"}

curl -s -X POST https://<backend>.vercel.app/api/exams \
  -H 'Content-Type: application/json' -d '{"count":10}'
# → 201 with a new exam, or 409 "No questions available" (empty bank)
```

Then in the browser: Admin sign in (`admin@example.com` / `admin1234`) →
add questions → sign out → take an anonymous exam.

## Troubleshooting cheat sheet

| Symptom | Cause | Fix |
| --- | --- | --- |
| CORS: *Redirect is not allowed for preflight* + Location → `vercel.com/sso-api` | Deployment Protection (Vercel Authentication) is ON | Turn it off on the **backend** project |
| Same error, other Location / missing `/api` in URL | Request path wrong (`/auth/...` or `//api`) | Check the request URL in DevTools Network: must be `<origin>/api/...` with single slashes |
| Same error in your browser but not in curl | You tested while logged into Vercel (SSO cookie = false positive) | Always verify with curl / incognito |
| `Invalid export found in module /var/task/backend/...` | Root Directory not `backend` | Set Root Directory: `backend` |
| 500 `FUNCTION_INVOCATION_FAILED` on every route | Node too old (zod 4 needs ≥ 20.19) | `engines` in package.json (already done) |
| Bare `/health` always 500 on Vercel | Vercel's catch-all path handling; not our code | Use `/api/health` on Vercel; `/health` still works locally |
| Deployment says Ready but runs old code | "Redeploy" rebuilds the old pinned commit / stale build cache | Redeploy with **Use existing Build Cache unchecked**; if still stale, delete + recreate the project |
| Neon connection errors under load | Direct connection string used | Always the `-pooler` pooled string |

## Local development is unaffected

`docker compose up` still runs everything locally (frontend :3000,
backend :8080, postgres :5433) — see the root README and
`backend/README.md`. The Vercel serverless entry and the Docker
container share the same Express app; only the entry point differs.

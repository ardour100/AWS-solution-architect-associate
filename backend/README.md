# Backend — Node.js + TypeScript + Drizzle ORM + PostgreSQL

API server and database layer for the AWS Solutions Architect practice
platform. Replaces the previous Go + Gin + GORM scaffold.

## Stack

- **Runtime**: Node.js 24, Express 5 (ESM, TypeScript)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team) with the `node-postgres` driver
- **Migrations**: [drizzle-kit](https://orm.drizzle.team/docs/drizzle-kit) —
  versioned SQL files in [`drizzle/`](./drizzle), journal table in the
  `drizzle.__drizzle_migrations` schema
- **Database**: PostgreSQL 16 (see root `docker-compose.yml`)

## Layout

```
src/
├── auth/
│   ├── schemas.ts     # zod request-body validation (register/login)
│   ├── token.ts       # JWT sign/verify helpers
│   ├── service.ts     # bcryptjs hashing, user lookup, token issuance
│   ├── controller.ts  # HTTP layer: parse → service → respond
│   ├── middleware.ts  # authenticateToken (401) / requireAdmin (403)
│   └── router.ts      # POST /register, /login; GET /me
├── db/
│   ├── schema.ts   # tables, checks, indexes, relations, row/insert types
│   ├── migrate.ts  # compiled migrator used by the Docker image at startup
│   └── index.ts    # pg Pool + Drizzle client, DATABASE_URL wiring
└── index.ts        # Express app: middleware, routes, error handler
drizzle/            # generated SQL migrations (commit these)
drizzle.config.ts   # drizzle-kit config (schema → SQL output, DB URL)
```

## Configuration

| Variable | Default | Used by |
| -------- | ------- | ------- |
| `DATABASE_URL` | `postgres://appuser:apppassword@localhost:5433/appdb` | app, drizzle-kit |
| `PORT` | `8080` | Express |
| `JWT_SECRET` | `dev-secret-change-me` (warns in production) | JWT signing/verification |
| `JWT_EXPIRES_IN` | `7d` | token lifetime (jsonwebtoken format) |

- **Local dev (host machine)**: point at the compose postgres mapped to
  host port `5433` (host `5432` is taken by another project):

  ```bash
  cp .env.example .env   # DATABASE_URL already targets localhost:5433
  ```

- **Inside docker compose**: the `backend` service overrides
  `DATABASE_URL` to `postgres://appuser:apppassword@postgres:5432/appdb`.

## Migration workflow

Generate a SQL migration from `src/db/schema.ts`:

```bash
npm run db:generate     # → drizzle-kit generate (writes drizzle/000N_*.sql)
```

Apply pending migrations to the database:

```bash
npm run db:migrate      # → drizzle-kit migrate
```

> Review the generated SQL before running it against shared data. In the
> Docker image, the compiled migrator (`node dist/db/migrate.js`) applies
> pending migrations automatically before the server boots — the production
> image contains no dev tooling.

Other scripts:

```bash
npm run dev             # tsx watch src/index.ts
npm run build           # tsc → dist/
npm start               # node dist/index.js
npm run db:studio       # drizzle-kit studio — visual DB browser
npm run db:push         # push schema directly (DEV ONLY — bypasses migrations,
                        # migrations are the source of truth)
```

### Resetting a dev database

```bash
docker exec backend_aws_saa psql -U appuser -d appdb \
  -c "DROP SCHEMA public CASCADE; DROP SCHEMA drizzle CASCADE; CREATE SCHEMA public;"
npm run db:migrate
```

(`drizzle` is the migration-journal schema; drop it too, otherwise
drizzle-kit thinks migrations are already applied.)

## Auth API

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `POST` | `/api/auth/register` | — | Create a user; returns `201` with `{ token, user }` |
| `POST` | `/api/auth/login` | — | Verify credentials; returns `{ token, user }` |
| `GET` | `/api/auth/me` | Bearer token | Echo the claims of the current token |

Password rules (zod): 8–72 chars, at least one letter and one number.
Emails are trimmed/lowercased; `user` never contains `password_hash`.

```bash
curl -X POST localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"supersecret1"}'
# → 201 {"token":"<jwt>","user":{"id":"...","email":"me@example.com","role":"user","createdAt":"..."}}

curl -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"supersecret1"}'
# → 200 {"token":"<jwt>","user":{...}}

curl localhost:8080/api/auth/me -H "Authorization: Bearer <jwt>"
# → 200 {"user":{"userId":"...","role":"user","iat":...,"exp":...}}
```

Error semantics:

- `400` — request body fails zod validation (details per field)
- `401` — missing/malformed/expired/invalid token, or wrong credentials
- `403` — valid token but `role !== 'admin'` (`requireAdmin`)
- `409` — email already registered

`authenticateToken` mounts `req.user` (`{ userId, role }`);
`requireAdmin` stacks on top of it — mount them on future routes as
`router.get('/admin/...', requireAdmin, handler)`.

## Business APIs

### Questions (admin-only — `requireAdmin`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/questions?limit=&offset=&includeDeleted=` | Latest versions, newest first |
| `POST` | `/api/questions` | Create a question (version 1 + options) |
| `GET` | `/api/questions/:id` | One version with its options |
| `PUT` | `/api/questions/:id` | New immutable version (same group, version + 1) |
| `DELETE` | `/api/questions/:id` | Soft delete (excluded from pools/listings) |

Validation: 2–8 options, ≥1 correct; `single` requires exactly 1 correct.
Body shape (create = update):

```json
{ "title": "...", "explanation": "...", "qType": "single",
  "options": [{ "label": "A", "content": "...", "isCorrect": true }, ...] }
```

### Exams (open — optional auth; token links the exam to a user)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/exams` | Start an exam: `{ "count": 10 }` random latest questions |
| `GET` | `/api/exams/:examId` | Exam + records; **no answer key until submitted** |
| `PUT` | `/api/exams/:examId/records/:recordId` | Save `{ "selectedOptionIds": [...] }` |
| `POST` | `/api/exams/:examId/submit` | Grade (strict exact-match), backfill, close exam |
| `GET` | `/api/exams` | The authenticated user's exams (401 if anonymous) |

The exam response embeds each question's options without `is_correct`
before submission; after submit each record gains `explanation`,
`correctOptionIds`, and `isCorrect`.

## Schema

### `users`

| Column | Type | Constraints |
| ------ | ---- | ----------- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `email` | `text` | unique, not null |
| `password_hash` | `text` | not null |
| `role` | `text` | `'user' \| 'admin'`, default `'user'` (CHECK) |
| `created_at` | `timestamptz` | default `now()` |

### `questions` — immutable append-only versioning

Every edit inserts a **new row** with `version + 1`; `is_latest` marks the
current version. All versions of a logical question share `group_id`.
Deletion is soft (`is_deleted`) so exam history stays referentially intact.

| Column | Type | Constraints |
| ------ | ---- | ----------- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `group_id` | `uuid` | not null, indexed |
| `version` | `integer` | default 1, `>= 1` (CHECK) |
| `is_latest` | `boolean` | default false, indexed |
| `is_deleted` | `boolean` | default false, indexed |
| `title` | `text` | not null |
| `explanation` | `text` | not null |
| `q_type` | `text` | `'single' \| 'multiple'` (CHECK) |
| `created_at` | `timestamptz` | default `now()` |

Indexes:

- **unique** `(group_id, version)` — one version number per group
- **unique partial** `(group_id) WHERE is_latest = true` — at most one
  latest version per group (publish flow: flip old version off, insert new
  one, in one transaction)
- `is_latest` — fast "current version" queries

### `options`

| Column | Type | Constraints |
| ------ | ---- | ----------- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `question_id` | `uuid` | FK → `questions.id`, `ON DELETE CASCADE`, indexed |
| `label` | `text` | not null (`A`, `B`, `C`, `D`, …) |
| `content` | `text` | not null |
| `is_correct` | `boolean` | not null, default false |

### `exams` — exam sessions

| Column | Type | Constraints |
| ------ | ---- | ----------- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `users.id`, nullable (anonymous exams), indexed |
| `status` | `text` | `'in_progress' \| 'completed'`, default `'in_progress'` (CHECK) |
| `total_count` | `integer` | default 10, `>= 1` (CHECK) |
| `correct_count` | `integer` | default 0, `>= 0` (CHECK) |
| `created_at` | `timestamptz` | default `now()` |
| `completed_at` | `timestamptz` | nullable — set on submit |

### `exam_records` — per-question answer snapshots

| Column | Type | Constraints |
| ------ | ---- | ----------- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `exam_id` | `uuid` | FK → `exams.id`, `ON DELETE CASCADE` |
| `question_id` | `uuid` | FK → `questions.id` (the exact version served), indexed |
| `selected_option_ids` | `text[]` | not null, default `'{}'` — option UUIDs picked by the user |
| `is_correct` | `boolean` | nullable — backfilled by grading on submit |

Indexes:

- **unique** `(exam_id, question_id)` — one record per question per exam
  (also serves exam-level record lookups)
- `question_id` — join/backfill queries

### Design notes

- Enum-like columns are `text` + CHECK constraints, not native PostgreSQL
  enums: adding a value is a simple constraint swap instead of
  `ALTER TYPE ... ADD VALUE` (which cannot run inside a transaction).
- `selected_option_ids` is a typed `text[]` (UUID strings) rather than
  `jsonb`: GIN-indexable and validated by Postgres as an array of text.
- `exam_records.question_id` has no cascade: exam history must survive
  even if a question is deleted.
- Drizzle `relations()` (bottom of `schema.ts`) gives type-safe joins;
  they are compile-time only and don't change the migrations.

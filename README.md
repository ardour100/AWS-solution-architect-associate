# AWS Solutions Architect Associate — Study App

A study app for the AWS Solutions Architect Associate exam, built as a
Docker Compose monorepo:

| Service    | Stack                          | Port (host) |
| ---------- | ------------------------------ | ----------- |
| `frontend` | React + Vite + TypeScript, served by nginx | `3000` |
| `backend`  | Node.js + TypeScript + Express + Drizzle ORM (PostgreSQL) | `8080`      |
| `postgres` | PostgreSQL 16 (Alpine)         | `5433` → container `5432` |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

## Run the project

```bash
# 1. Build images and start all services
#    (compiles the backend, runs database migrations/health checks, builds the frontend)
docker compose up --build

# 2. In another terminal, check that the backend and database are healthy
curl http://localhost:8080/health
# → {"database":"connected","status":"ok"}
```

The frontend is then available at <http://localhost:3000>. It proxies
`/api/*` requests to the backend, e.g.:

```bash
curl http://localhost:3000/api/health
```

## Useful commands

```bash
docker compose up -d          # start in the background
docker compose down           # stop and remove containers (keeps the database volume)
docker compose down -v        # also delete the database volume
docker compose logs -f backend  # tail backend logs
```

## Project structure

```
├── docker-compose.yml   # postgres + backend + frontend orchestration
├── backend/             # Node.js API (Express + Drizzle ORM), health endpoint on :8080
└── frontend/            # React app built with Vite, served by nginx on :3000
```

## Configuration

The backend reads its settings from environment variables (set in
`docker-compose.yml`): `DATABASE_URL` and `PORT`. See
[`backend/README.md`](backend/README.md) for the database schema and
migration workflow (`npm run db:generate` / `npm run db:migrate`).

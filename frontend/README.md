# Frontend — React + TypeScript + Vite + Tailwind CSS

Practice-app UI for the AWS Solutions Architect Associate platform.

## Stack

- React 19 + TypeScript, Vite 8, [React Router](https://reactrouter.com) (data-less declarative mode)
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite` (no config file needed)
- oxlint

## Layout

```
src/
├── api/
│   ├── client.ts    # fetch wrapper: /api base, Bearer token, ApiError
│   └── types.ts     # DTOs mirroring the backend responses
├── auth/
│   ├── context.ts   # AuthContext definition + value type
│   ├── AuthContext.tsx  # AuthProvider (login/register/logout, localStorage)
│   ├── useAuth.ts   # hook
│   └── guards.tsx   # RequireAuth / RequireAdmin route guards
├── components/      # Layout (nav + Outlet), shared states
├── hooks/useApi.ts  # minimal hand-rolled data-fetch hook
└── pages/
    ├── LoginPage.tsx          # sign in / create account
    ├── HomePage.tsx           # start an exam + exam history
    ├── ExamPage.tsx           # take an exam, submit, review results
    └── AdminQuestionsPage.tsx # question bank CRUD (admin only)
```

## Dev

```bash
npm install
npm run dev     # Vite on :5173, /api proxied to http://localhost:8080
```

The dev proxy target assumes the backend is running (`docker compose up -d
postgres backend`); in production nginx does the same proxying
(`nginx.conf`, path forwarded as-is — backend routes are mounted under
`/api`).

```bash
npm run build   # tsc -b && vite build
npm run lint    # oxlint
```

## Auth flow

- **Practice exams are anonymous** — no registration or sign-in needed.
- Only the question bank (`/admin/questions`) requires a sign-in; it is
  guarded by `RequireAuth` + `RequireAdmin`, and the nav only shows the
  link to admins.
- Test admin account (created idempotently by `npm run db:seed` in the
  backend): `admin@example.com` / `admin1234` — the login page prefills
  it.
- Token and user are kept in `localStorage` (`auth.token`,
  `auth.user`) and injected as `Authorization: Bearer` by the API
  client; a 401 on a request that carried a token clears it.

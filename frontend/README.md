# Frontend — Esports Tournament Management Platform

React 19 + TypeScript + Vite + Bootstrap 5 SPA. Axios talks to the Django API
under `/api` (Vite proxies `/api` to `http://localhost:8000` in dev, or set
`VITE_API_URL`; see `.env.example`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm test -- --run` | vitest + Testing Library (6 tests) |
| `npm run lint` | oxlint |

## Auth flow

Register → 6-digit email OTP on the `/verify` page → auto-login. Login is
blocked (`403 email_unverified`, redirected to `/verify`) until the code is
confirmed. Passwords must be strong (8+ chars: upper, lower, digit, special);
the Register page shows a live checklist and eye toggles on password fields.
Tokens live in `localStorage`; a 401 triggers a refresh via `/api/auth/refresh/`.

## Routes

| Path | Page | Who |
|---|---|---|
| `/` | Dashboard | any user |
| `/login`, `/register`, `/verify` | Auth | public |
| `/teams`, `/teams/:id` | Teams | any user |
| `/tournaments` | My Tournaments + All Tournaments tabs (organizer/admin); browse-only All Tournaments for players | any user |
| `/tournaments/:id`, `/tournaments/:id/seeding` | Detail, seeding | any user |
| `/matches`, `/brackets`, `/standings` | Matches, brackets, standings | any user |
| `/admin` | Admin command center (dark sidebar: Overview/Users/Tournaments/Teams/Matches) | admin only |

## API layer

`src/api/` holds one typed module per domain (`auth`, `users`, `teams`,
`tournaments`, `matches`) over a shared Axios client with an auth interceptor.
Backend responses arrive in an envelope (`{success, data, message}`) unwrapped
by per-module helpers.

# Esports Tournament Management Platform

> Full-stack backend API for managing esports tournaments —
> team registration, bracket generation, match scheduling, and live standings.

## Live Deployment

Single-box Docker deployment on AWS EC2 (`t3.small`, Asia Pacific/Mumbai):

- App: http://52.66.246.97
- Swagger docs: http://52.66.246.97/api/docs/
- Health check: http://52.66.246.97/api/health/

## Tech Stack
- Backend: Python 3.12, Django 5.1.15, Django REST Framework 3.15.2
- Frontend: React 19, TypeScript, Vite, Bootstrap 5, React Router, Axios
- Database: PostgreSQL 15 (Docker Postgres container on the EC2 host, locally and in production)
- Auth: JWT (djangorestframework-simplejwt, 30-min access / 7-day refresh, rotation + blacklist)
- API Docs: drf-spectacular (Swagger UI)
- Testing: pytest + pytest-django (134 tests), vitest + Testing Library (6 tests)
- Lint: ruff (backend), oxlint (frontend)
- CI/CD: GitHub Actions (backend + frontend test jobs) → EC2 deploy workflow (SSH into the instance, rebuild Docker images on every push to main)

_Note: production builds pin Python 3.12 (slim image) — Django 5.1's admin is
incompatible with Python ≥ 3.13. Local development is verified on Python 3.14._

## Prerequisites
- Python 3.12+
- PostgreSQL 15 (or Docker)
- pip

## Local Setup

### 1. Start PostgreSQL (Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=esports_db postgres:15

### 2. Clone and setup
git clone https://github.com/GOWTHAM-MG-2006/esports-tournament-management-platform.git
cd esports-tournament-management-platform
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt

### 3. Configure environment
copy .env.example .env
# Edit .env if needed (defaults work for local Postgres)

### 4. Run migrations
cd backend
python manage.py migrate

### 5. Create superuser (optional)
python manage.py createsuperuser

### 6. Seed demo data (optional)
python manage.py seed_demo

### 7. Run server
python manage.py runserver

### 8. Access API docs
Open http://localhost:8000/api/docs/

## Frontend

### Prerequisites
- Node.js 20+ and npm

### Install and Run
```
cd frontend
npm install
npm run dev
```

The dev server runs at http://localhost:5173. Vite proxies `/api` requests to `http://localhost:8000` (the Django backend), so relative `/api/*` URLs work in development. The backend must be running for the app to function.

### Auth
Registration is verified by email OTP: `POST /api/auth/register/` creates an
inactive account and emails a 6-digit code (10-minute expiry, 5 attempts max,
SHA-256 hashed at rest); `POST /api/auth/verify-otp/` activates the account and
returns JWT tokens, and `POST /api/auth/resend-otp/` issues a fresh code. Login
is blocked with `403 email_unverified` until verification completes. Passwords
must be strong (8+ chars with uppercase, lowercase, digit, and special char —
enforced by Django validators on the backend and a live checklist on the
Register page, which also has show/hide eye toggles on all password fields).
The access token is stored in `localStorage` and attached to requests via an
Axios interceptor. On a 401 response, the interceptor automatically attempts a
token refresh through `/api/auth/refresh/`.

### Routes

| Path | Page | Auth |
|------|------|------|
| `/` | Dashboard | Yes |
| `/login` | Login | No |
| `/register` | Register | No |
| `/verify` | Email OTP verification | No |
| `/teams` | Teams | Yes |
| `/teams/:id` | Team Detail | Yes |
| `/tournaments` | Tournaments | Yes |
| `/tournaments/:id` | Tournament Detail | Yes |
| `/tournaments/:id/seeding` | Seeding | Yes |
| `/matches` | Matches | Yes |
| `/brackets` | Brackets | Yes |
| `/standings` | Standings | Yes |
| `/admin` | Admin command center (admin only) | Yes |

Protected routes redirect to `/login` when unauthenticated.

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register/ | Register (inactive until OTP verified) | No |
| POST | /api/auth/verify-otp/ | Verify code, activate account, get JWT tokens | No |
| POST | /api/auth/resend-otp/ | Send a fresh code (invalidates the old one) | No |
| POST | /api/auth/login/ | Login, get JWT tokens (verified users only) | No |
| GET | /api/auth/users/ | List users, `?search=` filter (admin) | Yes |
| PATCH/DELETE | /api/auth/users/{id}/ | Change role / activate / delete user (admin) | Yes |
| POST | /api/auth/refresh/ | Refresh access token | No |
| POST | /api/auth/logout/ | Blacklist refresh token | Yes |
| GET | /api/auth/me/ | Get current user | Yes |
| GET | /api/health/ | Backend + DB health check | No |
| GET/POST | /api/teams/ | List/create teams | Yes |
| GET/PUT/PATCH/DELETE | /api/teams/{id}/ | Team detail | Yes |
| POST | /api/teams/{id}/add-member/ | Add team member by user_id or email | Yes |
| POST | /api/teams/{id}/remove-member/ | Remove team member | Yes |
| GET/POST | /api/tournaments/ | List/create tournaments | Yes |
| GET | /api/tournaments/browse/ | All tournaments except drafts (all roles) | Yes |
| GET | /api/tournaments/my-tournaments/ | Tournaments created by me (organizer) | Yes |
| GET/PUT/PATCH/DELETE | /api/tournaments/{id}/ | Tournament detail | Yes |
| POST | /api/tournaments/{id}/open-registration/ | (Re)open registration (organizer) | Yes |
| POST | /api/tournaments/{id}/close-registration/ | Close registration (organizer) | Yes |
| POST | /api/tournaments/{id}/start-tournament/ | Move to in_progress (organizer) | Yes |
| POST | /api/tournaments/{id}/register-team/ | Register team for tournament | Yes |
| POST | /api/tournaments/{id}/seed/ | Set team seeds (organizer) | Yes |
| POST | /api/tournaments/{id}/smart-seed/ | Rank registrations strongest-first by win rate, assign seeds 1..N (organizer) | Yes |
| GET | /api/tournaments/{id}/registrations/ | List tournament registrations | Yes |
| GET | /api/tournaments/{id}/matches/ | Get tournament matches | Yes |
| GET | /api/tournaments/{id}/bracket/ | Get bracket view | Yes |
| GET | /api/matches/ | List matches | Yes |
| GET | /api/matches/{id}/ | Match detail | Yes |
| POST | /api/matches/generate-bracket/{tournament_id}/ | Generate bracket (organizer) | Yes |
| POST | /api/matches/{id}/submit-result/ | Submit match result (organizer) | Yes |
| GET | /api/predictions/match/{id}/ | AI predicted winner + confidence for a decided match (400 if teams undecided) | Yes |
| GET | /api/docs/ | Swagger UI | No |

Tournament lifecycle: `draft → registration_open → registration_closed → in_progress → completed`.
Direct `status` edits via PUT/PATCH are rejected (use the lifecycle actions); in-progress
tournaments cannot be deleted or edited. `end_date` cannot be before `start_date`
(enforced on create and partial update). Equal numeric scores are recorded as a Draw
(completed match, no winner); negative scores and loser-outscoring-winner are rejected.
Admins bypass ownership checks (can edit/delete/run lifecycle actions on any
tournament or team); user roles are player/organizer/admin and only admins can
change roles or deactivate/delete accounts, never their own.

AI predictor + smart seeding (Phase 3 enhancement, see
`docs/Enhancement_Proposal.md`): `GET /api/predictions/match/{id}/` responds
with `predicted_winner_id` and `confidence`, scored on demand by a scikit-learn
`LogisticRegression` over `[win_rate_diff, seed_diff]` computed from completed
matches — no model files are stored in the repo. `POST
/api/tournaments/{id}/smart-seed/` ranks a tournament's registrations
strongest-first by win rate and assigns seeds 1..N (organizer only, only while
registration is open or closed). In the UI, the Seeding page
(`/tournaments/:id/seeding`) shows a "Smart seed" button for organizers/admins,
and each decided, unplayed match on the Tournament Detail page
(`/tournaments/:id`) shows an "AI pick: \<team\> (x%)" line.

Security hardening: anonymous requests are throttled at 20/min and
authenticated requests at 100/min (HTTP 429 beyond that);
`SECURE_CONTENT_TYPE_NOSNIFF`, `X-Frame-Options: DENY`, and
`CORS_ALLOW_ALL_ORIGINS = False` (explicit origins only). Key actions are
written to the `audit_logs` table (`user.register`, `auth.login_failed`,
`user.role_change`, `user.status_change`, `user.delete`, `tournament.delete`,
`team.delete`).

## Running Tests

Backend (134 tests, pytest + pytest-django):
```
pip install -r requirements-dev.txt
pytest
pytest --cov   # coverage report
```

Frontend (vitest + Testing Library):
```
cd frontend
npm ci
npm test -- --run
```

Lint:
```
ruff check backend/
cd frontend && npm run lint
```

## Deployment (AWS, single box)

Everything (Postgres, API, SPA) runs as Docker Compose services on one
`t3.small` EC2 instance (Amazon Linux 2023, `ap-south-1`, free-tier eligible).
The browser talks same-origin `/api`, so no CORS configuration is needed.

Files: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`,
`frontend/nginx.conf` (SPA + `/api/` proxy to the backend service).

1. **Instance:** `t3.small`, Amazon Linux 2023 x86_64, security group
   `capstone-stack` (22/80/443 inbound), 30 GB gp3, Docker + compose plugin.
2. **Code:** `git clone <repo>` on the box (public repo, no credentials).
3. **Secrets** (`server.env` next to `docker-compose.yml`, NEVER committed —
   see `backend/.env.example` for the template):

   | Variable | Value |
   |---|---|
   | `DB_PASSWORD` | strong Postgres password (also inside `DATABASE_URL`) |
   | `SECRET_KEY` | long random string (`secrets.token_urlsafe(50)`) |
   | `DEBUG` | `False` |
   | `DATABASE_URL` | `postgres://esports:<DB_PASSWORD>@db:5432/esports_db` |
   | `ALLOWED_HOSTS` | server public IP/DNS |
   | `EMAIL_*` / `DEFAULT_FROM_EMAIL` | Gmail SMTP (App Password) for real OTP delivery |

4. **Boot:** `docker compose up -d --build`, then
   `docker compose run --rm backend python manage.py migrate`.
5. **Redeploy:** `git pull && docker compose up -d --build && docker compose run --rm backend python manage.py migrate`.

Verify: `http://<server-ip>/api/health/` → `{"status": "ok", ...}`,
`http://<server-ip>/api/docs/` for Swagger.

Known limits of this setup: plain HTTP (no TLS certificate yet), SSH open
to the world (tighten to your IP when convenient), and Postgres backups are
the Docker volume (snapshot it before anything drastic).

## Notes

- UI uses Bootstrap 5 (not Tailwind): the spec's `tailwind.config.js` was
  intentionally skipped — Bootstrap was already wired through the SPA and a
  rewrite added no product value.
- Frontend TypeScript (`.ts`/`.tsx`) is used instead of the spec's `.js`/`.jsx`
  file names; API and component structure match the spec one-to-one.
- Logging: signup/login and API errors go through Django `LOGGING` (console,
  level via `LOG_LEVEL`); email sending never fails a request (logged instead).
- Email (OTP codes, registration confirmations, bracket generation, results)
  uses `EMAIL_BACKEND` — console backend in dev, Gmail SMTP in production via
  `backend/.env` (see `backend/.env.example`; App Password required).
- Admin command center (`/admin`, admin role only): dark-sidebar UI for user
  management (search, role changes, activate/deactivate/delete), full
  tournament/team tables with delete, and a match overview — no Django admin
  needed for day-to-day administration.

## License
MIT

# Esports Tournament Management Platform

> Full-stack backend API for managing esports tournaments —
  team registration, bracket generation, match scheduling, and live standings.

## Tech Stack
- Backend: Python 3.14, Django 5.1.15, Django REST Framework 3.15.2
- Frontend: React 19, TypeScript, Vite, Bootstrap 5, React Router, Axios
- Database: PostgreSQL 15
- Auth: JWT (djangorestframework-simplejwt)
- API Docs: drf-spectacular (Swagger UI)

## Prerequisites
- Python 3.14+
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
JWT authentication is handled through `/api/auth/register/` and `/api/auth/login/`. The access token is stored in `localStorage` and attached to requests via an Axios interceptor. On a 401 response, the interceptor automatically attempts a token refresh through `/api/auth/refresh/`.

### Routes

| Path | Page | Auth |
|------|------|------|
| `/` | Dashboard | Yes |
| `/login` | Login | No |
| `/register` | Register | No |
| `/teams` | Teams | Yes |
| `/teams/:id` | Team Detail | Yes |
| `/tournaments` | Tournaments | Yes |
| `/tournaments/:id` | Tournament Detail | Yes |
| `/tournaments/:id/seeding` | Seeding | Yes |
| `/matches` | Matches | Yes |
| `/brackets` | Brackets | Yes |
| `/standings` | Standings | Yes |
| `/health` | Backend health | Yes |
| `/admin` | Admin (organizer/admin only) | Yes |

Protected routes redirect to `/login` when unauthenticated.

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register/ | Register new user | No |
| POST | /api/auth/login/ | Login, get JWT tokens | No |
| POST | /api/auth/refresh/ | Refresh access token | No |
| POST | /api/auth/logout/ | Blacklist refresh token | Yes |
| GET | /api/auth/me/ | Get current user | Yes |
| GET | /api/health/ | Backend + DB health check | No |
| GET/POST | /api/teams/ | List/create teams | Yes |
| GET/PUT/DELETE | /api/teams/{id}/ | Team detail | Yes |
| POST | /api/teams/{id}/add-member/ | Add team member | Yes |
| POST | /api/teams/{id}/remove-member/ | Remove team member | Yes |
| GET/POST | /api/tournaments/ | List/create tournaments | Yes |
| GET/PUT/DELETE | /api/tournaments/{id}/ | Tournament detail | Yes |
| POST | /api/tournaments/{id}/open-registration/ | Open registration (organizer) | Yes |
| POST | /api/tournaments/{id}/close-registration/ | Close registration (organizer) | Yes |
| POST | /api/tournaments/{id}/register-team/ | Register team for tournament | Yes |
| POST | /api/tournaments/{id}/seed/ | Set team seeds (organizer) | Yes |
| GET | /api/tournaments/{id}/registrations/ | List tournament registrations | Yes |
| GET | /api/tournaments/{id}/matches/ | Get tournament matches | Yes |
| GET | /api/tournaments/{id}/bracket/ | Get bracket view | Yes |
| GET | /api/matches/ | List matches | Yes |
| GET | /api/matches/{id}/ | Match detail | Yes |
| POST | /api/matches/generate-bracket/{tournament_id}/ | Generate bracket (organizer) | Yes |
| POST | /api/matches/{id}/submit-result/ | Submit match result (organizer) | Yes |
| GET | /api/docs/ | Swagger UI | No |

## Running Tests

Backend (51 tests, pytest + pytest-django):
```
pip install -r requirements-dev.txt
pytest
```

Frontend (vitest + Testing Library):
```
cd frontend
npm ci
npm test -- --run
```

## Deployment

Manual cloud steps (cannot be automated from here):

1. **Database (Railway):** create a PostgreSQL service, copy the `DATABASE_URL`.
2. **Backend (Render):** new Web Service from this repo —
   build: `pip install -r requirements.txt`,
   start: `gunicorn config.wsgi --chdir backend --bind 0.0.0.0:$PORT`
   (or use the `Procfile`). Set env vars: `DATABASE_URL`, `SECRET_KEY`,
   `DEBUG=False`, `ALLOWED_HOSTS=<render-host>`, `CORS_EXTRA_ORIGINS=<vercel-url>`.
3. **Frontend (Vercel):** import `frontend/`, set
   `VITE_API_URL=https://<render-host>/api` (see `frontend/.env.production`).
4. **CI deploy hooks:** add `RENDER_DEPLOY_HOOK` (vars) and `VERCEL_TOKEN`
   (secrets) to GitHub so pushes to `main` redeploy.

Verify: `https://<render-host>/api/health/` → `{"status": "ok", ...}`,
`https://<render-host>/api/docs/` for Swagger.

## Notes

- UI uses Bootstrap 5 (not Tailwind): the spec's `tailwind.config.js` was
  intentionally skipped — Bootstrap was already wired through the SPA and a
  rewrite added no product value.
- Frontend TypeScript (`.ts`/`.tsx`) is used instead of the spec's `.js`/`.jsx`
  file names; API and component structure match the spec one-to-one.

## License
MIT
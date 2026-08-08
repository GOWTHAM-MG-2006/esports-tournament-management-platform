# Esports Tournament Management Platform

> Full-stack backend API for managing esports tournaments —
  team registration, bracket generation, match scheduling, and live standings.

## Tech Stack
- Backend: Python 3.14, Django 5.1.15, Django REST Framework 3.15.2
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

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register/ | Register new user | No |
| POST | /api/auth/login/ | Login, get JWT tokens | No |
| POST | /api/auth/refresh/ | Refresh access token | No |
| GET | /api/auth/me/ | Get current user | Yes |
| GET/POST | /api/teams/ | List/create teams | Yes |
| GET/PUT/DELETE | /api/teams/{id}/ | Team detail | Yes |
| POST | /api/teams/{id}/add-member/ | Add team member | Yes |
| GET/POST | /api/tournaments/ | List/create tournaments | Yes |
| GET/PUT/DELETE | /api/tournaments/{id}/ | Tournament detail | Yes |
| POST | /api/tournaments/{id}/open-registration/ | Open registration | Yes |
| POST | /api/tournaments/{id}/close-registration/ | Close registration | Yes |
| POST | /api/tournaments/{id}/register-team/ | Register team for tournament | Yes |
| GET | /api/tournaments/{id}/matches/ | Get tournament matches | Yes |
| GET | /api/tournaments/{id}/bracket/ | Get bracket view | Yes |
| POST | /api/matches/generate-bracket/{tournament_id}/ | Generate bracket | Yes |
| POST | /api/matches/{id}/submit-result/ | Submit match result | Yes |
| GET | /api/docs/ | Swagger UI | No |

## Running Tests
pip install -r requirements-dev.txt
pytest

## License
MIT
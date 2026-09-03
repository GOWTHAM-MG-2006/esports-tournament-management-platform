# CHANGELOG

## [Day 41] — 2026-09-06
### Added
- Review-II preparation: deploy configs (`Procfile`, gunicorn, `STATIC_ROOT`,
  `CORS_EXTRA_ORIGINS`, `frontend/.env.production`), README v2 (full routes/endpoints,
  tests, deployment, Bootstrap deviation note), CHANGELOG Days 13–41

## [Day 29] — 2026-08-29
### Added
- CI: `frontend` job (Node 20, `npm ci`, oxlint, vitest, build) + `deploy` job
  (Render deploy hook, Vercel) on pushes to `main`; backend job renamed `backend`

## [Day 25] — 2026-08-25
### Added
- Backend tests: refresh/logout, duplicate/capacity/seed/RBAC, health (51 passed, was 32)
- Frontend tests: vitest + Testing Library (6 passed), `vitest.config.ts`, `test` script

## [Day 20] — 2026-08-20
### Added
- Frontend pages: TeamDetail (`/teams/:id`), Seeding, Standings, Health, Admin;
  components `BracketView`, `ErrorBoundary`, `LoadingSpinner`; `src/api/auth.ts`;
  `VITE_API_URL` support + `frontend/.env.example`
- Backend: `GET /api/tournaments/{id}/registrations/` for the seeding UI

## [Day 15] — 2026-08-15
### Added
- RBAC: `IsOrganizer` guard on open/close-registration, seed, generate-bracket, submit-result
- `Registration.seed` field + migration + `POST /api/tournaments/{id}/seed/`
- `remove-member` endpoint, `add-member` 404 handling
- DRF pagination (page size 20), email backend stubs (console dev / SMTP prod)

## [Day 13] — 2026-08-11
### Fixed
- `submit-result`: serializer now receives the match instance, reads `winner` (was `winner_id` KeyError)
- Winner propagation parity: uses `match.position % 2` (was `next_match.position`)
### Added
- `GET /api/health/` health check, `POST /api/auth/logout/` token blacklist

## [Day 12] — 2026-08-09
### Added
- Frontend: React + Vite + Bootstrap SPA with auth (login/register), teams, tournaments, matches, and bracket views

## [Day 11] — 2026-08-08
### Added
- README v1: project overview, tech stack, local setup guide, API endpoint table, test instructions
- Review-I preparation: final test run and checklist verification

### Fixed
- GitHub Actions test job: added `pythonpath = backend` to pytest.ini (pytest-django could not find the `config` module when run from the project root)

## [Day 10] — 2026-08-07
### Added
- Bracket generation service (`BracketService`) with recursive seeding for full brackets and byes
- Automatic winner advancement after match results
- `generate-bracket` and `submit-result` API actions on matches
- Bracket tests: 4/5/6/8-team generation, bye handling, result submission, winner validation

## [Day 9] — 2026-08-06
### Added
- Tournament viewset with CRUD and full registration flow (open/close registration, register team)
- Bracket and matches listing actions on tournaments
- `seed_demo` management command
- Tournament registration and seeding tests

## [Day 8] — 2026-08-05
### Added
- Team viewset with CRUD operations
- `add-member` endpoint for team membership
- Team/team-member tests

## [Day 7] — 2026-08-04
### Added
- JWT authentication service (register, login, refresh, me endpoints)
- Password hashing and token-based session management
- Authentication tests

## [Day 6] — 2026-08-03
### Added
- DRF serializers for all models
- Envelope response renderer for consistent API responses
- Schema/serializer tests

## [Day 5] — 2026-08-02
### Added
- All six Django ORM models with constraints: User, Team, TeamMember, Tournament, Registration, Match
- Model/test coverage for model relationships and validation rules

## [Day 4] — 2026-08-01
### Added
- ERD, architecture, and DBML diagrams for the project

## [Day 3] — 2026-07-31
### Added
- Django settings configured with environment variables
- PostgreSQL database configuration
- Authentication settings (JWT)
- GitHub Actions CI workflow scaffolding

## [Day 2] — 2026-07-30
### Added
- Django project structure and virtual environment
- Initial `config` app with base settings

## [Day 1] — 2026-07-29
### Added
- Problem_Statement.md finalized and committed
- Initial repository structure with LICENSE and .gitignore
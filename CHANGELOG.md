# CHANGELOG

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
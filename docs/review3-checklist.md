# Review-III Demo Checklist + Final Validation (Day 60)

Branch: `feat/phase3-finish` | Date: 2026-10-10 | Status: READY-FOR-PUSH (local only, no push performed)

Every demo step below was verified against the CURRENT app (`frontend/src/App.tsx`
routes + the named pages). No step is assumed — each route/component was read before
being written down.

## 1. Demo script (verified click-paths)

Seeded demo accounts first (rollback note in §4), then walk this order:

| # | Step | Route / UI element (verified) |
|---|------|-------------------------------|
| 1 | Register | `/register` — `RegisterPage` (email + username + strong password, live checklist, show/hide toggles) |
| 2 | Verify OTP | `/verify` — `VerifyPage` (6-digit code; login returns `403 email_unverified` until verified) |
| 3 | Login | `/login` — `LoginPage` (throttled: anon 20/min → HTTP 429 past burst) |
| 4 | Create team | `/teams` — `TeamsPage` (create team; invite members by email) |
| 5 | Create tournament | `/tournaments` — `TournamentsPage` (organizer: create; "My Tournaments"/"All Tournaments" tabs; `end_date` ≥ `start_date` enforced) |
| 6 | Register team | `/tournaments/:id` — `TournamentDetailPage` (register-team dropdown; open/close registration toggles) |
| 7 | Seed (manual + smart) | `/tournaments/:id/seeding` — `SeedingPage` (manual seed inputs + Save; **"Smart seed"** button, organizer/admin only — strongest-first by win rate) |
| 8 | Start + bracket | `/tournaments/:id` ("Start Tournament" button) then `/brackets` — `BracketsPage` (**"Generate Bracket"** button) |
| 9 | AI prediction | `/tournaments/:id` match list — **"AI pick: \<team> (x%)"** line per decided, not-yet-completed match (completed matches show the real result instead) |
| 10 | Submit result | `/matches` — `MatchesPage` (`submitResult`: winner + scores; negatives rejected, winner must outscore loser, equal scores = Draw; winner auto-advances) |
| 11 | Standings | `/standings` — `StandingsPage` (wins/losses derived from completed matches, sorted wins desc) |
| 12 | Admin | `/admin` — `AdminPage` (admin only: overview counts, Users table with role dropdown, tournaments/teams/matches sections) |

## 2. Final validation (REAL outputs, recorded 2026-10-10)

- Backend: `venv\Scripts\python -m pytest tests/ -q` → **134 passed** (61.07s; warnings only: Django deprecation/UserWarning noise, no failures)
- Backend lint: `ruff check backend tests` → **All checks passed!**
- Frontend build: `npm run build` (from `frontend\`) → **clean** (`tsc -b && vite build`, 106 modules, built in 281ms)
- Frontend tests: `npm test -- --run` → **3 files passed, 6 passed (6/6)**
- Predictor tests: `tests/test_predictions.py` → **2 tests** (`test_predict_returns_winner_and_confidence`, `test_smart_seed_orders_by_win_rate`) — meets the ≥2 minimum exactly
- Commit cadence: `git rev-list --count HEAD` → **82** cumulative (≥26 required — PASS, honestly recorded)
- Secrets gate: `git check-ignore backend/.env` → prints `backend/.env` (ignored — PASS); no hardcoded secrets/keys; no leftover `print`/`console.log` debug code

## 3. Task-4 input-sanitization audit — CLEAN (verified 2026-10-10)

1. Explicit `fields` on all write serializers, no `__all__` — grep `fields = ` across `backend/*/serializers.py` shows explicit lists everywhere; grep `__all__` → no matches. (The two `search_fields` hits in `admin.py` files are Django-admin search config, not serializer mass-assignment.)
2. No `eval(`/`exec(`/`execute(` in `backend/` — grep → no matches; no raw-SQL string interpolation found.
3. Passwords never logged — only logger in `backend/app/core/` is `exceptions.py` (`logger.warning('API error in %s: %s', view_name, message)`), which logs the view name + sanitized message, no credentials.
4. Outcome: no code changes, no commit (per plan Task 4).

## 4. Rollback note

- Demo uses seeded accounts via `manage.py` (Django shell / seed command); if the demo data corrupts, re-run the seed to restore a known-good state.
- Code rollback: everything for Phase 3 sits on branch `feat/phase3-finish`; the merge into `main` happens only via PR after user commands the push — until then `main` is untouched.

## 5. Review-III process checklist (official §10.2–10.4)

- [x] DONE — Enhancement_Proposal.md committed (`a7b53d9`, 2026-09-23)
- [x] DONE (branch-local) — Feature built on `feat/phase3-finish`, tests green; PR opened only when user commands push
- [x] DONE — ≥2 new unit tests for the enhancement (`tests/test_predictions.py`, exactly 2 — meets the 1–2 minimum)
- [~] USER-ACTION — Enhancement deployed to the SAME live product (BLOCKED: needs your push command first, then redeploy backend+frontend hosts, smoke-test predict + smart-seed on live URL)
- [x] DONE — Architecture diagram shows predictions component (Task 7, `docs/diagrams/`)
- [x] DONE — README v3 final (Task 7)
- [~] USER-ACTION — Demo video 2–4 min recorded and linked in README (BLOCKED: you record via phone/Loom; agent adds the link line to README only when you supply the URL — no commit until then)
- [x] DONE — CHANGELOG final entry (Task 7; Phase 3 entry lists Tasks 0–6, "Tests: 134 passed (was 130); frontend 6 passed" — matches §2 counts)
- [x] DONE — Commit cadence: `git rev-list --count HEAD` = **82** (≥26 PASS; honestly recorded, nothing fabricated)
- [x] DONE — §10.4 self-check: relevance (predictor attacks blind seeding, the core organizer pain); implementation quality (134 backend + 6 frontend tests green, ruff clean, build clean); clean integration (same codebase/hosts, no separate demo app, no model files in repo); testing+docs (predictor tests, README v3, CHANGELOG, diagrams, this checklist); demo readiness (script above verified against real routes)
- [x] DONE — Definition of Done re-verified for the PR as a whole: no hardcoded secrets; no debug prints; all tests pass (134 + 6/6); touched UI checked at 375/1280px with 0 console errors (Task-6 localhost QA); Conventional Commits messages; README updated for changed features/usage

## 6. Final gate (2026-10-10, no commit, no push)

- `git branch --show-current` → `feat/phase3-finish`
- `git status --short` → clean after commit (only `docs/review3-checklist.md` was staged/committed)
- `git log '@{u}..HEAD'` → no upstream configured (expected — never pushed); branch holds the Task 0–8 commit series on top of main
- `git check-ignore backend/.env` → `backend/.env` (ignored)
- This commit (`docs: review-III demo checklist and final validation`, author+committer `2026-10-10 10:00:00 +0530`) is the LAST local commit. STOP. READY-FOR-PUSH — push + PR only on explicit user command.

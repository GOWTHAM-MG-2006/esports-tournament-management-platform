# Problem Statement

## 1. Title
Esports Tournament Management Platform

## 2. Domain
Sports Technology / Gaming / Event Management

## 3. Who is the user?
- Player/Team Captain: registers a team, joins tournaments, views brackets and match schedules
- Tournament Organizer: creates tournaments, sets format, manages registrations, enters match results
- Admin: full platform control — can override results, ban users, manage all tournaments

## 4. What problem are we solving?
Esports tournament organizers currently manage brackets on paper,
spreadsheets, or disconnected Discord threads, causing scheduling conflicts,
lost results, and zero visibility for players. A player cannot see live
bracket progress or upcoming match times without asking the organizer
directly. This platform digitizes the entire tournament lifecycle — from
team registration to bracket generation to live standings — in one place,
eliminating manual errors and giving all stakeholders real-time visibility.

## 5. Proposed Solution
- Organizers create tournaments with format selection (single elimination)
- Teams register; organizer locks registrations and auto-generates bracket
- Bracket engine places teams into rounds, handles byes for non-power-of-2 counts
- Organizer enters match results; winners auto-advance to the next round node
- Players see live standings, their next match time, and bracket state
- Email notification sent when a match is scheduled or a result is posted

## 6. Core Entities / Database Tables
1. Users (id, name, email, password_hash, role, created_at)
2. Teams (id, name, logo_url, captain_id, created_at)
3. TeamMembers (id, team_id, user_id, joined_at)
4. Tournaments (id, name, game_title, format, status, max_teams,
   prize_info, created_by, created_at)
5. Registrations (id, tournament_id, team_id, seed, registered_at)
6. Matches (id, tournament_id, round_number, position, team1_id,
   team2_id, winner_id, status, scheduled_at, completed_at)

## 7. User Roles & Permissions
- Admin: create/delete any tournament, manage all users, override match results
- Organizer: create tournaments, manage registrations, enter results, generate bracket
- Player/Team Captain: register team, join tournament, view bracket and schedule

## 8. Success Criteria
- A team captain can register their team to a tournament in under 2 minutes
- An organizer can generate a full bracket for 8 teams in under 30 seconds
- Match results entered by organizer immediately reflect in the bracket view
- A player can view their next match time without any organizer interaction

## 9. Out of Scope
- Real-money prize distribution or payment processing
- Live game score ingestion via game APIs (e.g., Riot API)
- Mobile native app (web-responsive only)
- Live video streaming or spectating
- Double-elimination format (single elimination only for this capstone)

## 10. Chosen Track
Python — Django REST Framework (Backend) + React.js + Tailwind CSS (Frontend)
PostgreSQL (Database) — hosted on Railway
Backend hosted on Render, Frontend hosted on Vercel

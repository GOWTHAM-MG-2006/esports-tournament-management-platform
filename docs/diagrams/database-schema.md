# Database Schema — DBML Format

```dbml
Table users {
  id bigint [pk, increment]
  email varchar [unique, not null]
  username varchar [not null]
  password varchar [not null]
  last_login datetime
  role varchar [default: 'player']
  is_active boolean [default: true]
  is_staff boolean [default: false]
  is_superuser boolean [default: false]
  date_joined datetime [default: `now()`]
}

Table email_otps {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  code_hash varchar [not null, note: 'SHA-256 of the 6-digit code']
  created_at datetime [default: `now()`]
  expires_at datetime [not null, note: '10 minutes after issue']
  attempts int [default: 0, note: 'max 5, then a fresh code is required']
  used boolean [default: false]
}

Table teams {
  id bigint [pk, increment]
  name varchar [unique, not null]
  tag varchar [unique, not null]
  owner_id bigint [ref: > users.id]
  created_at datetime [default: `now()`]
}

Table team_members {
  id bigint [pk, increment]
  team_id bigint [not null, ref: > teams.id]
  user_id bigint [not null, ref: > users.id]
  role varchar [default: 'member']
}

Table team_join_requests {
  id bigint [pk, increment]
  team_id bigint [not null, ref: > teams.id]
  user_id bigint [not null, ref: > users.id]
  requested_by bigint [ref: > users.id]
  role varchar [default: 'member']
  status varchar [default: 'pending', note: 'pending → accepted | declined']
  created_at datetime [default: `now()`]
}

Table tournaments {
  id bigint [pk, increment]
  name varchar [not null]
  game varchar [not null]
  format varchar [not null]
  status varchar [default: 'draft', note: 'draft → registration_open → registration_closed → in_progress → completed']
  max_teams int [not null]
  min_team_members int [default: 1]
  max_team_members int [note: 'null means no limit']
  start_date date [note: 'optional']
  end_date date [note: 'optional, cannot precede start_date']
  prize_pool varchar
  rules text
  created_by bigint [not null, ref: > users.id]
  created_at datetime [default: `now()`]
}

Table registrations {
  id bigint [pk, increment]
  tournament_id bigint [not null, ref: > tournaments.id]
  team_id bigint [not null, ref: > teams.id]
  status varchar [default: 'pending']
  seed int
  registered_at datetime [default: `now()`]
}

Table matches {
  id bigint [pk, increment]
  tournament_id bigint [not null, ref: > tournaments.id]
  round int [not null]
  position int [not null]
  team1_id bigint [ref: > teams.id]
  team2_id bigint [ref: > teams.id]
  winner_id bigint [ref: > teams.id]
  is_bye boolean [default: false]
  status varchar [default: 'scheduled']
  bracket_round_label varchar
  team1_score varchar
  team2_score varchar
  scheduled_at datetime
}
```

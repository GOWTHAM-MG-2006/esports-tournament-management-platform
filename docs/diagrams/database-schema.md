# Database Schema — DBML Format

```dbml
Table users {
  id bigint [pk, increment]
  email varchar [unique, not null]
  username varchar [not null]
  password varchar [not null]
  role varchar [default: 'player']
  is_active boolean [default: true]
  date_joined datetime [default: `now()`]
}

Table teams {
  id bigint [pk, increment]
  name varchar [unique, not null]
  tag varchar [not null]
  owner_id bigint [ref: > users.id]
  created_at datetime [default: `now()`]
}

Table team_members {
  id bigint [pk, increment]
  team_id bigint [not null, ref: > teams.id]
  user_id bigint [not null, ref: > users.id]
  role varchar [default: 'member']
}

Table tournaments {
  id bigint [pk, increment]
  name varchar [not null]
  game varchar [not null]
  format varchar [not null]
  status varchar [default: 'draft']
  max_teams int [not null]
  start_date date [not null]
  end_date date [not null]
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
  status varchar [default: 'pending']
  bracket_round_label varchar
  team1_score varchar
  team2_score varchar
  scheduled_at datetime
}
```

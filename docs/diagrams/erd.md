# Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        bigint id PK
        varchar email UK
        varchar username
        varchar password
        varchar role
        boolean is_active
        boolean is_staff
        boolean is_superuser
        datetime date_joined
    }
    TEAM {
        bigint id PK
        varchar name
        varchar tag
        bigint owner_id FK
        datetime created_at
    }
    TEAMMEMBER {
        bigint id PK
        bigint team_id FK
        bigint user_id FK
        varchar role
    }
    TOURNAMENT {
        bigint id PK
        varchar name
        varchar game
        varchar format
        varchar status
        int max_teams
        date start_date
        date end_date
        varchar prize_pool
        text rules
        bigint created_by FK
        datetime created_at
    }
    REGISTRATION {
        bigint id PK
        bigint tournament_id FK
        bigint team_id FK
        varchar status
        int seed
        datetime registered_at
    }
    MATCH {
        bigint id PK
        bigint tournament_id FK
        int round
        int position
        bigint team1_id FK
        bigint team2_id FK
        bigint winner_id FK
        boolean is_bye
        varchar status
        varchar bracket_round_label
        varchar team1_score
        varchar team2_score
        datetime scheduled_at
    }
    USER ||--o{ TEAM : owns
    USER ||--o{ TEAMMEMBER : belongs_to
    TEAM ||--o{ TEAMMEMBER : has
    USER ||--o{ TOURNAMENT : creates
    TOURNAMENT ||--o{ REGISTRATION : has
    TEAM ||--o{ REGISTRATION : registers
    TOURNAMENT ||--o{ MATCH : has
    TEAM ||--o{ MATCH : team1
    TEAM ||--o{ MATCH : team2
    TEAM ||--o{ MATCH : winner
```

The database is composed of six entities. **users** are the base actor: they own teams, belong to teams as
members, and create tournaments. **teams** group members and register for
tournaments, each registration carrying an optional seed. **tournaments** have a lifecycle
(`draft → registration_open → registration_closed → in_progress → completed`) and contain
registrations as well as the matches generated for the bracket, where each match references two
teams as team1/team2 and an optional winning team — a completed match with no winner is a Draw.

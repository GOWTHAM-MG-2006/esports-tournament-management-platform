# Module Diagram

```mermaid
graph TB
    subgraph Frontend[Frontend]
        UI[React Web App]
    end

    subgraph Backend[Django REST Framework Backend]
        subgraph UsersApp[Users App]
            Auth[Auth Module - register, login, refresh, profile]
        end
        subgraph TeamsApp[Teams App]
            TeamService[Team Module - teams and memberships]
        end
        subgraph TournamentsApp[Tournaments App]
            TournamentService[Tournament Module - lifecycle and registrations]
        end
        subgraph MatchesApp[Matches App]
            BracketService[Bracket Module - seeding, brackets, results, advancement]
        end
        subgraph Core[Core Package]
            Renderers[Renderers]
            Exceptions[Exceptions]
        end
    end

    DB[(PostgreSQL 15)]

    UI --> Auth
    UI --> TeamService
    UI --> TournamentService
    UI --> BracketService
    Auth --> DB
    TeamService --> DB
    TournamentService --> DB
    BracketService --> DB
    Renderers -. shared .-> Auth
    Renderers -. shared .-> TeamService
    Renderers -. shared .-> TournamentService
    Renderers -. shared .-> BracketService
    Exceptions -. shared .-> Auth
    Exceptions -. shared .-> TeamService
    Exceptions -. shared .-> TournamentService
    Exceptions -. shared .-> BracketService
```

The platform is split into four functional modules, each backed by a Django app. The **Auth module** (`users` app)
handles registration, login, token refresh and profile management. The **Team module** (`teams` app) manages
teams and their memberships. The **Tournament module** (`tournaments` app) drives the tournament lifecycle and
team registrations, with eligibility validation. The **Bracket module** (`matches` app) contains the core esports
logic: seeding, single-elimination bracket generation, match state transitions, result submission, and automatic
winner advancement. The shared **Core package** (`app/core`) provides the custom renderers and exception handlers
used by all modules, and every module persists to the shared **PostgreSQL 15** database.
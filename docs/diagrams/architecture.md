# Architecture Diagram

```mermaid
graph TB
    Client["React SPA (frontend/) / Swagger UI"]
    
    subgraph Backend[Django REST Framework]
        Views[ViewSets]
        Services[Services]
        Core[Core - Renderers, Exceptions]
    end
    
    subgraph Apps[Apps]
        Users[users]
        Teams[teams]
        Tournaments[tournaments]
        Matches[matches]
    end
    
    DB[(PostgreSQL 15)]
    
    Client --> Views
    Views --> Services
    Views --> Core
    Services --> DB
    Views --> Apps
```

The backend follows a layered structure. A client — the React SPA in `frontend/` or Swagger UI —
talks to the Django REST Framework **views**, which delegate business logic to **services** and rely on the shared
**core** package for rendering and exception handling. Each Django **app** (users, teams, tournaments, matches)
owns its models and persistence, and all data is stored in **PostgreSQL 15**. The React frontend consumes the REST API under `/api/` using JWT authentication (access + refresh tokens).

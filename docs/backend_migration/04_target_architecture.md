# 04. Target Architecture: Clean Layered FastAPI System

## 1. Architectural Philosophy

The restructured Python backend follows a **Strict Layered Domain-Centric Architecture** adhering to Clean Architecture and Inversion of Control. 

```text
HTTP Request
     │
     ▼
┌────────────────────────────────────────────────────────┐
│  src/api/ & src/middleware/ (HTTP Adapter Layer)      │
│  - Parses cookies, path parameters, query parameters   │
│  - Validates syntax with Pydantic schemas              │
│  - Injects current user, company, & branch context     │
└──────────────────────────┬─────────────────────────────┘
                           │ Invokes
                           ▼
┌────────────────────────────────────────────────────────┐
│  src/service/ (Business Logic & Workflows Layer)       │
│  - Orchestrates multi-step hospital domain workflows   │
│  - Enforces permissions & domain policies              │
│  - Invokes validation rules from src/validation/       │
│  - Coordinates database transactions via DAL           │
└────────────┬─────────────────────────────┬─────────────┘
             │ Calls                       │ Calls
             ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ src/validation/          │  │ src/helpers/             │
│ - Pure domain invariants │  │ - Pure deterministic     │
│ - Uniqueness & range     │  │   calculations (paise,   │
│ - State transitions      │  │   UHID, date formatting) │
└──────────────────────────┘  └──────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│  src/repository/ (Query Construction Layer)           │
│  - Builds SQLAlchemy Core / ORM statements             │
│  - Applies multi-tenant and branch filters             │
│  - FORBIDDEN from executing queries                    │
└──────────────────────────┬─────────────────────────────┘
                           │ Passes Statement
                           ▼
┌────────────────────────────────────────────────────────┐
│  src/dal/ (Data Access Layer - EXCLUSIVE Execution)    │
│  - Connection pooling (asyncpg / psycopg2 / aiosqlite) │
│  - Session lifecycle & transaction demarcation         │
│  - Sole layer executing session.execute(), commit()    │
└──────────────────────────┬─────────────────────────────┘
                           │ Executes
                           ▼
              PostgreSQL / SQLite Database
```

---

## 2. Layer Responsibilities & Strict Boundaries

### 2.1 `src/constants/`
- Centralized constants, immutable enumeration codes, and system identifiers.
- **Allowed**: `ErrorCodes`, `Permissions`, `Roles`, `VisitStatuses`, `PaymentModes`.
- **Forbidden**: Imports from `dal`, `models`, `repository`, `service`, or `api`.

### 2.2 `src/dal/` (Data Access Layer)
- **The exclusive execution boundary**.
- **Allowed**: Engine configuration, session management, transaction context managers (`with dal.transaction()`), executing statements via `session.execute()`, commit, rollback.
- **Forbidden**: Domain logic, business decisions, Pydantic schemas.

### 2.3 `src/models/`
- Declarative SQLAlchemy mappings representing the authoritative SQL schema in `@sql/`.
- Divided by schema: `global_schema`, `master`, `public`, `staging`.
- **Forbidden**: Query execution, Pydantic definitions, service logic.

### 2.4 `src/repository/`
- Aggregates and persistence queries.
- **Allowed**: Constructing `select()`, `insert()`, `update()`, `delete()` expressions; passing them to `dal.execution`.
- **Forbidden**: Calling `.execute()`, `.commit()`, or `.rollback()`.

### 2.5 `src/service/`
- Pure business operations, transactions, and domain events.
- **Allowed**: Calling repositories, applying validation rules, coordinating multi-step transactions via `dal.transaction()`.
- **Forbidden**: Direct SQL execution, FastAPI `Request`/`Response` references.

### 2.6 `src/validation/`
- Single source of truth for business and domain validation rules.
- **Forbidden**: Database execution, HTTP routing.

### 2.7 `src/schemas/`
- Single source of truth for Pydantic v2 DTOs (Request bodies, Response models, Query filters).
- **Forbidden**: Database queries, ORM table definitions.

### 2.8 `src/api/`
- Thin HTTP routing layer.
- **Allowed**: Unpacking HTTP requests, invoking services, mapping outputs to Pydantic responses.
- **Forbidden**: Database execution, business logic, ORM definitions.


# AI Agent Access Settings & Rules (`AGENTS.md`)

This file defines the permissions and boundaries for AI agents operating within `c:\Users\smani\OneDrive\Desktop\git\hospital-management-CRM`.

---

## 1. Access Permissions

### 1.1 Read Access: **COMPLETE**
The AI agent is granted **complete read access**:
- Full read access across all files and folders in this project (`backend/`, `frontend/`, `db/`, `docs/`, scripts, configs).
- Full read access to external reference directories (e.g., `C:\Users\smani\OneDrive\Desktop\git\tes\hospital-management-CRM`) to compare API contracts, schemas, and implementation parity.

### 1.2 Write Access: **STRICTLY INSIDE THIS PROJECT ONLY**
The AI agent is granted write access **strictly within the bounds of this project directory** (`c:\Users\smani\OneDrive\Desktop\git\hospital-management-CRM`):
- **Allowed Project Scopes**:
  - `backend/` — API routers, schemas, services, repositories, DAL queries, models, and tests.
  - `frontend/` — Web application code (`apps/web/src/`), reusable UI components, and shared packages (`packages/shared`, `packages/ui`).
  - `db/` — Database migration files, schema definitions, and seed data scripts.
  - `docs/` — Documentation, API mappings, and milestone trackers.
- **Strictly Forbidden (External & Protected Scopes)**:
  - **NO WRITE OUTSIDE THIS PROJECT**: Never write or modify files outside `c:\Users\smani\OneDrive\Desktop\git\hospital-management-CRM` (e.g., external folders like `tes/` are strictly read-only).
  - **NEVER COMMIT OR PUSH TO GIT**: Do NOT run `git commit`, `git push`, `git add`, or stage code changes. Git commits and merges are handled manually by the developer.
  - **CRITICAL PROTECTED FILES**: Never overwrite live databases (`*.db`, `*.sqlite*`, `data/**`) or secret credentials (`.env*`).
  - **MANAGED DIRECTORIES**: Never manually edit package manager directories (`venv/`, `node_modules/`, `dist/`).

---

## 2. Core Architecture & Engineering Rules

1. **Multi-Tenancy & Branch Scoping**:
   - All clinical and facility endpoints must be scoped to `/api/b/:branch/*` (or `/api/b/{branch_slug}/*`).
   - Requests for another branch's records must return `404 Not Found`.

2. **Standard Error Envelope**:
   - Error responses must follow:
     ```json
     {
       "error": "Human readable error description",
       "code": "ERROR_CODE",
       "fields": { "field_name": ["Specific validation error"] }
     }
     ```

3. **Financial Consistency**:
   - Monetary values across payloads, database columns, and frontend props are always in **integer paise** (never floats).

4. **Security & Session Authentication**:
   - Sessions are managed via `HttpOnly; SameSite=Lax; Path=/` cookies named `sid`.
   - Store only SHA-256 hashes of session tokens in the database. Never transmit raw tokens in JSON bodies.

5. **Soft Deletes & Auditing**:
   - Use soft deletes with `deleted_at`.
   - All status, administrative, and financial changes must record an entry in `audit_log`.

6. **Offline-First Resilience**:
   - No external CDN runtime dependencies or telemetry scripts.

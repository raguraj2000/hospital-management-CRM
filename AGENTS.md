# AI Agent Access Settings & Rules (`AGENTS.md`)

This file defines the permissions and boundaries for AI agents operating within `C:\Users\smani\OneDrive\Desktop\git`.

---

## 1. Access & Execution Boundaries

### 1.1 Primary Workspace Scope: `C:\Users\smani\OneDrive\Desktop\git`
- **Maximum Access Allowed**: Full unprompted access is granted for all operations inside `C:\Users\smani\OneDrive\Desktop\git` and all its child repositories/projects (including `hospital-management-CRM`, `tes/`, and sister workspaces).
- **Outside Scope Boundary**: Any action that attempts to read, write, or execute commands **outside** `C:\Users\smani\OneDrive\Desktop\git` requires explicit user permission.

### 1.2 Unrestricted Operations Inside Scope (Auto-Approved)
Inside `C:\Users\smani\OneDrive\Desktop\git`, the agent has standing auto-approval for all development activities:
1. **File & Folder Operations**: Create, edit, rename, delete files and folders (`mkdir`, `New-Item`, writing/editing source files, configs, scripts, tests).
2. **Command & Terminal Execution**: Full execution rights for all tools, compilers, package managers, and runtimes:
   - Python: `python *`, `.\venv\Scripts\python.exe *`, `pytest *`
   - Node: `npm *`, `pnpm *`, `npx *`, `node *`
   - Servers: `uvicorn *`, dev servers, background processes
   - Diagnostics: `netstat *`, `Get-NetTCPConnection *`, `Get-Process *`, `tasklist *`, `curl *`, `Test-NetConnection *`
   - Search: `Select-String *`, `grep *`, `rg *`, `findstr *`, `Get-ChildItem *`
   - Git Inspection: `git status`, `git diff`, `git log`, `git branch`, `git checkout`

### 1.3 The ONLY Restrictions Inside Scope: Git Write Commands
The ONLY prohibited actions inside `C:\Users\smani\OneDrive\Desktop\git` are **git write operations**:
- **NEVER RUN AUTOMATICALLY**:
  - `git commit`
  - `git push`
  - Any commands that stage or mutate remote Git history without explicit user instruction.
- All code changes remain in working tree for user review and manual commit.

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

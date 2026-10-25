# MASTER AI AGENT PROMPT — Hospital Management CRM Backend Migration

## 1. Your Role

Act as a **Principal Software Architect, Python FastAPI Engineer, Database Migration Specialist, and Multi-Agent Orchestrator**.

Your mission is to complete the backend migration of an existing Hospital Management CRM from **Node.js + TypeScript + Hono + Drizzle ORM to Python + FastAPI**, using 15 specialized AI coding agents working in parallel where safe.

This is an implementation task, not a planning-only task. Inspect the actual repositories, write and integrate production-quality code, run tests, resolve integration failures, and verify all 173 inventoried API operations.

Do not stop after producing a plan, scaffolding routers, or generating placeholder implementations.

## 2. Project Repository Structure

Use the following exact local paths.

**Current Python backend — primary implementation target**
`C:\Users\smani\OneDrive\Desktop\git\hospital-management-CRM\backend\src`

**Current frontend — preserve existing application**
`C:\Users\smani\OneDrive\Desktop\git\hospital-management-CRM\frontend\apps\web`

**New database scripts — authoritative migration reference**
`C:\Users\smani\OneDrive\Desktop\git\hospital-management-CRM\db`

**Legacy combined application — source of business logic**
`C:\Users\smani\OneDrive\Desktop\git\tes\hospital-management-CRM\apps`

**API inventory — 173 frontend API operations**
`/mnt/data/api_list_173_module_wise.txt`

The inventory documents the legacy Node.js API routes, their HTTP methods, their callers, and their intended purposes.

The legacy source code is the primary reference for existing behavior. The new database scripts are the primary reference for the intended database schema. The current Python backend is the implementation target.

Do not assume that any of these directories have the same architecture. Inspect each one before making changes.

## 3. Primary Objective

Complete the backend migration so that:

1. All 173 inventoried API operations are implemented in Python FastAPI.
2. Existing legacy business rules and workflows are preserved.
3. Every endpoint follows the mandatory URL convention.
4. Every endpoint uses the standardized response contract.
5. Database operations use the actual new database schema.
6. Authentication, authorization, tenant isolation, and branch isolation work correctly.
7. The existing frontend continues to function with minimal necessary API integration changes.
8. All modules are integrated, tested, and documented.

**The only major scope is backend migration.**

Do not perform a frontend redesign, introduce a new frontend framework, or make unnecessary UI changes. Modify frontend API configuration, request payloads, or response adapters only when required to integrate the migrated backend.

## 4. Mandatory API Contract

These rules are non-negotiable.

### Rule A — URL format

Every business API must use this format:

`/api/{module_name}/{api_name}`

There must be exactly two path segments after `/api/`:

- First segment: module name.
- Second segment: API operation name.

Examples of valid routes:

- `/api/auth/login`
- `/api/auth/me`
- `/api/patients/list`
- `/api/patients/get-by-id`
- `/api/patients/create`
- `/api/patients/update`
- `/api/visits/list`
- `/api/visits/get-by-id`
- `/api/lab/save-results`
- `/api/pharmacy/dispense`
- `/api/billing/get-invoice`
- `/api/reports/generate`

The following are prohibited:

- `/api/b/patients/123`
- `/api/patients/123`
- `/api/visits/123/checkout`
- `/api/platform/customers/123/owner`
- `/api/branches/123/roles`

Do not define path parameters such as `{id}`, `{branch_id}`, `{visit_id}`, `{customer_id}`, or `{action}`.

Do not use catch-all routes to conceal non-compliant URL structures.

**Important:** HTTP methods do not create additional URL path segments. GET, POST, PUT, PATCH, and DELETE can share a URL when their operations and semantics justify it.

Use explicit, descriptive operation names to avoid ambiguous endpoints.

### Rule B — Identifiers must use query parameters or request bodies

All entity identifiers must be supplied through query parameters or request bodies, never URL path variables.

Examples:

Retrieve a patient:

`GET /api/patients/get-by-id?patient_id=123&branch_id=5`

Update a patient:

`PATCH /api/patients/update`

Example request body:

```json
{
  "patient_id": 123,
  "branch_id": 5,
  "name": "Updated Patient Name"
}
```

Complete a visit checkout:

`POST /api/visits/checkout`

Example request body:

```json
{
  "visit_id": 501,
  "branch_id": 5,
  "payment_method": "UPI"
}
```

For list operations, use query parameters for filtering, sorting, and pagination.

For creation and mutation operations, use validated request bodies. Identifiers belonging to a mutation should ordinarily be included in the request body.

For file uploads, use multipart form data where necessary. For backups and restores, preserve the actual file transfer behavior.

Do not accept a branch ID or tenant ID from the client as proof of authorization. Validate all requested resource scopes against the authenticated user's permissions.

### Rule C — Standard response structure

Every API response must follow this structure:

```json
{
  "status_code": 200,
  "message": "Request completed successfully",
  "data": {},
  "error": null
}
```

The response must always contain exactly these four top-level contract fields:

- `status_code`
- `message`
- `data`
- `error`

Success example:

```json
{
  "status_code": 200,
  "message": "Patient retrieved successfully",
  "data": {
    "patient_id": 123,
    "name": "Sample Patient"
  },
  "error": null
}
```

Validation error example:

```json
{
  "status_code": 422,
  "message": "Request validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "patient_id",
        "message": "Field is required"
      }
    ]
  }
}
```

Resource-not-found example:

```json
{
  "status_code": 404,
  "message": "Patient not found",
  "data": null,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "details": null
  }
}
```

Server-error example:

```json
{
  "status_code": 500,
  "message": "An unexpected error occurred",
  "data": null,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "details": null
  }
}
```

Requirements:

- Use appropriate real HTTP status codes.
- Keep the `status_code` field consistent with the actual HTTP response status.
- Successful requests must return `error: null`.
- Failed requests must return `data: null`, unless an explicitly documented partial-result contract is required.
- Never expose stack traces, database credentials, SQL statements, or sensitive internal details.
- Use a shared response utility or response model rather than manually implementing inconsistent envelopes in every router.
- Normalize FastAPI request validation errors, HTTP exceptions, authentication failures, authorization failures, and unexpected exceptions.
- Ensure framework-generated error responses do not bypass the standard envelope.
- Binary downloads and file streaming may retain their required transport format; they must not be incorrectly wrapped as JSON. Document these explicit transport exceptions.

## 5. Phase One — Repository Discovery

Before implementation, inspect all four repository locations and the API inventory.

### Current backend

Inspect:

- Existing directory structure and Python modules.
- FastAPI application initialization.
- Router registration.
- Database connection and session management.
- Existing ORM models and schemas.
- Configuration and environment variables.
- Authentication and authorization implementation.
- Middleware and exception handlers.
- Existing services, repositories, and utilities.
- Dependencies and test configuration.

### Database scripts

Inspect all relevant database creation, alteration, indexing, constraint, seed, and migration scripts.

Establish:

- Actual table and column names.
- Primary and foreign keys.
- Relationships and join conditions.
- Data types and nullability.
- Unique constraints and indexes.
- Transaction requirements.
- Tenant and branch ownership relationships.

Never invent database columns or assume the legacy schema is identical to the new schema.

### Legacy application

Trace each inventory entry to its actual implementation.

Inspect the associated route, controller, service, SQL or ORM queries, authentication middleware, and frontend caller.

Recover the real behavior for:

- CRUD operations.
- Filtering, sorting, and pagination.
- Validation and default values.
- Business calculations.
- Status transitions.
- Billing and payment rules.
- Pharmacy stock and FEFO allocation.
- Lab result processing and report generation.
- Authentication, sessions, and role permissions.
- Transactions and rollback behavior.
- Audit logging.
- File uploads, downloads, printing, and backup restoration.

The endpoint inventory contains some generic descriptions, duplicate operations, and legacy path parameters. Resolve these by inspecting the actual source code and caller behavior.

Produce a canonical mapping of all 173 inventory entries to their new compliant routes, HTTP methods, request schemas, and expected response behavior.

## 6. Phase Two — Establish Shared Architecture

The coordinator agent must establish shared foundations before parallel implementation begins.

Use the existing project's architecture where practical. Prefer a clear separation of responsibilities:

- `api/` — route registration and endpoint handlers.
- `schemas/` — Pydantic request and response models.
- `services/` — business logic and workflows.
- `repositories/` — database queries and persistence.
- `models/` — ORM models where applicable.
- `core/` — configuration, authentication, permissions, and shared utilities.
- `db/` — database connections and session management, according to existing conventions.
- `tests/` — unit, integration, contract, and regression tests.

These are architectural guidelines, not permission to restructure the entire project unnecessarily.

Establish and document:

1. A shared API response contract.
2. Standard exception handling.
3. A database session lifecycle.
4. Authentication and session handling.
5. Tenant and branch authorization utilities.
6. Shared pagination and filtering conventions.
7. A consistent API naming convention.
8. Logging and audit conventions.
9. Common transaction management patterns.
10. Test fixtures and API contract tests.

Use one consistent dependency injection approach for database sessions and authentication.

Do not let individual agents create conflicting response utilities, database connections, authentication mechanisms, or naming conventions.

## 7. Phase Three — Create 15 Specialized AI Agents

Create 15 independent agents or isolated workstreams, depending on the coding environment's capabilities.

Each agent must receive the same mandatory API contract and repository context, plus its assigned scope.

Parallelize work only where file ownership and shared dependencies permit it. If the environment does not support true parallel agents, execute the same workstreams sequentially while preserving their boundaries.

### Agent 1 — Authentication and Sessions

Inventory entries: 1–4.

Responsibilities:

- Login and logout.
- Current authenticated user.
- Session cookies and session lifecycle.
- Password changes.
- Authentication dependencies and error responses.

Preserve secure cookie attributes, password hashing, session invalidation, and existing authentication semantics.

### Agent 2 — Platform Administration

Inventory entries: 5–13.

Responsibilities:

- Tenant customer listing and provisioning.
- Subscription plan and billing updates.
- Tenant activation and other supported actions.
- Owner profile management.
- Owner password reset.
- Subscription payment history and renewal records.

Ensure platform-level permissions are enforced independently of ordinary hospital branch permissions.

### Agent 3 — Organization and Branch Network Management

Inventory entries: 14–23.

Responsibilities:

- Branch listing and creation.
- Branch metadata updates.
- Branch and organization role definitions.
- Role permission updates.
- Network detection and restrictions.
- Organization owner settings.

Preserve the distinction between organization-wide permissions and branch-specific permissions.

### Agent 4 — Branch Operations, Settings, Backup, and Diagnostics

Inventory entries: 24–34 and 173.

Responsibilities:

- Audit logs.
- Branch database backup and restore.
- Revision or change polling.
- Dashboard KPIs.
- Charge presets.
- Doctor settings and doctor listings.
- Printing headers and logos.
- Client runtime error logging.

Keep backup and restore operations secure, validated, and transactional wherever supported. Preserve binary download and upload behavior.

### Agent 5 — Staff Management and RBAC

Inventory entries: 35–42.

Responsibilities:

- Staff listing and invitations.
- Staff role assignment.
- Staff activation and deactivation actions.
- Staff removal.
- Staff password resets.
- Branch role and permission management.

Preserve authorization checks and audit sensitive administrative actions.

### Agent 6 — Patient Master Management

Inventory entries: 43–49.

Responsibilities:

- Patient directory search and filtering.
- Patient registration and UHID generation.
- Patient profile retrieval.
- Patient demographics updates.
- Patient activation and deactivation.

Prevent duplicate patient records and preserve existing UHID generation and validation rules.

### Agent 7 — Patient-Related Workflows

Inventory entries: 50–59.

Responsibilities:

- Direct patient billing.
- Direct laboratory orders.
- Patient billing history.
- Patient lab-order history.
- Last pharmacy purchase.
- Patient visit history.
- Visit creation for patients.
- Course history.
- Payment of outstanding patient dues.

Coordinate shared service calls with the visit, lab, pharmacy, and billing agents.

### Agent 8 — OPD Queue and Visit Lifecycle

Inventory entries: 60–62, 70, and 90.

Responsibilities:

- Visit queue and appointment listing.
- Visit updates and counter notes.
- Visit deletion according to legacy business rules.
- Sending or advancing a visit to the next workflow stage.
- Calling the next patient.

Preserve visit state transitions, queue ordering, and concurrency behavior.

### Agent 9 — Visit Billing, Checkout, and Clinical Workflow Integration

Inventory entries: 63–69 and 71–89.

Responsibilities:

- Visit invoice retrieval and creation.
- Consultation fees and charge management.
- Treatment course creation under visits.
- Lab order creation and retrieval.
- Prescription retrieval and creation.
- Prescription order management.
- Prescription notes.
- Visit instructions.
- Lab release and report retrieval.
- Pharmacy dispensing notes.
- Combined billing.
- Checkout queue, calculation, payment collection, and visit closure.

Treat checkout as a high-risk workflow. Preserve transaction boundaries, prevent duplicate payments, and ensure bill totals, inventory changes, and visit status updates remain consistent.

### Agent 10 — Clinical Bookmarks and Prescription Management

Inventory entries: 91–102.

Responsibilities:

- Prescription bookmark listing, creation, editing, and deletion.
- Prescription item updates and deletion.
- Prescription note updates and deletion.
- Dosage and frequency suggestions.
- Visit instruction deletion and supported action operations.

Validate that prescription templates and clinical instructions retain their intended associations.

### Agent 11 — Treatment Courses, Procedures, and Templates

Inventory entries: 103–118.

Responsibilities:

- Course item administration status.
- Course template CRUD.
- Treatment course sitting updates.
- Sitting cancellation and start.
- Course deletion and closure.
- Scheduling new sittings.
- Treatment queues.
- Administration and undo operations.
- Due treatment retrieval.

Preserve treatment histories and enforce valid state transitions.

### Agent 12 — Pharmacy Formulary and Inventory

Inventory entries: 119–125.

Responsibilities:

- Inventory valuation reports.
- Medicine search and formulary listing.
- Medicine creation, updates, and soft deletion.
- Stock batch creation and retrieval.
- Stock availability and FEFO-related queries.

Preserve batch quantities, expiry tracking, stock calculations, and medicine pricing rules.

### Agent 13 — Pharmacy Operations and Sales

Inventory entries: 126–131.

Responsibilities:

- Pharmacy dispensing.
- Pharmacy queue.
- Direct pharmacy sales.
- Pharmacy sales invoice retrieval.
- Stock expiry and reorder reports.

Preserve FEFO batch allocation, stock deductions, dispensing validation, invoice consistency, and transaction rollback.

### Agent 14 — Diagnostic Laboratory and Pathology

Inventory entries: 132–147.

Responsibilities:

- Lab order listing and updates.
- Lab result entry and completion.
- Lab package CRUD.
- Laboratory reports.
- Lab test catalog CRUD.
- Standard test loading.
- Test ordering.
- Returning a completed or processed lab workflow to the doctor.

Preserve normal ranges, units, result flags, report status transitions, and relationships between orders, tests, patients, and visits.

### Agent 15 — Billing, Invoicing, Vendors, and Purchases

Inventory entries: 148–172.

Responsibilities:

- Daily cashier reports.
- Billing settings.
- Pending billing queue.
- Invoice listing and retrieval.
- Invoice updates and payments.
- Period revenue reports.
- Operational expenses.
- Vendor registration and maintenance.
- Purchase invoice creation and retrieval.
- Purchase cancellation.
- Supplier payments.
- Purchase profitability reporting.
- Stock intake associated with purchases.

Preserve financial calculations, payment reconciliation, accounts payable, inventory intake, purchase cancellation rules, and audit history.

## 8. Shared Rules for Every Agent

Every agent must:

1. Read its assigned legacy implementation before coding.
2. Follow the actual new database schema.
3. Implement real business logic, not placeholders.
4. Use the shared response contract.
5. Follow the two-segment API URL convention.
6. Never define URL path variables.
7. Add Pydantic request and response schemas where appropriate.
8. Use the shared database session and exception handling.
9. Enforce authentication and authorization.
10. Respect tenant and branch isolation.
11. Handle database transactions correctly.
12. Add meaningful unit and integration tests.
13. Document the endpoint mapping.
14. Avoid modifying files owned by another agent without coordination.
15. Report unresolved dependencies, assumptions, and blockers.

Do not mark an endpoint complete because its route returns HTTP 200. Verify that it performs the correct operation and returns the expected data.

## 9. Multi-Agent Coordination and Integration

The coordinator is responsible for the final working application.

Before agents start, establish:

- A shared API contract document.
- An endpoint ownership matrix.
- A route naming registry.
- A database model and schema ownership policy.
- Shared service interfaces.
- A shared testing strategy.
- A list of protected shared files.
- A common branch and integration strategy.

Avoid having multiple agents independently edit the same application entry point, shared response utilities, database connection, or dependency configuration.

Each agent should deliver its router, schemas, services, repository changes, tests, and endpoint mapping within its assigned scope.

The coordinator must then:

1. Integrate all agent changes.
2. Resolve import and dependency conflicts.
3. Register every router.
4. Remove duplicate or conflicting route definitions.
5. Verify the final application starts successfully.
6. Run the full test suite.
7. Test all endpoints against the new database schema.
8. Fix regressions caused by integration.
9. Confirm frontend compatibility.
10. Repeat testing after the final code changes.

If a shared dependency is incomplete, coordinate its implementation rather than adding competing implementations.

## 10. Frontend Integration Requirements

The frontend remains in:

`C:\Users\smani\OneDrive\Desktop\git\hospital-management-CRM\frontend\apps\web`

Do not redesign existing screens or replace the frontend architecture.

Inspect the existing API client, authentication hooks, service modules, and every relevant API caller.

Because the new API routes differ from the legacy routes, make the minimum required integration changes:

- Update endpoint URL mappings.
- Move path identifiers into query parameters or request bodies.
- Update request methods and payloads where required.
- Adapt response handling to the standardized envelope.
- Preserve authentication cookies and credentials.
- Preserve pagination, filtering, sorting, and error handling.
- Preserve binary report, print, backup, and restore workflows.
- Confirm that existing screens can still perform their original workflows.

Do not solve frontend compatibility by introducing prohibited path parameters into the Python backend.

If a shared frontend API adapter can handle the response envelope consistently, prefer that approach over modifying every component independently.

Verify the affected flows end to end.

## 11. Reports Must Be a Separate Dynamic Module

Treat reports as a distinct backend module, even when the underlying data originates in patients, billing, pharmacy, laboratory, visits, or inventory.

Create a consistent reports API architecture for supported report types.

Requirements:

- A centralized report catalog or equivalent registration mechanism.
- A common report metadata contract.
- Report-specific parameter schemas and validation.
- Dynamic report execution based on registered report definitions.
- A consistent response envelope.
- Authorization and tenant/branch filtering for every report.
- Support for filtering, date ranges, pagination, and sorting when relevant.
- Structured tabular results suitable for dynamic frontend rendering.
- Optional summary metrics and aggregates where required by the report.
- Export support for required formats, preserving file-download semantics.
- A clear separation between report definitions, query logic, and presentation.

The frontend should be able to use a shared report interface that obtains report metadata and available parameters from backend APIs.

For example, a report definition may expose its identifier, title, category, parameter definitions, and supported output formats. The frontend then builds the relevant input controls dynamically from the metadata.

Do not create a separate hardcoded frontend page for every report when a shared dynamic report page can support the requirement.

Do not generate arbitrary SQL from client-provided input. Use registered report implementations, parameterized queries, and explicit authorization checks.

First inventory all existing reports and their current behavior. Migrate the existing reports before introducing additional report types.

## 12. Database and Data Integrity Requirements

The database scripts in the new `db` directory must be inspected before implementing queries.

Requirements:

- Use the configured database engine and existing connection conventions.
- Match actual column types, table names, constraints, and relationships.
- Use parameterized queries or safe ORM operations.
- Do not hardcode production credentials.
- Do not silently create alternative tables to bypass missing schema definitions.
- Do not delete or overwrite existing data during migration.
- Preserve transaction behavior for billing, payments, stock, purchases, and checkout.
- Use database constraints and locking where necessary to prevent race conditions.
- Make stock deductions and financial updates atomic.
- Validate tenant and branch ownership before reads and writes.
- Preserve audit records and soft-delete semantics where the legacy system uses them.
- Add indexes or migrations only when justified by the schema and application requirements.

If a required table or column is absent, identify the discrepancy and implement the appropriate migration only when supported by the intended schema and business behavior.

## 13. Security Requirements

Because this is a hospital management application, protect patient and financial information.

Implement and verify:

- Authentication on protected endpoints.
- Role-based and resource-based authorization.
- Tenant isolation and branch-level access restrictions.
- Secure password hashing and reset workflows.
- Appropriate session expiration and invalidation.
- Request validation and safe error handling.
- SQL injection prevention.
- Upload size and file type validation.
- Secure backup and restore permissions.
- Audit logging for sensitive actions.
- Prevention of unauthorized patient record access.
- Prevention of duplicate payments and unauthorized financial changes.
- Safe logging that does not expose passwords, tokens, or sensitive clinical data.

Do not treat client-supplied identifiers as authorization evidence.

## 14. API Inventory and Route Mapping

Create a machine-readable inventory, preferably JSON or CSV, mapping all 173 original inventory entries to the new backend.

Each entry should include:

- Original inventory number.
- Original HTTP method and endpoint.
- Module and operation name.
- New HTTP method and compliant endpoint.
- Request parameters and schema.
- Expected response data.
- Authentication requirements.
- Authorization requirements.
- Assigned agent.
- Implementation status.
- Test status.
- Notes about any intentional compatibility changes.

Resolve duplicates by inspecting actual frontend callers and legacy handlers. Preserve distinct operations where they have different behavior, even when they share the same legacy path.

The final route registry must prove that every inventoried operation has an implementation.

Also create a route validation test that rejects any business endpoint with path variables or more than two path segments after `/api/`.

Do not count documentation routes such as `/docs`, `/redoc`, or `/openapi.json` as business API exceptions. Keep them outside the business endpoint inventory.

## 15. Testing and Verification

Create tests at several levels.

### Contract tests

Verify that every business API:

- Uses the correct HTTP method.
- Follows `/api/{module_name}/{api_name}`.
- Contains no URL path variables.
- Has the required response envelope for JSON responses.
- Returns consistent HTTP and envelope status codes.
- Validates required request fields.

### Business logic tests

Verify:

- Patient registration and retrieval.
- Visit creation and state transitions.
- Prescription creation and modification.
- Laboratory order processing and result submission.
- Medicine batch selection and stock deductions.
- Invoice calculation and payment handling.
- Checkout consistency and duplicate-payment prevention.
- Purchase intake and cancellation.
- Role permissions and tenant isolation.
- Report filtering and authorization.

### Integration tests

Run the API against a test database configured to match the actual schema.

Verify database writes, transaction rollback, joins, constraints, and relationships.

### Frontend regression tests

Where the existing testing environment supports them, verify login, patient management, OPD queues, prescriptions, laboratory workflows, pharmacy dispensing, billing, reports, settings, and administrative operations.

### Final inventory audit

Produce a report showing all 173 inventory entries, their final route mappings, implementation evidence, and test results.

An endpoint is not complete until it is implemented, registered, and verified.

Never report 173/173 completion when tests have not actually been executed.

## 16. Execution Order

Follow this sequence:

**Phase 1 — Discovery**
- Inspect repositories and dependencies.
- Analyze the 173-entry inventory.
- Trace legacy business logic.
- Inspect database scripts.
- Identify missing backend functionality and route conflicts.

**Phase 2 — Shared foundations**
- Establish the API contract.
- Establish the database and authentication dependencies.
- Define shared exception handling.
- Define route naming and endpoint ownership.
- Create the test strategy.

**Phase 3 — Parallel implementation**
- Start the 15 specialized workstreams.
- Keep their file ownership separate.
- Coordinate shared service dependencies.
- Implement and test assigned endpoint groups.

**Phase 4 — Integration**
- Integrate routers, services, schemas, and tests.
- Resolve duplicate route mappings.
- Update the minimum necessary frontend API integration.
- Implement and register the separate dynamic reports module.

**Phase 5 — Verification**
- Run backend startup and import checks.
- Run unit and integration tests.
- Run all applicable database-backed tests.
- Run the route contract audit.
- Run frontend regression checks.
- Fix all discovered defects and rerun affected tests.

**Phase 6 — Final delivery**
- Produce the endpoint mapping.
- Produce the test and coverage reports.
- Document startup and configuration requirements.
- List any remaining blockers honestly.

Do not stop at the end of a phase if a required task remains incomplete.

## 17. Definition of Done

The migration is complete only when all of the following are verified:

- [ ] All 173 inventoried operations are accounted for.
- [ ] Every operation has a compliant new route.
- [ ] No business API uses URL path variables.
- [ ] All JSON responses follow the four-field response contract.
- [ ] File-transfer exceptions are explicitly documented and tested.
- [ ] Business logic is implemented using the actual database schema.
- [ ] Shared authentication and authorization are integrated.
- [ ] Tenant and branch access controls are verified.
- [ ] All 15 agent workstreams are integrated.
- [ ] No placeholder implementations remain for required endpoints.
- [ ] No duplicate or conflicting route registrations remain.
- [ ] The Python application starts successfully.
- [ ] Automated tests have been executed and results recorded.
- [ ] Financial, stock, checkout, and clinical workflows have been tested.
- [ ] The frontend works with minimal necessary integration changes.
- [ ] The separate dynamic reports module is implemented for the inventoried reports.
- [ ] The final endpoint mapping and implementation report are generated.

If an endpoint cannot be verified because the database, environment, credentials, or a required external dependency is unavailable, mark it as blocked and explain the exact reason. Do not misrepresent it as completed.

## 18. Final Report

When implementation finishes, provide:

1. A summary of the migration.
2. The 15 agents or workstreams and their completed scopes.
3. The number of endpoints implemented, integrated, and tested.
4. The list of any failed or blocked endpoints.
5. The final route mapping file location.
6. The test report location and actual test results.
7. The shared architecture and key files created or modified.
8. Any database schema discrepancies.
9. Any required frontend compatibility changes.
10. Exact commands to run the backend and tests.
11. Any remaining production deployment steps.

**Final instruction:** Work directly in the specified repositories. Preserve the existing frontend experience and legacy business behavior while enforcing the new Python backend contract. Prioritize correctness, data integrity, security, and complete endpoint coverage over implementation speed. Do not finish until every endpoint has either been verified or explicitly documented as blocked.
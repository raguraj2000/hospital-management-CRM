# MASTER IMPLEMENTATION PROMPT — HMS BACKEND RESTRUCTURING AND FASTAPI MIGRATION

## 1. Your Role

Act as a Principal Software Architect, Senior Python/FastAPI Engineer, Database Architect, Application Security Engineer, and Migration Lead.

You are responsible for restructuring an existing Hospital Management System (HMS) backend from its current MonoJS/JavaScript implementation into a maintainable, secure, scalable, and production-grade Python backend using FastAPI.

This is a **major backend migration**, not a simple language conversion.

You must inspect the actual repository, understand the existing application behavior, inspect the completed SQL files, establish a migration plan, and implement the new backend incrementally without breaking existing functionality.

Do not merely generate sample code, documentation, or a proposed folder structure. Work directly in the existing project and implement the migration.

## 2. Primary Objectives

The final implementation must satisfy all of the following:

1. Migrate the backend to Python and FastAPI.
2. Preserve existing HMS business rules and functional behavior.
3. Use the completed PostgreSQL SQL files in `@sql/` as the authoritative database structure.
4. Support PostgreSQL as the primary production database.
5. Design the data model and database adapter to support SQLite where technically feasible.
6. Enforce strict separation of responsibilities between application layers.
7. Centralize validation, Pydantic schemas, shared helpers, constants, and database access.
8. Implement secure authentication, authorization, tenant isolation, and auditability.
9. Maintain compatibility with the existing frontend through a documented API contract.
10. Provide automated tests, migration procedures, deployment configuration, observability, and operational documentation.

**Do not claim that the migration is complete unless the implementation, tests, and verification steps substantiate that claim.**

## 3. Mandatory Repository Inspection

Before modifying code, inspect the existing project thoroughly.

Examine:

- Current project structure and package configuration.
- Existing JavaScript/MonoJS backend entry points.
- API routes, controllers, middleware, and authentication logic.
- Business services, helpers, scheduled tasks, and background jobs.
- Existing database access and ORM usage.
- Existing SQL files under `@sql/`.
- Frontend API calls and request/response expectations.
- Environment variables, configuration files, and deployment scripts.
- Existing tests, fixtures, seed data, and migration history.
- Existing error handling, logging, authorization, and audit mechanisms.

Identify the real modules and workflows implemented in the repository. Do not assume that every module mentioned in a specification is fully implemented.

Create an initial assessment at:

`docs/backend_migration/01_current_state_assessment.md`

Include:

- Existing architecture and dependencies.
- Current endpoint inventory.
- Business module inventory.
- Database usage inventory.
- Authentication and authorization flow.
- External integrations and background processes.
- Identified security and reliability risks.
- Missing or incomplete features.
- Existing behavior that must be preserved.
- Migration risks and dependencies.

Create a source-to-target mapping at:

`docs/backend_migration/02_migration_mapping.md`

Map each existing route, controller, service, database operation, middleware component, and background process to its intended Python location.

Do not begin a destructive rewrite before completing this assessment.

## 4. Mandatory Target Folder Structure

Create and maintain the following structure under `src/`.

Adapt naming where necessary to the existing project, but do not merge responsibilities or move restricted logic into unrelated layers.

```text
src/
├── main.py
├── app_factory.py
│
├── constants/
│   ├── __init__.py
│   ├── application.py
│   ├── errors.py
│   ├── permissions.py
│   ├── statuses.py
│   └── events.py
│
├── dal/
│   ├── __init__.py
│   ├── connection.py
│   ├── transaction.py
│   ├── execution.py
│   └── dialects/
│       ├── __init__.py
│       ├── postgresql.py
│       └── sqlite.py
│
├── models/
│   ├── __init__.py
│   ├── base.py
│   ├── mixins/
│   │   ├── __init__.py
│   │   ├── timestamps.py
│   │   └── audit_fields.py
│   ├── global_schema/
│   ├── master/
│   ├── public/
│   └── staging/
│
├── repository/
│   ├── __init__.py
│   ├── base.py
│   ├── organization_repository.py
│   ├── region_repository.py
│   ├── inventory_repository.py
│   ├── user_repository.py
│   ├── permission_repository.py
│   └── ...
│
├── service/
│   ├── __init__.py
│   ├── organization_service.py
│   ├── onboarding_service.py
│   ├── authentication_service.py
│   ├── authorization_service.py
│   ├── billing_service.py
│   ├── audit_service.py
│   └── ...
│
├── helpers/
│   ├── __init__.py
│   ├── datetime_helper.py
│   ├── identifier_helper.py
│   ├── pagination_helper.py
│   ├── serialization_helper.py
│   └── ...
│
├── validation/
│   ├── __init__.py
│   ├── common.py
│   ├── organization_validation.py
│   ├── authorization_validation.py
│   ├── billing_validation.py
│   └── ...
│
├── schemas/
│   ├── __init__.py
│   ├── common.py
│   ├── organization_schema.py
│   ├── authentication_schema.py
│   ├── authorization_schema.py
│   ├── billing_schema.py
│   └── ...
│
├── api/
│   ├── __init__.py
│   ├── dependencies.py
│   └── v1/
│       ├── __init__.py
│       ├── router.py
│       └── endpoints/
│
├── core/
│   ├── __init__.py
│   ├── config.py
│   ├── security.py
│   ├── logging.py
│   ├── exceptions.py
│   └── lifespan.py
│
├── middleware/
│   ├── __init__.py
│   ├── request_context.py
│   ├── correlation_id.py
│   └── ...
│
├── integrations/
│   └── ...
│
└── workers/
    └── ...
```

Add modules only when there is a clear architectural need. Avoid creating empty files or meaningless abstractions just to match this tree.

Keep API routing and HTTP concerns separate from business logic. FastAPI endpoints must not become an alternative location for database calls, validation rules, or business workflows.

## 5. Non-Negotiable Layer Boundaries

### 5.1 `constants/`

Purpose: centralized application constants.

Allowed:

- Permission codes.
- Application-wide statuses.
- Event identifiers.
- Stable error codes.
- Non-secret default values.
- Shared enumerations where appropriate.

Forbidden:

- Database access.
- Business workflows.
- Pydantic model definitions.
- Environment-specific secrets.
- Duplicate definitions scattered throughout the application.

Load environment-dependent configuration through `core/config.py`, not hardcoded constants.

### 5.2 `dal/` — The Only Layer Allowed to Execute Database Operations

This is a strict architectural boundary.

All actual database interactions must happen exclusively inside `src/dal/`.

Allowed:

- Establishing and closing database connections.
- Managing sessions and transactions.
- Executing SQL statements.
- Executing SQLAlchemy Core statements.
- Executing raw parameterized SQL.
- Committing, rolling back, and managing savepoints.
- Database-specific execution behavior.
- Database connection health checks.
- Database dialect and schema-translation behavior.

Forbidden everywhere outside `dal/`:

- Direct database connections.
- Creating or managing database sessions.
- Calling `execute`, `exec`, `commit`, `rollback`, or equivalent database execution methods.
- Executing raw SQL.
- Using database drivers directly.
- Running ORM queries that reach the database.
- Accessing a database through a globally imported session.
- Hidden database access inside helpers, middleware, endpoints, or services.

The only permitted location for actual database execution is `dal/`.

**Important:** SQLAlchemy ORM model definitions belong in `models/`, not in `dal/`. Defining a table mapping is not the same thing as executing a database operation.

Use SQLAlchemy as the persistence technology if compatible with the existing project and the inspected SQL structure. Do not mix incompatible ORM approaches without a documented technical justification.

### 5.3 `repository/` — Persistence Abstractions and Query Definitions

Repositories represent the persistence needs of business entities and aggregates.

Allowed:

- Repository interfaces and implementations.
- Entity-specific query construction.
- CRUD operation orchestration through DAL.
- Filtering, sorting, and pagination specifications.
- Mapping persistence results into application-level results where needed.
- Composing multiple DAL operations into a repository operation.
- Calling shared helpers for non-business utilities.

Forbidden:

- Direct database connections.
- Direct session creation or transaction management.
- Direct calls to database execution methods.
- Raw SQL execution outside DAL.
- Defining duplicate ORM tables or mapped classes.
- Business workflows and cross-module business decisions.
- HTTP request handling.
- Pydantic request/response model definitions.
- Duplicating validation rules.

A repository must call DAL for actual database execution. If a query requires a SQLAlchemy statement, construct or prepare it at the repository level only if DAL remains the exclusive execution boundary. Pass it to DAL for execution.

Do not bypass DAL merely because an ORM provides a convenient query method.

### 5.4 `service/` — Business Logic and Workflows

This layer owns all functional behavior and business decisions.

Allowed:

- Business rules and workflow orchestration.
- Organization onboarding.
- Organization, region, and inventory association rules.
- Authentication and authorization workflows.
- Billing calculations and financial workflow coordination.
- GST-related business rules.
- Audit event coordination.
- Multi-step transactions orchestrated through repositories and DAL transaction interfaces.
- Calling repositories and shared helpers.
- Applying validation rules from `validation/`.

Forbidden:

- Direct database execution.
- Direct session creation.
- Raw SQL.
- ORM query execution.
- Pydantic schema definitions.
- Duplicating validation logic inside service methods.
- HTTP-specific response construction.

Services must not depend on FastAPI's `Request`, `Response`, or HTTP exception types unless a specifically documented boundary adapter requires them. Keep business logic usable by workers, scheduled jobs, command-line tasks, and automated tests without HTTP.

### 5.5 `helpers/` — Reusable, Side-Effect-Controlled Utilities

All genuinely shared, cross-cutting utility functions belong here.

Examples:

- Date/time conversion.
- Time-zone handling.
- Identifier formatting.
- Pagination calculations.
- Serialization utilities.
- File naming.
- Deterministic formatting functions.
- Shared non-business transformations.

Forbidden:

- Database connections or database execution.
- ORM definitions.
- Business workflows.
- Pydantic schema definitions.
- Duplicating validation logic.
- Hidden network calls or other unexpected side effects.

Do not put every function into helpers. Domain-specific business behavior belongs in services, validation belongs in `validation/`, and HTTP-specific dependencies belong in the API/core layers.

### 5.6 `validation/` — The Single Source of Application Validation Rules

All application-level validation rules must be defined in `validation/`.

This includes:

- Required business fields.
- Cross-field validation.
- Organization and inventory association rules.
- Permission and scope validation.
- Date and range rules.
- Financial and GST validation.
- Identifier and uniqueness checks where business validation requires them.
- Workflow precondition validation.
- Domain-specific input rules.

Rules that require existing database state must use services/repositories, which must ultimately use DAL for database execution. Do not create a second database access mechanism inside validation.

Schemas may declare field types and structural constraints needed to parse and safely type input, but substantive business validation must be implemented in `validation/`.

Do not duplicate the same rule in endpoints, services, models, and repositories.

Keep authorization checks separate from input validation conceptually, even if both use the validation package for some policy checks. A valid input does not imply that a user is authorized to perform the operation.

### 5.7 `models/` — One Canonical Set of ORM Table Mappings

Generate all table models from the completed SQL files under `@sql/`.

The SQL files are the source of truth for:

- Table names.
- Column names.
- Data types.
- Nullability.
- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Indexes.
- Default expressions.
- Relationships implied by database constraints.
- Logical schema assignments.

Use SQLAlchemy declarative mappings or an equally justified SQLAlchemy mapping approach.

Requirements:

1. One canonical ORM mapping per database table.
2. No duplicate table definitions in repositories.
3. Preserve the SQL schema faithfully.
4. Use explicit constraint and index names where available.
5. Preserve decimal precision for financial fields.
6. Preserve appropriate timezone semantics.
7. Model relationships without introducing unintended eager-loading behavior.
8. Avoid hidden database access from property methods or model hooks.
9. Avoid placing business workflows or Pydantic API schemas in ORM models.
10. Do not silently change SQL types, constraints, or defaults for convenience.

Organize models by the actual logical schema and table purpose:

- `global_schema/` for globally scoped entities and security structures.
- `master/` for reusable master/reference data.
- `public/` for operational tables as assigned by the completed SQL.
- `staging/` for import and staging tables.

If the SQL files contain a different or additional schema, preserve the actual SQL design and document any discrepancy. Do not invent schema names or silently move tables.

### 5.8 `schemas/` — The Only Location for Pydantic Definitions

All Pydantic request, response, and data-transfer model definitions must live under `schemas/`.

Examples:

- Create/update request schemas.
- Response schemas.
- Authentication and token schemas.
- Pagination schemas.
- Organization and inventory schemas.
- Billing and GST schemas.
- Error response schemas.
- Internal typed DTOs when Pydantic is appropriate.

Forbidden:

- Pydantic definitions in endpoints.
- Pydantic definitions in services.
- Pydantic definitions in validation.
- Pydantic definitions in repositories.
- Pydantic definitions in ORM models.
- Duplicate request/response definitions across modules.

Use Pydantic v2 unless the existing dependency environment establishes a documented compatibility reason not to.

Use explicit request and response models. Do not expose ORM objects, internal security fields, passwords, secrets, internal authorization data, or unrestricted database records directly to clients.

Keep API serialization separate from persistence representation.

### 5.9 API Endpoints, Middleware, and Core

API endpoints must be thin HTTP adapters.

An endpoint may:

1. Receive an HTTP request.
2. Use the relevant Pydantic schema.
3. Obtain the authenticated principal and request-scoped context.
4. Invoke the appropriate service.
5. Translate the service result into the declared response schema.
6. Return the appropriate HTTP status.

An endpoint must not implement business rules or execute database operations.

`api/dependencies.py` may provide dependency injection for authentication, request context, and service construction. Database session creation and management must still be delegated to DAL.

`core/` owns application configuration, security primitives, exception translation, logging setup, and lifecycle management. It must not become a hidden database access layer.

## 6. Architecture Enforcement

The intended dependency direction is:

```text
HTTP/API
   |
   v
Service
   |
   +-----------> Validation
   |
   +-----------> Helpers
   |
   v
Repository
   |
   +-----------> Helpers
   |
   v
DAL <---------- Repository-built statements
   |
   v
Database driver
```

Supporting rules:

- `models/` defines persistence mappings and is imported where mappings are needed.
- `schemas/` defines Pydantic data contracts and is imported by API/service boundaries as appropriate.
- `constants/` contains shared constant definitions.
- No layer may bypass DAL to access the database.
- `validation/` must not import endpoint modules.
- `helpers/` must not import service modules.
- `models/` must not import services or API modules.
- `schemas/` must not import repositories or open database connections.
- `repository/` must not call service methods.
- `service/` must not depend on FastAPI HTTP objects.
- Avoid circular imports and global mutable session state.

If any required workflow appears to violate these rules, refactor the boundary rather than adding an exception without justification.

## 7. SQL Files Are the Database Source of Truth

Inspect every relevant SQL file under `@sql/`, including any schema creation, constraints, indexes, extensions, seed scripts, and migration scripts.

Before implementing models, create a table inventory at:

`docs/backend_migration/03_database_model_inventory.md`

For every table, document:

- Logical schema.
- Physical table name.
- Columns and types.
- Primary and foreign keys.
- Unique and check constraints.
- Indexes.
- ORM model path.
- Repository path.
- SQLite compatibility notes.
- Any unresolved discrepancies.

Do not guess table structures from JavaScript models when a completed SQL definition exists.

Do not regenerate or replace the completed SQL files without explicit justification. Treat them as existing database artifacts.

If a table is referenced by the application but absent from the SQL files, report it explicitly and propose a resolution rather than inventing a silent replacement.

## 8. PostgreSQL and SQLite Compatibility

PostgreSQL is the primary production database. SQLite support must be designed intentionally and tested; it must not be claimed merely because SQLAlchemy can connect to SQLite.

PostgreSQL supports named schemas, while SQLite does not provide equivalent PostgreSQL-style schemas. SQLite's attached-database behavior is not an interchangeable implementation of PostgreSQL schemas.

Design a clear schema portability strategy.

Requirements:

1. Use one canonical logical table model per table.
2. Preserve PostgreSQL schema assignments.
3. Investigate SQLAlchemy schema translation or an equivalent explicit mapping strategy for SQLite.
4. Keep logical schema names distinct from physical SQLite table placement.
5. Make the translation configurable and centralized.
6. Do not scatter dialect-specific schema conditionals throughout model definitions.
7. Do not silently remove schema prefixes from PostgreSQL SQL.
8. Handle schema-qualified foreign keys and constraints correctly.
9. Identify incompatible SQL features such as PostgreSQL-only types, extensions, functions, generated columns, or defaults.
10. Provide dialect-specific behavior only inside the appropriate DAL adapter or migration tooling.
11. Maintain equivalent logical integrity rules wherever SQLite can support them.
12. Document every behavior that cannot be identical across the two databases.

Test schema translation, foreign keys, indexes, transactions, decimal handling, date/time behavior, and query execution independently for both engines.

Do not promise full cross-database compatibility until the actual SQL and generated models have been tested against both engines.

## 9. Organization, Region, and Inventory Hierarchy

Preserve the onboarding relationship:

`Organization → Multiple Regions → Inventory Associations`

Business rules:

- An organization can have multiple regions.
- A region belongs to the appropriate organization scope.
- A region may have access to multiple inventories.
- An inventory may be associated with multiple regions when permitted.
- An inventory may be region-specific or reusable across multiple regions.
- Association rules must prevent invalid cross-organization links.
- Access must be explicitly authorized rather than inferred from an inventory identifier supplied by the client.

Use the existing SQL structure where these tables and constraints already exist. Do not duplicate them.

Where the SQL does not fully enforce the required behavior, document the gap and propose the minimum justified schema or constraint change.

Enforce these rules in service/validation logic and, where possible, through database constraints.

Test:

- Organization onboarding.
- Region creation.
- Inventory creation.
- Region-inventory association.
- Multiple regions sharing an inventory where allowed.
- Cross-organization association rejection.
- Unauthorized inventory access.
- Concurrent association changes.

## 10. Authentication, Authorization, and Tenant Isolation

Implement or migrate the existing authentication and authorization behavior after inspecting the actual application.

Support the intended generic authorization architecture, using the existing SQL structures where available:

- Users and authentication identities.
- Roles.
- Permissions.
- Role-permission mappings.
- User-role assignments.
- Optional user-specific permission overrides.
- Organization scope.
- Region scope.
- Inventory scope.
- Active/inactive status and validity windows where required.
- Authorization audit events.

Do not invent table names or duplicate existing authorization tables.

The final authorization system must support:

- Least-privilege access.
- Deny-by-default behavior for protected operations.
- Explicit permission checks.
- Scope-aware authorization.
- Separation of authentication from authorization.
- Protection against cross-organization data access.
- Consistent authorization behavior across API routes, services, and background jobs.
- Auditing of sensitive permission changes.
- Revocation of access without relying solely on long-lived tokens.

Do not authorize a user merely because they know an entity ID.

Do not trust organization, region, inventory, role, or user identifiers submitted by the client without checking them against the authenticated principal and applicable permission scope.

Use secure password hashing and established token/session practices. Never store plaintext passwords or log credentials, tokens, or sensitive authentication material.

Avoid implementing custom cryptography. Use well-maintained security libraries and validate their current compatibility with the project.

## 11. GST, Billing, and Auditability

Preserve and migrate the current billing behavior. Where GST-related tables and rules already exist in `@sql/`, use them as defined.

Do not silently replace existing financial behavior.

For financial operations:

- Use appropriate decimal/numeric precision.
- Never use binary floating-point arithmetic for monetary calculations.
- Preserve historical invoice values.
- Keep tax calculations deterministic and testable.
- Separate tax calculation rules from HTTP and persistence code.
- Preserve invoice identifiers and relevant tax snapshots.
- Record appropriate changes and audit events.
- Keep transaction boundaries explicit.
- Prevent duplicate invoice posting where idempotency is required.
- Ensure that corrections, cancellations, credit notes, or adjustments follow the existing documented business rules.

Do not invent tax rates, GST rules, legal requirements, or compliance behavior. Inspect the current requirements and identify any missing jurisdiction-specific requirements for review.

Do not allow audit records to be silently rewritten or deleted through ordinary application workflows. Protect audit access and avoid recording passwords, tokens, or unnecessary sensitive data.

## 12. Database Transactions and Concurrency

Transaction creation, commit, rollback, and database session lifecycle belong exclusively in DAL.

Services may coordinate multi-step workflows using a transaction interface exposed through DAL. Repositories must participate in the active transaction instead of independently committing unrelated operations.

Implement and test:

- Atomic multi-step workflows.
- Correct rollback on failure.
- Appropriate isolation levels.
- Concurrent updates.
- Unique constraint conflicts.
- Optimistic locking or other concurrency controls where justified.
- Idempotency for retryable financial or onboarding operations.
- Safe handling of transaction failures.
- Connection pool sizing and lifecycle.

Avoid committing inside individual repository methods when a higher-level workflow requires one atomic transaction.

## 13. Migration Strategy

Do not replace the entire existing backend in one unverified operation.

Use controlled migration phases.

### Phase 1 — Discovery and baseline

- Complete repository inspection.
- Inventory all endpoints and existing behavior.
- Identify the current database contract.
- Identify current authentication, authorization, and transaction behavior.
- Run available tests and record baseline failures.
- Document existing integrations and deployment requirements.

### Phase 2 — Python foundation

- Add or configure the Python project.
- Establish supported Python and dependency versions.
- Add FastAPI application factory and lifespan handling.
- Add typed configuration and environment validation.
- Establish structured logging, correlation IDs, exception handling, and health checks.
- Implement the DAL connection and transaction boundaries.
- Add CI checks and architecture boundary tests.

### Phase 3 — Database models and DAL

- Generate canonical ORM models from the SQL files.
- Verify all tables, columns, keys, constraints, and indexes.
- Implement PostgreSQL support.
- Implement and test the SQLite compatibility strategy.
- Verify transactions and database error translation.
- Do not run destructive production migrations.

### Phase 4 — Repositories and validation

- Implement repository abstractions.
- Centralize database execution in DAL.
- Centralize business validation rules.
- Create Pydantic schemas.
- Add architecture tests to detect prohibited database access and duplicate model definitions.

### Phase 5 — Services and security

- Implement business workflows.
- Migrate authentication and authorization.
- Implement organization, region, and inventory workflows.
- Migrate billing, audit logging, and other business modules.
- Preserve existing behavior and documented API contracts.

### Phase 6 — API migration

- Add FastAPI routes.
- Preserve required endpoint paths, HTTP methods, status codes, and payload semantics.
- Document intentional breaking changes.
- Add OpenAPI documentation.
- Verify the existing frontend against the new API.
- Avoid introducing frontend changes unless necessary and explicitly documented.

### Phase 7 — Verification and cutover

- Run unit, integration, contract, security, and regression tests.
- Test PostgreSQL and supported SQLite behavior.
- Verify migrations and rollback procedures in a non-production environment.
- Document deployment, monitoring, backup, recovery, and cutover procedures.
- Do not switch production traffic until the defined acceptance criteria are met.

Maintain the existing backend until the replacement has been verified and the migration plan authorizes cutover.

## 14. API Contract Preservation

Inspect the current frontend and backend together.

For every endpoint, record:

- HTTP method.
- URL.
- Authentication requirements.
- Permission requirements.
- Request format.
- Response format.
- Status codes.
- Error behavior.
- Pagination and filtering semantics.
- Side effects.
- Transaction requirements.

Preserve compatibility by default.

If a behavior must change, document the reason, impact, migration requirement, and any frontend changes.

Do not return fake success responses or placeholder data to simulate completed functionality.

## 15. Production Quality Requirements

### Code quality

- Full type annotations for public interfaces.
- Clear module responsibilities.
- Consistent naming and import structure.
- No circular imports.
- No unexplained global mutable state.
- No broad exception swallowing.
- No silent failure paths.
- No unnecessary abstraction layers.
- No unimplemented production endpoints.
- No business logic duplicated across modules.
- No hidden database access.

### Security

- Secure configuration and secret handling.
- Authentication and authorization tests.
- Tenant-isolation tests.
- Input validation.
- SQL injection prevention through safe query construction and bound parameters.
- Rate limiting for sensitive endpoints where appropriate.
- Safe error responses.
- Restricted access to documentation and administrative routes where required.
- CORS configured for explicit trusted origins.
- No secrets in source control, logs, test output, or API responses.

### Observability

- Structured logs.
- Request correlation IDs.
- Health and readiness endpoints.
- Useful operational metrics where supported.
- Database connectivity and pool monitoring.
- Traceable failures without leaking sensitive information.
- Audit events for security-sensitive and financially significant actions.

### Reliability

- Explicit connection and transaction lifecycle.
- Graceful application shutdown.
- Controlled retries only where safe.
- Idempotency for operations requiring it.
- Background jobs with observable failures.
- Timeouts for external integrations.
- Documented backup and recovery expectations.

## 16. Required Test Suite

Create automated tests covering at least:

1. Model/table mapping completeness.
2. PostgreSQL schema correctness.
3. SQLite schema translation and compatibility.
4. DAL-only database execution enforcement.
5. Repository query behavior.
6. Service business rules.
7. Validation rule coverage.
8. Pydantic request and response contracts.
9. Authentication and token handling.
10. Role and permission evaluation.
11. Organization, region, and inventory isolation.
12. Unauthorized access and privilege escalation attempts.
13. Billing calculations and decimal precision.
14. GST-related behavior supported by the actual requirements.
15. Transaction rollback and concurrent operations.
16. Audit event creation and access restrictions.
17. API contract compatibility.
18. Error handling and logging safety.
19. Integration failures and recovery behavior.
20. Migration and deployment smoke tests.

Use isolated test databases, deterministic fixtures, and cleanup procedures. Do not point automated tests at production databases.

Do not use SQLite as the only test database for functionality intended to run on PostgreSQL.

## 17. Architecture Boundary Enforcement

Create automated checks that fail CI when prohibited patterns are introduced.

At minimum, enforce:

- Database drivers and database execution APIs may only be used in `dal/`.
- No database sessions or connections may be created outside `dal/`.
- No raw SQL execution outside `dal/`.
- No SQLAlchemy ORM mapped table definitions outside `models/`.
- No Pydantic model definitions outside `schemas/`.
- No application validation rules outside `validation/`.
- No database execution inside `helpers/`, `validation/`, `service/`, or API endpoints.
- No business workflows inside API endpoints or repositories.
- No imports that violate the documented dependency direction.

Use AST-based checks, lint rules, import-boundary tooling, or other reliable automated methods. Text search alone is not sufficient where AST analysis is feasible.

If an unavoidable exception exists, document it narrowly and add a test for the intended boundary.

## 18. Documentation Deliverables

Maintain the following documentation:

```text
docs/backend_migration/
├── 01_current_state_assessment.md
├── 02_migration_mapping.md
├── 03_database_model_inventory.md
├── 04_target_architecture.md
├── 05_api_contract_mapping.md
├── 06_authentication_authorization.md
├── 07_postgresql_sqlite_compatibility.md
├── 08_testing_and_quality_gates.md
├── 09_deployment_and_cutover.md
├── 10_migration_status.md
└── 11_known_gaps_and_decisions.md
```

Also create or update:

- `README.md`
- Python dependency manifest and lock file if supported by the project.
- `.env.example` containing placeholders only.
- Database migration configuration.
- Development and production run instructions.
- Test execution instructions.
- CI workflow.
- Deployment configuration appropriate to the actual hosting environment.

Do not fabricate completed test results, database coverage, or deployment validation in documentation.

## 19. Implementation Rules

1. Inspect before modifying.
2. Preserve the existing working application until the replacement is verified.
3. Work module by module.
4. Follow the actual SQL files.
5. Do not invent business rules.
6. Do not create duplicate ORM mappings.
7. Do not bypass DAL.
8. Do not place validation rules outside `validation/`.
9. Do not place Pydantic definitions outside `schemas/`.
10. Do not leave placeholder implementations on production paths.
11. Do not remove existing endpoints without a documented replacement.
12. Do not modify completed SQL files merely to make code generation easier.
13. Do not run destructive migrations or production database operations.
14. Do not introduce unverified dependencies without explaining why they are needed.
15. Do not mark a phase complete while required tests fail.
16. When an architectural ambiguity exists, document the decision and select the smallest maintainable design that satisfies the stated constraints.
17. If a tool or environment limitation prevents implementation, report it clearly and continue with independent tasks where safe.

## 20. Required Working Method

Use the following loop for each migration phase:

1. Inspect the relevant existing implementation.
2. Record current behavior and dependencies.
3. Design the target Python implementation.
4. Implement the smallest complete vertical slice.
5. Run formatting, linting, type checks, and relevant tests.
6. Compare behavior with the existing implementation.
7. Fix regressions.
8. Update migration documentation.
9. Report files created or modified, verification performed, failures, and unresolved issues.
10. Proceed to the next phase only when the current phase's acceptance criteria are satisfied.

Do not generate the entire application in one massive unverified batch.

## 21. Definition of Done

The migration is complete only when:

- All identified in-scope backend modules have been migrated or explicitly accounted for.
- All existing required endpoints have a verified replacement.
- ORM mappings match the completed SQL structure.
- DAL is the only layer executing database operations.
- Repository, service, helper, validation, model, and schema responsibilities are enforced.
- PostgreSQL functionality has been integration-tested.
- SQLite compatibility has been tested for the features claimed to be supported.
- Authentication, authorization, and tenant isolation have automated tests.
- Critical business and billing workflows have regression tests.
- Architecture boundary checks run automatically.
- Deployment, migration, rollback, and operational instructions are documented.
- Remaining gaps and risks are explicitly listed.
- No critical test failures are hidden or falsely marked as successful.

## 22. First Action

Begin with repository inspection and the current-state assessment.

Then inspect every SQL file under `@sql/` and create the database model inventory.

Next, propose the implementation sequence based on the actual codebase, dependency graph, existing functionality, and test coverage.

Once the assessment and implementation plan are complete, start implementing the Python foundation and proceed through the phases above.

**Do not stop after generating documentation or a proposed folder structure. Continue implementing and verifying the migration in controlled, testable increments.**

At each milestone, provide a concise report covering:

- What was implemented.
- Files created or modified.
- Tests and checks executed.
- Actual test results.
- Known limitations.
- Remaining work.
- Whether the milestone meets its acceptance criteria.

The objective is a maintainable, auditable, secure, production-ready FastAPI backend—not merely a codebase that starts successfully.
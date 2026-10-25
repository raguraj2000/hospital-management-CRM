# 02. Migration Mapping: Source to Target

## 1. Architectural Mapping Overview

This document defines the exact file-by-file, module-by-module mapping from the TypeScript Express backend (`apps/api`, `packages/core`, `packages/shared`) to the target Python FastAPI backend (`src/`).

```text
TypeScript Monorepo (apps/api + packages/core + packages/shared)
                            │
                            ▼
           Strict Layered Python FastAPI Architecture
┌────────────────────────────────────────────────────────┐
│  src/api/              Thin HTTP Router & Adapters     │
│  src/service/          Business Logic & Workflows      │
│  src/validation/       Single-Source Validation Rules  │
│  src/repository/       Query Builders (NO execution)   │
│  src/dal/              EXCLUSIVE Database Execution    │
│  src/models/           Canonical SQLAlchemy Mappings   │
│  src/schemas/          Pydantic v2 DTOs                │
│  src/helpers/          Deterministic Pure Utilities    │
│  src/constants/        Error codes, perms, statuses    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Infrastructure & Middleware Mapping

| Existing TypeScript Source | Target Python Location | Responsibilities |
| :--- | :--- | :--- |
| `packages/core/src/errors.ts` | `src/constants/errors.py`<br>`src/core/exceptions.py` | Error codes, `AppException`, custom HTTP exception handlers |
| `packages/core/src/security.ts` | `src/core/security.py` | Cryptographic utilities, secure random tokens, token hashing |
| `packages/core/src/password.ts` | `src/core/security.py` | PBKDF2 password hashing & verification |
| `packages/core/src/auth.ts` | `src/api/dependencies.py`<br>`src/service/authentication_service.py` | Cookie extraction, session validation, current user injection |
| `packages/core/src/branch.ts` | `src/api/dependencies.py`<br>`src/service/authorization_service.py` | Branch slug resolution, permission enforcement, branch tenancy |
| `packages/core/src/audit.ts` | `src/service/audit_service.py`<br>`src/repository/audit_repository.py` | Audit log creation, sequential sequence number generation |
| `packages/core/src/db/index.ts` | `src/dal/connection.py`<br>`src/dal/transaction.py`<br>`src/dal/execution.py` | Connection pooling, session lifecycle, transaction management |
| `packages/shared/src/index.ts` | `src/constants/permissions.py`<br>`src/constants/statuses.py`<br>`src/schemas/*`<br>`src/validation/*` | Permission codes, roles, Pydantic schemas, validation rules |
| `apps/api/src/config.ts` | `src/core/config.py` | Pydantic Settings, environment variables, defaults |
| `apps/api/src/app.ts` | `src/app_factory.py`<br>`src/core/lifespan.py` | FastAPI app creation, middleware registration, CORS, routers |
| `apps/api/src/index.ts` | `src/main.py` | Uvicorn server entry point |

---

## 3. Business Routes & Services Mapping

| TypeScript Route (`apps/api/src/routes/`) | Target API Endpoint (`src/api/v1/endpoints/`) | Target Service (`src/service/`) | Target Repository (`src/repository/`) | Target Pydantic Schema (`src/schemas/`) |
| :--- | :--- | :--- | :--- | :--- |
| `platform.ts` (Auth routes) | `api/v1/endpoints/auth.py` | `authentication_service.py` | `user_repository.py` | `authentication_schema.py` |
| `platform.ts` (Platform admin) | `api/v1/endpoints/platform.py` | `organization_service.py`<br>`onboarding_service.py` | `organization_repository.py`<br>`region_repository.py` | `organization_schema.py` |
| `patients.ts` | `api/v1/endpoints/patients.py` | `patient_service.py` | `patient_repository.py` | `patient_schema.py` |
| `visits.ts` | `api/v1/endpoints/visits.py` | `visit_service.py` | `visit_repository.py` | `visit_schema.py` |
| `doctors.ts` | `api/v1/endpoints/doctors.py` | `doctor_service.py` | `doctor_repository.py` | `doctor_schema.py` |
| `treatments.ts` | `api/v1/endpoints/treatments.py` | `treatment_service.py` | `treatment_repository.py` | `treatment_schema.py` |
| `bookmarks.ts` | `api/v1/endpoints/bookmarks.py` | `bookmark_service.py` | `bookmark_repository.py` | `bookmark_schema.py` |
| `courses.ts` | `api/v1/endpoints/courses.py` | `course_service.py` | `course_repository.py` | `course_schema.py` |
| `lab.ts` | `api/v1/endpoints/lab.py` | `lab_service.py` | `lab_repository.py` | `lab_schema.py` |
| `pharmacy.ts` | `api/v1/endpoints/pharmacy.py` | `pharmacy_service.py` | `pharmacy_repository.py`<br>`inventory_repository.py` | `pharmacy_schema.py` |
| `billing.ts` | `api/v1/endpoints/billing.py` | `billing_service.py` | `billing_repository.py` | `billing_schema.py` |
| `checkout.ts` | `api/v1/endpoints/checkout.py` | `checkout_service.py` | `billing_repository.py`<br>`pharmacy_repository.py` | `checkout_schema.py` |
| `vendors.ts` | `api/v1/endpoints/vendors.py` | `vendor_service.py` | `vendor_repository.py` | `vendor_schema.py` |
| `backup.ts` | `api/v1/endpoints/backup.py` | `backup_service.py` | `backup_repository.py` | `backup_schema.py` |

---

## 4. Background Workers & Integrations Mapping

| TypeScript Lib (`apps/api/src/lib/`) | Target Python Worker / Task (`src/workers/`) | Description |
| :--- | :--- | :--- |
| `daily-backup.ts` | `src/workers/daily_backup_worker.py` | Scheduled daily export of database snapshots |
| `audit-retention.ts` | `src/workers/audit_retention_worker.py` | Archival of audit trail records beyond retention windows |
| `plan-billing.ts` | `src/workers/subscription_worker.py` | Subscription billing checks and expiration handling |
| `purchase-import.ts` | `src/service/purchase_import_service.py` | Async processing of staged vendor invoice spreadsheets |

---

## 5. Architectural Invariant Rules

1. **API Endpoints never execute queries**: Endpoints parse parameters into Pydantic models, call a service, and return a Pydantic response model.
2. **Services never execute queries**: Services validate business invariants via `validation/`, build workflows, coordinate transactions through `dal.transaction`, and query entities via `repository/`.
3. **Repositories never execute queries**: Repositories build SQLAlchemy statements (e.g. `select(Patient).where(...)`) and pass them to `dal.execution.execute_query()`.
4. **DAL is the only query executor**: All calls to `session.execute()`, `session.commit()`, `session.rollback()` are quarantined in `src/dal/execution.py` and `src/dal/transaction.py`.


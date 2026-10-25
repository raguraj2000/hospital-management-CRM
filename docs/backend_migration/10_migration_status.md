# 10. Migration Status & Milestone Tracking

## 1. Migration Phase Matrix

| Phase | Description | Status | Verification Gate |
| :--- | :--- | :---: | :--- |
| **Phase 1** | Discovery & Current State Assessment | **COMPLETE** | Current assessment, mapping, and model inventory documented |
| **Phase 2** | Python Foundation & Core Setup | **IN PROGRESS** | `pyproject.toml`, `src/core/*`, `src/constants/*`, `src/helpers/*` |
| **Phase 3** | Database Models & DAL Engine | **IN PROGRESS** | 68 SQLAlchemy models, strict DAL execution boundary, dialects |
| **Phase 4** | Repositories & Business Validation | **PLANNED** | Base & entity repositories, isolated validation rules |
| **Phase 5** | Services & Authorization Workflows | **PLANNED** | Business workflows, explicit deny/grant authorization engine |
| **Phase 6** | API Endpoints & Contract Adapters | **PLANNED** | FastAPI routers matching existing frontend contract |
| **Phase 7** | Verification, AST Checks & Cutover | **PLANNED** | Automated AST tests, boundary checks, end-to-end simulation |

---

## 2. Module Implementation Tracker

| Module | SQL Table DDL | SQLAlchemy Model | Repository | Service | API Router | Tests |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Identity & Auth | Done | Done | In Progress | In Progress | In Progress | In Progress |
| Multi-Tenant Org / Region / Inv | Done | Done | In Progress | In Progress | In Progress | In Progress |
| Patient Registration & UHID | Done | Done | In Progress | In Progress | In Progress | In Progress |
| OPD Visits & Clinical Notes | Done | Done | In Progress | In Progress | In Progress | In Progress |
| Pharmacy & FEFO Batches | Done | Done | In Progress | In Progress | In Progress | In Progress |
| GST Invoicing & Payments | Done | Done | In Progress | In Progress | In Progress | In Progress |
| Diagnostic Lab & Pathology | Done | Done | In Progress | In Progress | In Progress | In Progress |
| Treatment Courses & Sittings | Done | Done | In Progress | In Progress | In Progress | In Progress |
| Vendors & Purchase Invoices | Done | Done | In Progress | In Progress | In Progress | In Progress |
| Audit Trail & Logging | Done | Done | In Progress | In Progress | In Progress | In Progress |


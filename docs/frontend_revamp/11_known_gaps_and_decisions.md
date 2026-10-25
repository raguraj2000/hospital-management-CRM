# 11 — Known Gaps, Key Decisions, and Architecture Trade-offs

> Registry of architectural decisions, resolved discrepancies, and current engineering boundaries.

---

## 1. Key Architectural Decisions

### Decision 1: Target Hono/TypeScript API Rather Than FastAPI
- **Context:** The prompt references "FastAPI backend migration".
- **Inspection Finding:** The repository contains an active, production-ready Hono v4 + Drizzle + LibSQL backend in `apps/api/` with 34 comprehensive test suites, full branch isolation, and cookie auth. The `src/` Python directory is an unmounted historical/parallel prototype.
- **Decision:** Align the frontend architecture strictly with `apps/api` (Hono + TypeScript), preserving all established data contracts, permissions, and database models.

### Decision 2: Controlled Navigation Registry vs. Blind JSON Execution
- **Context:** The specification requests dynamic navigation driven by the backend.
- **Decision:** Rather than allowing arbitrary, unverified JSON strings to dictate UI execution, the frontend maintains a controlled, typed registry of supported routes and components. The backend dictates module availability (`modulesOff`) and user capabilities (`permissions`). A dynamic filter (`useNavItems`) processes these inputs to dynamically render only authorized navigation elements.

### Decision 3: Centralized Standalone Reports Module
- **Context:** Reporting functionality was historically split across `BillingPrints.tsx`, `LabPeriodReport.tsx`, and `Inventory.tsx`.
- **Decision:** Implement a centralized `modules/reports` architecture. A unified `ReportViewer` consumes structured metadata definitions to render filters, tables, summaries, and print sheets, eliminating duplicated code and ensuring uniform auditability and permission gating.

---

## 2. Known Gaps & Action Items

| Item | Description | Mitigation / Planned Action |
|---|---|---|
| GAP-01 | Web workspace lacks standalone unit test harness (Vitest only configured in root/api) | Add Vite/Vitest configuration to `apps/web` for testing dynamic UI engine and hooks. |
| GAP-02 | Reports catalog backend endpoint (`GET /b/:branch/reports/catalog`) is not yet formalized | Provide a comprehensive in-memory / schema-backed report catalog in Phase 5 that unifies existing reporting data queries. |
| GAP-03 | Hardcoded sub-tab navigation in complex clinical views (e.g. Patient tabs) | Refactor into modular tab components within `modules/patients`. |


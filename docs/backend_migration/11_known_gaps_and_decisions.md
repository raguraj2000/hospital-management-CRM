# 11. Known Gaps, Trade-Offs & Architectural Decisions (ADRs)

## ADR-01: Exclusion of Direct Database Execution Outside DAL
- **Context**: The existing TypeScript codebase allowed queries directly inside route handlers (`apps/api/src/routes/*.ts`) via `db.select().from(...)`.
- **Decision**: In the Python backend, calling `.execute()`, `.commit()`, or accessing engine/session connections outside `src/dal/` is strictly prohibited.
- **Consequences**: Repositories build statements; services coordinate workflows; DAL handles execution. Enforced statically via AST tests.

---

## ADR-02: Renaming to `company_id`, `inventory_id`, `inventory_name`
- **Context**: Historical schema used `organization_id`, `inventory_location_id`, and `inventory_location_name`.
- **Decision**: All models, schemas, and queries standardize on `company_id`, `inventory_id`, and `inventory_name`.
- **Consequences**: Matches modern enterprise terminology; foreign keys and junction tables are consistent.

---

## ADR-03: Integer Paise Precision for All Financial Figures
- **Context**: Floating-point numbers cause rounding errors in multi-item invoices and tax calculations.
- **Decision**: All financial figures are represented strictly as `BIGINT` in whole paise (₹1 = 100 paise).
- **Consequences**: Rounding occurs once at the tax line level using integer arithmetic (`ROUND(taxable_paise * rate / 100)`). No float drift.

---

## ADR-04: Session Cookie Token SHA-256 Hashing
- **Context**: Storing raw session tokens in database tables creates catastrophic exposure during database backup leaks.
- **Decision**: The browser holds the random 64-char hex string in an `HttpOnly` cookie. The database stores only `SHA-256(sid)`.
- **Consequences**: Database dumps contain zero usable session credentials.

---

## ADR-05: Non-Disruptive Migration with Legacy Backend Retained
- **Context**: Live clinic operations cannot risk downtime during migration.
- **Decision**: The Python backend is created alongside the existing repository under `src/`. The existing Express backend remains fully operational until validation and cutover gates are satisfied.


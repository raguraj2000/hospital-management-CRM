# 01 — Current State Assessment

> Generated: 2026-10-25 | Phase 1 of frontend-design.md execution

---

## 1. Repository Layout

```
hospital-management-CRM/
├── apps/
│   ├── api/          — Hono/TypeScript backend (active, production-ready)
│   └── web/          — React/Vite frontend (active)
├── packages/
│   ├── core/         — Auth, audit, DB schema, branch middleware (shared server-only)
│   ├── shared/       — Zod schemas, types, permissions (browser + server)
│   └── ui/           — Primitive React components (browser)
├── src/              — Legacy Python/FastAPI skeleton (NOT the active backend)
├── e2e/              — Playwright-based smoke / flow tests (4 scripts)
├── docs/backend_migration/  — Prior migration docs (backend already migrated to Hono)
└── package.json      — npm workspaces monorepo
```

> [!IMPORTANT]
> The `src/` Python/FastAPI directory is **not the active backend**. The active API is `apps/api` running **Hono v4 + Drizzle ORM + LibSQL (SQLite)**. The `frontend-design.md` spec refers to "FastAPI migration" but that migration already resolved into the current Hono stack. All integration work must target `apps/api`.

---

## 2. Frontend Stack

| Concern | Current implementation |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 + `@vitejs/plugin-react` |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Routing | React Router v8 (createBrowserRouter) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 (theme only) |
| Forms | React Hook Form v7 + `@hookform/resolvers` |
| Validation | Zod v4 (shared with API via `@platform/shared`) |
| UI primitives | `@platform/ui` (internal package) |
| Icons | Lucide React |
| Toasts | Sonner |
| PDF/Print | jspdf + html2canvas-pro |
| Font | Inter Variable (`@fontsource-variable/inter`) |
| Excel import | read-excel-file |

---

## 3. Backend Stack

| Concern | Implementation |
|---|---|
| Framework | Hono v4 |
| Runtime | Node.js via `tsx` |
| Database | LibSQL (SQLite) via Drizzle ORM |
| Auth | httpOnly cookie (`sid`), SHA-256 token hash |
| Session TTL | 12 hours (one working day) |
| Validation | Zod (shared schemas from `@platform/shared`) |
| Error format | `{ error, code, fields? }` via `AppError` |
| Rate limiting | Custom middleware |
| API mount | `/api/*` — same origin as frontend (Vite proxy in dev) |

---

## 4. Current Frontend Structure

```
apps/web/src/
├── api/
│   └── client.ts         — Single fetch-based API client
├── components/           — 40+ components, all flat (no sub-folders)
│   ├── AppShell.tsx       — Layout, sidebar, nav, branch switcher
│   ├── PatientForm.tsx
│   ├── LabTestForm.tsx
│   ├── Prescription.tsx
│   ├── Checkout.tsx
│   ├── BillCharges.tsx
│   ├── Visits.tsx
│   ├── VisitLab.tsx
│   ├── VisitBill.tsx
│   └── ... (37 more)
├── pages/                — 20+ page components, flat
│   ├── Dashboard.tsx
│   ├── Patients.tsx
│   ├── PatientDetail.tsx
│   ├── OpVisits.tsx
│   ├── VisitDetail.tsx
│   ├── Lab.tsx / LabResults.tsx
│   ├── Pharmacy.tsx
│   ├── Billing.tsx / BillPage.tsx
│   ├── Inventory.tsx
│   ├── Treatments.tsx
│   ├── Settings.tsx
│   └── ... (8 more)
├── state/
│   ├── auth.ts            — useMe, useLogin, useLogout, useBranch, useCan, useModuleOn
│   └── theme.ts           — Zustand theme store
├── main.tsx               — Router, QueryClient, boot sequence
├── nav.ts                 — Hardcoded NAV array (the only navigation config)
└── index.css              — Tailwind entry
```

---

## 5. Authentication & Session Handling

- **Mechanism:** httpOnly `sid` cookie (Set-Cookie from server; credentials: 'include' on every request).
- **Token storage:** SHA-256 hash stored in DB; raw token only in the cookie. Never in localStorage.
- **Session check:** `GET /api/auth/me` → `MeResponse` (user, organization, branches + permissions).
- **Expiry:** 12-hour TTL; 401 triggers `onUnauthenticated` → clears QueryClient data → redirects to `/login`.
- **Login:** `POST /api/auth/login` with `{ mobile, password }`.
- **Logout:** `POST /api/auth/logout` → revokes session, deletes cookie.
- **Failed logins:** Locked for 15 min after 5 wrong attempts.
- **CSRF:** `sameOriginWrites()` middleware blocks cross-origin non-GET requests (checks `Origin` / `Referer`).

---

## 6. Authorization Model

### Permissions
Defined in `packages/shared/src/index.ts` as a TypeScript `const` array (`ALL_PERMISSIONS`):
- **Core:** `users.manage`, `settings.manage`, `audit.view`, `access.anywhere`
- **Clinic:** `dashboard.view`, `patient.view/create/edit/delete`, `prescription.write`, `lab.order/view/correct`, `billing.receive`, `reports.view`, `pharmacy.sell`, `inventory.view/manage`, `vendor.manage`, `treatment.give`, `undo.skip`

### Module availability
`organization.modulesOff` (array from `MeResponse`) — currently only `lab` and `courses` can be switched off by the platform admin.

### Frontend permission check
`useCan(permission)` — reads from the current branch's permissions in `MeResponse.branches`. **UI-only gate; server re-checks every request.**

### Backend enforcement
`requirePermission(permission)` and `requireModule(key)` middleware on every branch route. Branch isolation enforced by `branchContext` middleware that validates the URL `/:branch` slug belongs to the authenticated user's organization.

---

## 7. Navigation (Current State)

Navigation is **fully hardcoded** in [`apps/web/src/nav.ts`](file:///c:/Users/smani/OneDrive/Desktop/git/hospital-management-CRM/apps/web/src/nav.ts):

```ts
export const NAV: NavItem[] = [
  { path: '', label: 'Dashboard', permission: 'dashboard.view', group: 'Overview', primary: true },
  { path: 'visits',    label: 'OP visits',  permission: 'patient.view',   group: 'Clinic', primary: true },
  { path: 'patients',  label: 'Patients',   permission: 'patient.view',   group: 'Clinic', primary: true },
  { path: 'billing',   label: 'Billing',    permission: 'billing.receive', group: 'Clinic', primary: true },
  { path: 'pharmacy',  label: 'Pharmacy',   permission: 'pharmacy.sell',  group: 'Clinic' },
  { path: 'lab',       label: 'Lab',        permission: 'lab.view',       group: 'Clinic' },
  // ...
];
```

**Gap:** No backend-driven navigation. Menu items and groups are source-code constants. Module `foldedWith` logic is manual. The `AppShell` filters by `current.permissions` at runtime, which is correct — but adding/removing menu items requires a code change.

---

## 8. Routing

Routes are registered in [`apps/web/src/main.tsx`](file:///c:/Users/smani/OneDrive/Desktop/git/hospital-management-CRM/apps/web/src/main.tsx):

```
/login
/platform                              — Platform admin console
/:branch                               — AppShell wrapper
  /                                    — Dashboard
  /visits                              — OP Visits
  /patients                            — Patients list
  /patients/:id                        — Patient detail
  /visits/:visitId                     — Visit detail
  /billing                             — Billing queue
  /billing/:billId                     — Bill detail
  /pharmacy                            — Pharmacy queue
  /lab                                 — Lab queue
  /lab/visits/:visitId                 — Lab results entry
  /inventory                           — Inventory
  /vendors                             — Vendors
  /vendors/purchases/new               — New purchase bill
  /vendors/purchases/:id               — Purchase bill
  /treatments                          — Today's treatments
  /bookmarks                           — Prescription bookmarks
  /settings                            — Settings
  /help                                — Help

Print routes (no AppShell):
  /:branch/lab/visits/:visitId/print
  /:branch/billing/:billId/print
  /:branch/billing/:billId/receipts/:paymentId/print
  /:branch/billing/day-report/print
  /:branch/pharmacy/sales/:saleId/print
  /:branch/visits/:visitId/bill/print
```

---

## 9. API Client

Single centralized client in [`apps/web/src/api/client.ts`](file:///c:/Users/smani/OneDrive/Desktop/git/hospital-management-CRM/apps/web/src/api/client.ts):
- Base path: `/api` (same-origin; Vite proxies to API server in dev).
- Methods: `api.get`, `api.post`, `api.patch`, `api.put`, `api.delete`.
- Timeout: 20 seconds (`AbortSignal.timeout`).
- Retry: GET requests retry once on network error or 5xx.
- Auth: `credentials: 'include'` on every request.
- 401 handler: calls `onUnauthenticated` callback (clears QueryClient).
- Error normalization: throws `ApiError(status, code, message, fields?)`.

**Gap:** No request cancellation for stale queries (TanStack Query handles this via its own abort, but the client doesn't thread through the signal).

---

## 10. Existing Modules & Workflows

| Module | Pages | Key components |
|---|---|---|
| Dashboard | `Dashboard.tsx` | Patient chart, collection totals, pending dues, lab pending, stock alerts |
| OP Visits | `OpVisits.tsx` | Visit queue, status, doctor assignment, call-next |
| Patients | `Patients.tsx`, `PatientDetail.tsx`, `PatientTabs.tsx` | Patient list, registration, history |
| Visit Detail | `VisitDetail.tsx` | Prescription, lab orders, charges, status |
| Lab | `Lab.tsx`, `LabResults.tsx`, `LabReportPrint.tsx` | Lab queue, result entry, report print |
| Pharmacy | `Pharmacy.tsx`, `PharmacyBillPrint.tsx` | Dispense queue, direct sale, bill print |
| Billing | `Billing.tsx`, `BillPage.tsx`, `BillingPrints.tsx` | Billing queue, payment collection, prints |
| Inventory | `Inventory.tsx` | Medicine list, batch management, stock report |
| Vendors | `Vendors.tsx`, `PurchaseBill.tsx`, `NewPurchaseBill.tsx` | Vendor list, purchase bills |
| Treatments | `Treatments.tsx` | Course sittings and dose ticking |
| Bookmarks | `Bookmarks.tsx` | Ready-made prescription templates |
| Settings | `Settings.tsx` | Branch, staff, roles, billing config, lab catalog, audit |
| Platform | `Platform.tsx` | Multi-org admin console |

**Missing / stub:** No standalone Reports module. Reporting pages (`LabPeriodReport.tsx`, `PeriodReport.tsx`) are embedded inside other modules.

---

## 11. Existing UI Component Library (`@platform/ui`)

| Component | File |
|---|---|
| Button | `button.tsx` |
| Dialog | `dialog.tsx` |
| Menu / DropdownMenu | `menu.tsx` |
| Combobox | `combobox.tsx` |
| Choices (radio-like) | `choices.tsx` |
| Paging | `paging.tsx` |
| Primitives (Card, Badge, Input…) | `primitives.tsx` |
| ConfirmDelete | `ConfirmDelete.tsx` |
| ErrorBoundary | `ErrorBoundary.tsx` |
| Utils (cn) | `utils.ts` |

No dynamic form renderer, no table renderer, no field registry.

---

## 12. State Management

| State | Mechanism |
|---|---|
| Auth / current user | TanStack Query (`ME_KEY`) |
| Navigation config | Hardcoded static array |
| Nav counts (badge numbers) | TanStack Query polling via `/b/:branch/nav-counts` |
| Change detection | TanStack Query polling via `/b/:branch/changes` every 15s |
| Server data (all entities) | TanStack Query |
| Forms | React Hook Form |
| Theme | Zustand |
| Draft preservation | `localStorage` via `components/drafts.tsx` |

---

## 13. Build & Quality Tools

| Tool | Config |
|---|---|
| TypeScript | `tsconfig.base.json`, per-workspace `tsconfig.json` |
| Linter | None configured (gap) |
| Formatter | None configured (gap) |
| Unit tests | Vitest (API only — `apps/api/tests/`, 34 test files) |
| Frontend unit tests | None (gap) |
| E2E tests | Playwright-core, 4 scripts in `e2e/` |
| CI | `.github/workflows/ci.yml` |
| Build command | `npm run build` → `tsc && vite build` (web) |
| Type check | `npm run typecheck` → `tsc -p apps/api && tsc -p apps/web` |

---

## 14. Key Architectural Gaps vs. frontend-design.md

| # | Gap | Priority |
|---|---|---|
| G1 | Navigation is hardcoded in `nav.ts`; no backend-driven menu config | High |
| G2 | No standalone Reports module; reports scattered in Lab, Billing | High |
| G3 | No dynamic form engine / field registry | High |
| G4 | No frontend unit tests (zero coverage for web) | High |
| G5 | No ESLint / Prettier configured | Medium |
| G6 | No dynamic table renderer | Medium |
| G7 | Module system only supports `lab` and `courses` toggle via platform admin; no per-branch module config | Medium |
| G8 | No request cancellation signal threading in API client | Low |
| G9 | No breadcrumb beyond 2 levels ("Details" is hardcoded) | Low |
| G10 | `src/` Python skeleton is stale and confusing; should be removed or clearly marked | Low |

---

## 15. What Is Working Well

- Centralized API client with proper error handling, timeout, and retry.
- httpOnly cookie auth — no token in localStorage.
- Branch isolation enforced server-side on every route.
- `packages/shared` Zod schemas shared between browser and server.
- Consistent `{ error, code, fields? }` API error format.
- TanStack Query with 15-second change polling (lightweight real-time).
- Lazy-loaded pages with Suspense skeletons.
- Responsive layout (desktop sidebar + mobile bottom bar).
- Soft deletes and audit log on all mutations.
- 34 Vitest integration tests covering the API thoroughly.
- Playwright E2E smoke tests.
- TypeScript strict mode throughout.


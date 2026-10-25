# 03 — API Integration Matrix

> Maps every frontend workflow to its actual backend endpoints, auth requirements, permissions, and outstanding gaps.

---

## Auth routes (no branch scope)

| Frontend workflow | Method | Endpoint | Permission | Notes |
|---|---|---|---|---|
| Login | POST | `/api/auth/login` | none | Rate-limited 20/min |
| Logout | POST | `/api/auth/logout` | session | Revokes cookie |
| Fetch current user | GET | `/api/auth/me` | session | Returns `MeResponse` |
| Change password | POST | `/api/auth/password` | session | Revokes all other sessions |

**`MeResponse` shape:**
```ts
{
  user: { id, name, mobile, isOwner, isPlatformAdmin },
  organization: { id, name, modulesOff, maxBranches, maxStaff, plan: { paidUntil, graceDays } },
  branches: [{ slug, name, roleName, permissions[] }]
}
```

---

## Branch-common routes (`/api/b/:branch/`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Dashboard data | GET | `/api/b/:branch/dashboard` | `dashboard.view` |
| Nav badge counts | GET | `/api/b/:branch/nav-counts` | session |
| Change version (polling) | GET | `/api/b/:branch/changes` | session |
| Audit log | GET | `/api/b/:branch/audit` | `audit.view` |
| Server log | GET | `/api/b/:branch/logs` | `audit.view` |
| Branch logo | GET | `/api/b/:branch/branch-logo` | session |
| Client error report | POST | `/api/client-error` | session |

---

## Patients (`/api/b/:branch/patients`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| List patients | GET | `/patients?q=&page=` | `patient.view` |
| Get patient | GET | `/patients/:id` | `patient.view` |
| Register patient | POST | `/patients` | `patient.create` |
| Edit patient | PATCH | `/patients/:id` | `patient.edit` |
| Delete patient | DELETE | `/patients/:id` | `patient.delete` |
| Patient tabs (visits, bills…) | GET | `/patients/:id/tabs` | `patient.view` |
| Last visit of patient | GET | `/patients/:id/last-visit` | `patient.view` |

---

## Visits (`/api/b/:branch/visits`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| OP visit list | GET | `/visits?date=&status=` | `patient.view` |
| Get visit | GET | `/visits/:visitId` | `patient.view` |
| Start OP visit | POST | `/visits` | `patient.create` |
| Start direct lab visit | POST | `/visits/direct-lab` | `lab.view` OR `patient.create` |
| Start bill-only visit | POST | `/visits/direct-bill` | `billing.receive` |
| Update visit | PATCH | `/visits/:visitId` | `patient.edit` |
| Send to doctor | POST | `/visits/:visitId/send` | `patient.edit` |
| Call next patient | POST | `/visits/call-next` | `patient.view` |
| Delete visit | DELETE | `/visits/:visitId` | `patient.delete` |
| Visit lab summary | GET | `/visits/:visitId/lab` | `patient.view` |
| Visit prescription | GET | `/visits/:visitId/prescription` | `patient.view` |
| Visit charges | GET | `/visits/:visitId/charges` | `patient.view` |
| Visit bill | GET | `/visits/:visitId/bill` | `billing.receive` |
| Visit instructions | GET | `/visits/:visitId/instructions` | `patient.view` |
| Mark instruction done | POST | `/visits/:visitId/instructions/:id/done` | `patient.edit` |

---

## Prescription

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Add prescription item | POST | `/visits/:id/prescription` | `prescription.write` |
| Edit prescription item | PATCH | `/visits/:id/prescription/:itemId` | `prescription.write` |
| Delete prescription item | DELETE | `/visits/:id/prescription/:itemId` | `prescription.write` |
| Reorder items | PUT | `/visits/:id/prescription/order` | `prescription.write` |
| Prescription suggestions | GET | `/visits/:id/prescription/suggestions` | `prescription.write` |
| Add note/instruction | POST | `/visits/:id/prescription/notes` | `prescription.write` |
| Delete note | DELETE | `/visits/:id/prescription/notes/:noteId` | `prescription.write` |

---

## Bookmarks

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| List bookmarks | GET | `/bookmarks` | `prescription.write` |
| Create bookmark | POST | `/bookmarks` | `prescription.write` |
| Edit bookmark | PATCH | `/bookmarks/:id` | `prescription.write` |
| Delete bookmark | DELETE | `/bookmarks/:id` | `prescription.write` |
| Apply bookmark to visit | POST | `/visits/:id/bookmark/:bookmarkId` | `prescription.write` |

---

## Laboratory (`/api/b/:branch/lab`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Lab queue | GET | `/lab` | `lab.view` |
| Lab test catalog | GET | `/lab/tests` | `lab.view` |
| Lab test detail | GET | `/lab/tests/:testId` | `lab.view` |
| Create lab test | POST | `/lab/tests` | `settings.manage` |
| Edit lab test | PATCH | `/lab/tests/:testId` | `settings.manage` |
| Delete lab test | DELETE | `/lab/tests/:testId` | `settings.manage` |
| Lab packages | GET | `/lab/packages` | `lab.view` |
| Create lab package | POST | `/lab/packages` | `settings.manage` |
| Edit lab package | PATCH | `/lab/packages/:id` | `settings.manage` |
| Delete lab package | DELETE | `/lab/packages/:id` | `settings.manage` |
| Order lab tests (for visit) | POST | `/visits/:id/lab` | `lab.order` |
| Get visit lab report | GET | `/lab/visits/:visitId` | `lab.view` |
| Save lab results | PATCH | `/lab/visits/:visitId/orders/:orderId` | `lab.view` |
| Collect sample | POST | `/lab/visits/:visitId/orders/:orderId/collect` | `lab.view` |
| Cancel lab order | DELETE | `/lab/visits/:visitId/orders/:orderId` | `lab.view` |
| Lab period report | GET | `/lab/period-report?from=&to=` | `reports.view` |
| Lab import (bulk) | POST | `/lab/import` | `settings.manage` |

---

## Pharmacy (`/api/b/:branch/pharmacy`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Pharmacy queue | GET | `/pharmacy/queue` | `pharmacy.sell` |
| Dispense from prescription | POST | `/pharmacy/dispense` | `pharmacy.sell` |
| Direct sale (OTC) | POST | `/pharmacy/direct-sale` | `pharmacy.sell` |
| Pharmacy sale list | GET | `/pharmacy/sales` | `pharmacy.sell` |
| Pharmacy sale detail | GET | `/pharmacy/sales/:saleId` | `pharmacy.sell` |
| Last purchase (patient) | GET | `/pharmacy/patients/:patientId/last-purchase` | `pharmacy.sell` |
| Pharmacy period report | GET | `/pharmacy/period-report?from=&to=` | `reports.view` |

---

## Billing (`/api/b/:branch/billing`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Billing queue | GET | `/billing/queue` | `billing.receive` |
| Get bill | GET | `/billing/:billId` | `billing.receive` |
| Add charges to visit | POST | `/visits/:id/charges` | `billing.receive` |
| Edit charge | PATCH | `/visits/:id/charges/:chargeId` | `billing.receive` |
| Delete charge | DELETE | `/visits/:id/charges/:chargeId` | `billing.receive` |
| Receive payment | POST | `/billing/:billId/payments` | `billing.receive` |
| Period report (day/range) | GET | `/billing/period-report?from=&to=` | `reports.view` |
| Fee slots | GET | `/billing/fee-slots` | `billing.receive` |
| Billing settings | GET/PATCH | `/billing/settings` | `settings.manage` |
| Visit charges report | GET | `/billing/charges-report` | `reports.view` |

---

## Inventory (`/api/b/:branch/pharmacy/medicines` + `/batches`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Medicine list | GET | `/pharmacy/medicines` | `inventory.view` |
| Medicine detail | GET | `/pharmacy/medicines/:id` | `inventory.view` |
| Create medicine | POST | `/pharmacy/medicines` | `inventory.manage` |
| Edit medicine | PATCH | `/pharmacy/medicines/:id` | `inventory.manage` |
| Delete medicine | DELETE | `/pharmacy/medicines/:id` | `inventory.manage` |
| List batches | GET | `/pharmacy/medicines/:id/batches` | `inventory.view` |
| Add batch | POST | `/pharmacy/medicines/:id/batches` | `inventory.manage` |
| Stock report | GET | `/pharmacy/stock-report` | `inventory.view` |

---

## Vendors & Purchases

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Vendor list | GET | `/vendors` | `vendor.manage` |
| Create vendor | POST | `/vendors` | `vendor.manage` |
| Edit vendor | PATCH | `/vendors/:id` | `vendor.manage` |
| Delete vendor | DELETE | `/vendors/:id` | `vendor.manage` |
| Purchase bill list | GET | `/vendors/purchases` | `inventory.view` |
| Create purchase bill | POST | `/vendors/purchases` | `vendor.manage` |
| Get purchase bill | GET | `/vendors/purchases/:id` | `inventory.view` |
| Import purchase bill (Excel) | POST | `/vendors/purchases/import` | `vendor.manage` |

---

## Treatments & Courses

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Treatment dose list (today) | GET | `/treatments?date=` | `treatment.give` |
| Give treatment dose | POST | `/treatments/:doseId/give` | `treatment.give` |
| Course list | GET | `/courses` | `treatment.give` |
| Create course | POST | `/courses` | `prescription.write` |
| Course sittings | GET | `/courses/:courseId/sittings` | `treatment.give` |
| Complete sitting | POST | `/courses/:courseId/sittings/:id/complete` | `treatment.give` |

---

## Settings

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Branch info | GET/PATCH | `/branch` | `settings.manage` |
| Staff list | GET | `/staff` | `users.manage` |
| Add staff | POST | `/staff` | `users.manage` |
| Edit staff | PATCH | `/staff/:userId` | `users.manage` |
| Deactivate staff | DELETE | `/staff/:userId` | `users.manage` |
| Reset password | POST | `/staff/:userId/password` | `users.manage` |
| Roles list | GET | `/roles` | `users.manage` |
| Set role permissions | PUT | `/roles/:roleId/permissions` | `users.manage` |
| Doctors list | GET | `/doctors` | `settings.manage` |
| Doctor settings | GET/PATCH | `/doctors/settings` | `settings.manage` |
| Backup download | GET | `/backup` | `settings.manage` |
| Restore | POST | `/backup/restore` | `settings.manage` |
| Start fresh | POST | `/start-fresh` | `settings.manage` |

---

## Organization routes (`/api/org/`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Owner details | GET/PATCH | `/org/owner` | owner |
| Branch list | GET | `/org/branches` | owner |
| Create branch | POST | `/org/branches` | owner |
| Edit branch | PATCH | `/org/branches/:id` | owner |
| Role list (org-wide) | GET | `/org/roles` | owner |
| Create role | POST | `/org/roles` | owner |
| Edit role | PATCH | `/org/roles/:id` | owner |
| Delete role | DELETE | `/org/roles/:id` | owner |

---

## Platform routes (`/api/platform/`)

| Workflow | Method | Endpoint | Permission |
|---|---|---|---|
| Platform admin login | POST | `/api/auth/login` | isPlatformAdmin |
| Org list | GET | `/platform/orgs` | isPlatformAdmin |
| Create org | POST | `/platform/orgs` | isPlatformAdmin |
| Edit org (modules, limits) | PATCH | `/platform/orgs/:id` | isPlatformAdmin |

---

## ❌ Missing / Not Yet Implemented Endpoints

| Required feature | Needed endpoint | Notes |
|---|---|---|
| Report catalog | `GET /api/b/:branch/reports/catalog` | Reports module — Phase 5 |
| Dynamic report execution | `POST /api/b/:branch/reports/:reportId/run` | Reports module — Phase 5 |
| Report history | `GET /api/b/:branch/reports/history` | Reports module — Phase 5 |
| Export report | `GET /api/b/:branch/reports/:reportId/export` | Reports module — Phase 5 |
| Backend-driven nav config | `GET /api/b/:branch/nav-config` | Optional; see decision in doc 02 |
| Appointments | None | Module not yet built |
| Waiting queue realtime | WebSocket / SSE | Polling covers it for now |

---

## Response Conventions

| Concern | Convention |
|---|---|
| Error body | `{ error: string, code: string, fields?: Record<string, string[]> }` |
| Pagination | `{ items[], total, page, limit }` — or cursor-based for changes |
| Money | Always integer paise (₹1 = 100 paise) |
| Dates | ISO 8601 UTC strings |
| Soft deletes | `deleted_at` column; queries filter `isNull(deletedAt)` |
| Auth failure | HTTP 401 with `{ error, code: "unauthenticated" }` |
| Permission failure | HTTP 403 with `{ error, code: "forbidden" }` |
| Not found | HTTP 404 with `{ error, code: "not_found" }` |
| Validation | HTTP 400 with `{ error, code: "validation", fields: {...} }` |


# 05. API Contract Mapping & Compatibility

## 1. Interface Preservation Principles
To ensure that the existing React SPA (`apps/web`) operates without modification:
1. **Cookie Session Authentication**: Cookies named `sid` must be accepted, verified via SHA-256 hash lookup, and returned upon login/logout with `HttpOnly; SameSite=Lax; Path=/`.
2. **URL Route Layout**:
   - `/api/auth/*` for session handling.
   - `/api/platform/*` for multi-tenant and admin operations.
   - `/api/b/:branch/*` for all clinical and facility operations.
3. **Standardized Error Envelope**:
   ```json
   {
     "error": "Human readable error message",
     "code": "VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | ...",
     "fields": {
       "field_name": ["Specific validation error description"]
     }
   }
   ```
4. **Monetary Representation**: Integer paise across all payloads.

---

## 2. Exhaustive Endpoint Contract Matrix

### 2.1 Authentication & Session (`/api/auth`)
| Method | Path | Request Body | Response (200 OK) | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `{ "email": str, "password": str }` | `{ "user": UserDTO, "membership": MembershipDTO }` + Set-Cookie: `sid` | No |
| `POST` | `/api/auth/logout`| None | `{ "ok": true }` + Clear Cookie `sid` | Yes |
| `GET`  | `/api/auth/me`    | None | `{ "user": UserDTO, "memberships": [...], "roles": [...] }` | Yes |

### 2.2 Patient Management (`/api/b/:branch/patients`)
| Method | Path | Query / Body | Response | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET`  | `/api/b/:branch/patients` | `?q=...&limit=20&offset=0` | `{ "data": [PatientDTO], "total": int }` | `patient.read` |
| `POST` | `/api/b/:branch/patients` | `PatientCreateDTO` | `PatientDTO` (with auto-generated `uhid`) | `patient.create` |
| `GET`  | `/api/b/:branch/patients/:id` | None | `PatientDetailDTO` (includes active visits) | `patient.read` |
| `PATCH`| `/api/b/:branch/patients/:id` | `PatientUpdateDTO` | `PatientDTO` | `patient.update` |

### 2.3 OPD Visits & Consultations (`/api/b/:branch/visits`)
| Method | Path | Query / Body | Response | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET`  | `/api/b/:branch/visits` | `?date=...&status=...` | `[VisitListItemDTO]` | `op_visit.read` |
| `POST` | `/api/b/:branch/visits` | `VisitCreateDTO` | `VisitDTO` (token generated atomically) | `op_visit.create` |
| `GET`  | `/api/b/:branch/visits/:id` | None | `VisitDetailDTO` (vitals, notes, prescriptions) | `op_visit.read` |
| `PATCH`| `/api/b/:branch/visits/:id/vitals` | `VitalsDTO` | `VisitDTO` | `clinical.write` |
| `POST` | `/api/b/:branch/visits/:id/prescriptions` | `PrescriptionCreateDTO` | `PrescriptionDTO` | `prescription.write` |
| `POST` | `/api/b/:branch/visits/:id/complete` | None | `VisitDTO` (status -> completed) | `clinical.write` |

### 2.4 Pharmacy & Dispensary (`/api/b/:branch/pharmacy`)
| Method | Path | Query / Body | Response | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET`  | `/api/b/:branch/pharmacy/medicines` | `?q=...&in_stock_only=bool` | `[MedicineWithStockDTO]` | `pharmacy.read` |
| `POST` | `/api/b/:branch/pharmacy/medicines` | `MedicineCreateDTO` | `MedicineDTO` | `pharmacy.manage` |
| `GET`  | `/api/b/:branch/pharmacy/batches` | `?medicine_id=...` | `[BatchDTO]` (ordered by FEFO) | `pharmacy.read` |
| `POST` | `/api/b/:branch/pharmacy/sales` | `PharmacySaleCreateDTO` | `PharmacySaleDTO` (deducts FEFO stock) | `pharmacy.dispense` |

### 2.5 Billing & Invoicing (`/api/b/:branch/billing`)
| Method | Path | Query / Body | Response | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET`  | `/api/b/:branch/billing/invoices` | `?patient_id=...&from=...&to=...` | `[InvoiceListItemDTO]` | `billing.invoice.read` |
| `POST` | `/api/b/:branch/billing/invoices` | `InvoiceCreateDTO` | `InvoiceDTO` (creates tax snapshots) | `billing.invoice.create` |
| `POST` | `/api/b/:branch/billing/invoices/:id/payments` | `PaymentCreateDTO` | `PaymentReceiptDTO` | `billing.payment` |
| `POST` | `/api/b/:branch/billing/invoices/:id/cancel` | `{ "reason": str }` | `InvoiceDTO` (creates audit record) | `billing.invoice.cancel` |

### 2.6 Atomic Checkout (`/api/b/:branch/checkout`)
| Method | Path | Query / Body | Response | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/b/:branch/checkout` | `CheckoutRequestDTO` | `CheckoutResponseDTO` | `billing.invoice.create` |
*(Atomically creates an invoice, finalizes OPD charges, allocates pharmacy stock via FEFO, records payment receipt, and closes visit in one single transaction).*


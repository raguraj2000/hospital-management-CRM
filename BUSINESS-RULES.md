# BUSINESS-RULES.md — how the owner's hospitals work

## 1. Purpose

- This file holds the business rules of the HMS (hospital management system).
- It is for developers and AI coding agents. Read it before you build or change a feature.
- Technical rules (branch scoping, auth, errors, tests) are in [AGENTS.md](AGENTS.md). They are not repeated here.
- Words used here:
  - **Rule** = the owner decided it. Follow it.
  - **Current gap** = the code today does not follow the rule yet.
  - **OPEN — the owner decides** = not decided. Do not pick an option yourself. Ask the owner.

## 2. Product and core business areas

The product is an HMS for small hospitals in India. It is sold to many hospitals (clients).

| Area | What it covers |
|---|---|
| Consultation | Register the patient, vitals, the doctor sees the patient, prescription, consultation fee. |
| Lab | The doctor orders tests, the lab enters results, the lab report is printed. |
| Pharmacy | Medicine list, stock by batch and expiry, selling medicines at the counter. |
| Nursing | IV, injections, and other treatments done by nurses. |
| Other charges | Anything else that is billed, for example bed charges and procedures. |

Code layout: `packages/shared` (Zod schemas, permissions), `packages/core` (login, branch gate,
roles, audit), `packages/ui`, `apps/api` (Hono + SQLite/Drizzle), `apps/web` (React).

## 3. Patient journey

### Example A — village hospital (the current client)
Many patients have little money. EVERY patient is billed once, at the end.

1. Register the patient (new, or select an existing one).
2. Enter vitals.
3. The doctor sees the patient.
4. The doctor orders lab tests if needed, and prescribes.
5. Nursing, lab tests, IV and injections happen.
6. Last step: the patient goes to the pharmacy and gets the medicines.
7. The pharmacy counter makes ALL bills, with ONE payment, at the same place.

### Example B — city hospitals
- Payment comes BEFORE the service: pay first, then consultation / lab / medicines.
- So the order differs from Example A: the payment step comes before each service.

### Rule
- Every hospital has its own way of working and billing.
- The app must support different workflows per hospital. It must not force one fixed flow.

## 4. Billing workflows per hospital

### Rules
- **Decided (owner, 2026-11-10):** ONE billing-mode setting per branch, with a few named modes
  (Settings > Billing), e.g. "Pay at the end (one bill)" and "Pay before each service". Not
  separate switches per service. Build "Pay at the end" first (the current village client).
- The billing order must be a setting per hospital (per branch). It must never be hard-coded.
- A new feature must not assume "pay first" or "pay at the end". It must ask the branch setting.
- Changing the billing mode of one branch must not change any other branch.

### Known modes (from the owner)
| Mode | Meaning |
|---|---|
| Pay at the end, one bill | All services first. One bill and one payment at the pharmacy counter (Example A). |
| Pay before each service | The patient pays first, then gets the consultation / lab test / medicines (Example B). |
| OP + IP in one final bill | Some hospitals bill outpatient (OP) and inpatient (IP) patients in one final bill. Other hospitals do it another way. |

### What the mode must change
A billing mode must be able to control these four things:

| Question | Pay at the end | Pay before each service |
|---|---|---|
| When may a lab report print? | The doctor must get the results before the final bill. How: OPEN 2. | After the lab charges are paid. |
| When may medicines be given? | At the final counter, with the one payment. | After the medicines are paid. |
| When is a visit complete? | Not decided (OPEN 1). | Not decided (OPEN 1). |
| What does "pending dues" show? | Not decided (OPEN 1). An unpaid visit during the day is normal in this mode. | Not decided (OPEN 1). |

The OP + IP mode has no column, because IP is not defined yet (OPEN 3).

### Code today and current gaps
- ONE checkout per OP visit collects consultation + lab + other charges (OP bill) and medicines
  (pharmacy sale) in one payment: `apps/api/src/routes/checkout.ts`.
- The counter may also take the consultation fee before the doctor sees the patient.
  `checkout.ts:79` only holds back medicines until the doctor is done.
- There is NO billing-mode setting per hospital. Branch settings are only: consultation fee,
  default doctor, charge presets, fee slots by time of day, nav counts
  (`clinic_setting` in `apps/api/src/db/schema.ts`).
- Lab report printing is blocked until the lab charges are paid, unless an admin "releases" it
  (`apps/api/src/routes/lab.ts`, about line 469). This fits pay-first hospitals. It conflicts with
  the village flow, where the doctor needs the report before the final bill.
- There is NO inpatient (IP) module: no admission, no bed, no ward, no discharge summary.
  Bed charges can only be typed as "other charges" on a visit.

### OPEN — the owner decides
- **OPEN 1 — Billing-mode details.** The shape is decided (one setting per branch, see Rules).
  Still open: who may change it, what happens to visits that are open when it is changed, when a
  visit counts as complete, and what "pending dues" shows in each mode.
- **Decided (owner, 2026-11-10) — lab report before payment:** the owner or the branch admin
  (only they) can switch on "Print lab reports before payment" for their branch. When it is on,
  anyone who may print lab reports prints without payment; no per-visit release is needed.
  When it is off, printing waits for payment (or an admin release) as today.
- ~~OPEN 2~~ (decided above). Old options were: (a) in pay-at-the-end mode the report prints
  without payment; (b) the doctor sees results on screen, but paper printing waits for payment;
  (c) keep the lock and the admin release for every hospital.
- **OPEN 3 — Inpatient (IP).** Not built. Options: (a) build admission, bed, ward and discharge;
  (b) keep bed charges as "other charges" on a visit; (c) later. How OP + IP go into one final
  bill is also not decided.

## 5. Branch isolation and reset

### Rules (from the owner)
- Branch isolation is a core rule. All patient data and all business records belong to one branch.
- One branch must never see or change another branch's records. See [AGENTS.md](AGENTS.md).
- "Reset" (clearing data) must reset ONLY that one branch.
- Reset must be allowed only for a user who has the permission to do it.
- Reset must never remove the default lists or their prices (section 6).
- **Decided (owner, 2026-11-10):** reset runs in the app, Settings > Reset this branch, **owner
  only**, and resets **everything of that branch** (its patients, visits, bills, sales, lab work,
  courses, expenses, stock) except the default lists and their prices. Other branches are never
  touched. Make a backup first and ask for a typed confirmation.
- The organization-wide UHID counter is never reset by a branch reset: other branches still use
  it, and resetting it would give two patients the same UHID.

### Current gap — what "start fresh" does today
Code: `apps/api/src/lib/start-fresh.ts`.

- It is run only from the pendrive tool (`setup-tool.ts start-fresh`), not from the app.
- It has NO permission check.
- It is NOT branch-scoped. It clears the trial tables for the WHOLE database (all branches).
- It also clears `audit_log` and the organization-wide UHID counter.
- It keeps the setup tables: `medicine`, `lab_test`, `lab_test_parameter`, `lab_package`,
  prices, staff, settings. Stock is kept only if chosen.
- This conflicts with the owner's rule. Do not copy this behaviour into new code.

### OPEN — the owner decides
- **OPEN 4 — Reset details.** Where and who are decided (see Rules). Still open: is the branch's
  `audit_log` cleared or kept (it is the record of who did what), are the branch's staff, vendors
  and settings kept, and are medicines / lab tests the hospital added itself kept like the defaults.

## 6. Default lists (medicines and lab tests)

### Rules (from the owner)
- Every branch of every client must have two default lists:
  - the pharmacy medicine list, with 0 stock;
  - the lab test list.
- Both lists are shipped with a default price of 0.
- These lists are non-resettable. A reset never removes the lists or their prices.
- Price 0 on a default item means "price not set yet". It does not mean "free".
- A medicine at ₹0 must not be sold until the hospital sets its price.

### Current gaps
- A newly created branch gets NO default medicine list and NO default lab test list in this repo.
  The default catalog lives in a separate editions copy. So "defaults on every branch" is not true yet.
- The ₹0 medicine rule is only on git branch `fix-expiry-zero-price` (not merged). There, a
  medicine can no longer be created or edited at ₹0, and a ₹0 medicine is refused at the counter
  ("has no price. Set its price in Inventory first.").
- That branch refuses to create a medicine at ₹0 from the form, but the default list ships at ₹0.
  Default items must therefore enter a branch through the default-list step (OPEN 5), not the
  form. Staff can edit other fields of a ₹0 default item, but can only save a price above ₹0.
- **Decided (owner, 2026-11-10):** a lab test at ₹0 is blocked like a medicine: it cannot be
  ordered until its price is set. Free tests inside a prepaid course still work (the course
  pays for them).

### OPEN — the owner decides
- **OPEN 5 — How a new branch gets the default lists.** Options: (a) copy them when the branch is
  created; (b) a setup step run by the installer; (c) one shared catalog that every branch reads
  (this must still respect branch isolation). Also open: are items the hospital added itself
  kept on reset, like the default items.

## 7. Money safety rules

- **Never sell at ₹0.** A medicine with no price must be refused at the counter (section 6).
- **Never sell an expired or soon-expiring batch.**
  - A batch must never be sold on its expiry day.
  - A batch must stay in date until the last dose of the prescribed days
    (`minExpiryFor` in `apps/api/src/routes/pharmacy.ts`).
  - Medicines must be sold only through `planFefo` (earliest expiry first). Do not pick batches another way.
  - Like the ₹0 rule, this is on git branch `fix-expiry-zero-price` (not merged).
- **Every payment and every change must be in the audit log.** See [AGENTS.md](AGENTS.md).
- **Money records must not be deleted.** A wrong bill or sale must be cancelled or refunded with
  a reason, never removed.

### Current gaps
- There is NO refund.
- There is NO return for a cancelled sale.
- There is NO stock write-off (for expired or damaged stock).

### OPEN — the owner decides
- **OPEN 7 — Refund, sale return, stock write-off.** None is built. Not decided: who may do each
  one, is a reason required, does returned medicine go back into stock, and how each one shows in
  the day's collection report.

## 8. Lab report design per client

### Requirement (from the owner)
- Each client wants its own lab report design.
- This is known to be the hardest part of the product.

### Why it is hard (developer notes, not owner statements)
- Each client's design can differ in everything: layout, logo, column order, signatures.
- Today there is only one fixed layout, so every new design is new work.
- The report must still print correctly offline (see [AGENTS.md](AGENTS.md)).
- A layout change for one client must not break the report of another client.

### Code today
- One fixed layout in the web app.
- Per branch only a print header can be set: title, address, phone, logo, up to 3 doctors, two
  signatures (`printHeaderSchema` in `packages/shared/src/index.ts`).

### Rule — decided (owner, 2026-11-10)
- **Built-in layouts + settings.** The app ships 3-4 ready layouts (for example: classic,
  boxed table, compact, pre-printed letterhead = margins only, nothing printed in the header).
  Each branch picks one and adjusts settings (fonts, columns, colors, where the flag goes).
- No code per client. A new client's design must be reachable by picking a layout + settings;
  if it is not, add a setting or a layout that every client can use.
- Changing one branch's layout or settings must never change another branch's report.

## 9. Day-to-day exceptions — always design for these

Check every new feature against these four cases.

### Doctor absent
- Today: there is no "doctor absent today" concept. Visits can only be moved to another doctor
  one by one. A visit with a paid bill cannot be cancelled, and there is no refund.
- **Decided (owner, 2026-11-10):** if the doctor is absent from the start, the front desk simply
  does not create OP visits for them. The real case is: the doctor already has OP visits and has
  to leave. Then, on the OP visits page, easy to use:
  - **Change doctor for all**: move all of that doctor's open OP visits to another doctor in one step
    (and change the doctor of one visit, as today).
  - **Delete one OP visit**, or **delete all** selected OP visits in one step.
  - Delete removes only visits where **nothing was done yet** (no lab test, medicine, treatment,
    charge, bill or sale). A visit with work done is never deleted: it is **moved to another
    doctor** instead. The screen says which ones were skipped and why.

### Patient leaves without paying
- In pay-at-the-end hospitals the service is already given when the patient leaves.
- Today: there is no "left without paying" status and no write-off. A patient who still owes
  money cannot be deactivated (`apps/api/src/routes/patients.ts:136`).
- **Decided (owner, 2026-11-10):** what the patient did not pay is **added to that patient's
  dues** (Billing > Pending payments), and collected on a later visit. No write-off.

### Patient cannot pay in full
- Many village patients have little money.
- Today (already built): the checkout accepts less than the total, and the rest stays as a
  balance due on the OP bill (`checkout.ts:142`). The bill list can show bills that are still
  due. A patient can later pay old balances in one payment; the money goes to the oldest bill
  first (`POST /patients/:id/pay-dues`, `apps/api/src/routes/billing.ts:495`).
- **Decided (owner, 2026-11-10):** a patient who cannot pay the full amount pays what they can;
  the rest stays in pending dues against that patient.
- Current gap: medicines must be paid in full today (`checkout.ts:200`); only the OP bill
  (consultation, lab, other charges) can be left as a due.
- **Decided (owner, 2026-11-10):** the unpaid part of **medicines** may also go to dues, like the
  OP bill. (Pharmacy sales must record what was paid; database change approved.)
- **OPEN 11 — Limit on dues.** Is there a limit on dues per patient?

### Day-end with open visits
- At the end of the day some visits are still not finished or not paid.
- **Decided (owner, 2026-11-10):** staff clean up open visits with the delete options (one visit,
  or all selected) from the doctor-absent section. Unpaid amounts go to the patient's dues.
  Nothing is closed automatically.

## 10. UI expectations

- Show a loading skeleton while the screen waits for the server. Do not show a blank page or a frozen screen.
- The app must work on slow PCs and slow networks. Keep pages light.
- Offline-first on the hospital LAN: no CDN links, no runtime downloads. See [AGENTS.md](AGENTS.md).
- The owner wants a better UI, theme and workflow. Screens must follow the hospital's real steps (section 3).
- The product must scale up to more hospitals. Do not write code that only works for one client;
  put the difference in a branch setting.

## 11. OPEN decisions — the owner decides

1. Billing-mode details: who changes it, open visits when changed, visit complete, pending dues (section 4).
3. Inpatient (IP) module, and how OP + IP go into one final bill (section 4).
4. Reset details: audit log, staff / vendors / settings, hospital-added items (section 5).
5. How a new branch gets the default medicine and lab test lists (section 6).
7. Refund, cancelled-sale return and stock write-off (section 7).
11. A limit on dues per patient (section 9).

When the owner decides an item: move it from OPEN to a rule in its section, and remove it from this list.

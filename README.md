# HMS (platform)

A hospital management system for small hospitals and clinics: front desk, doctor, lab, pharmacy and billing
for out-patients (OP). One hospital (an "organization") has one or more branches; **every business record
belongs to exactly one branch**.

Built as a reusable multi-branch platform (`packages/core`) with the hospital product on top (`apps/api`,
`apps/web`).

## What it does today

| Area | What staff can do | Server code |
|---|---|---|
| Patients | Register, edit, deactivate; UHID per hospital | `apps/api/src/routes/patients.ts` |
| OP visits | Token queue, vitals, doctor notes, send to lab / counter | `routes/visits.ts`, `routes/doctors.ts` |
| Prescriptions | Medicines, notes, bookmarks (ready-made treatments), print | `routes/pharmacy.ts`, `routes/bookmarks.ts` |
| Pharmacy and stock | Batches with expiry, earliest-expiry-first sale, counter sale, stock report | `routes/pharmacy.ts` |
| Vendors | Purchase bills (adds stock), vendor payments, expenses | `routes/vendors.ts` |
| Lab | Test list, orders, results, printed report | `routes/lab.ts` |
| Billing | OP bill, payments, dues, day report, one checkout per visit | `routes/billing.ts`, `routes/checkout.ts` |
| Treatments | Doses given in the hospital; multi-sitting courses | `routes/treatments.ts`, `routes/courses.ts` |
| Admin | Staff, roles and permissions per branch, network lock, print header, history log | `packages/core/src/admin.ts`, `apps/api/src/app.ts` |
| Backup | Download / restore the whole database, daily backup | `routes/backup.ts`, `lib/daily-backup.ts` |
| Platform console | You, hosting several hospitals: create, suspend, plans, payments | `routes/platform.ts` |

Not built: in-patients (beds, admission), refunds and sale returns, GST on patient bills, appointments.

## Layout

```
packages/shared   Zod schemas, permission list, shared types and money/date helpers (API + web)
packages/core     server core: database, cookie login, sessions, branch gate, roles, audit, security headers
packages/ui       React UI kit (Tailwind 4 + Radix)
apps/api          the API (Hono + SQLite through Drizzle/libsql), port 4100
  src/app.ts        every route is mounted here; dashboard, menu counts, history log
  src/routes/       one file per area (see the table above)
  src/lib/          shared server helpers (clinic.ts), nightly jobs, start-up data fixes
  src/db/schema.ts  the hospital tables (core tables are in packages/core/src/db/schema.ts)
  drizzle/          migrations, applied automatically at start
  tests/            Vitest, run against a real throwaway SQLite database
apps/web          the web app (Vite + React 19 + React Router + TanStack Query)
  src/main.tsx      routes; each page is its own lazy chunk
  src/pages/        one file per screen, plus the printed papers (*Print.tsx)
  src/components/   shared pieces; PrintSheet.tsx + ReportHeader.tsx are the letterhead of every print
  src/api/client.ts the one way the app talks to the server
scripts/          pendrive packaging (on-site install) and the browser smoke test
prototypes/       the first Cloudflare experiment (kept for reference, not used)
```

## How it runs

- **On-site PC (this branch).** One Node server serves the API and the built web app on the hospital's LAN,
  with a SQLite file. Works with no internet. Installed from a pendrive: `scripts/package-pendrive.ps1`.
- **Online (Cloudflare Worker).** The code is in `apps/cloud` **on the `web-app` branch**, not on `main` or
  branches cut from it. Read `apps/cloud/README.md` there before deploying anything.

## First run

```
npm install
$env:OWNER_MOBILE='9876543210'; npm run seed    # PowerShell
OWNER_MOBILE=9876543210 npm run seed            # bash
```

This creates the organization, the branch "main", the default roles and the owner.

Staff sign in with a **mobile number** and password. Seed options (environment): `ORG_NAME`, `ORG_ID_PREFIX`,
`BRANCH_NAME`, `BRANCH_SLUG`, `BRANCH_PREFIX`, `OWNER_MOBILE` (required), `OWNER_NAME`, `OWNER_PASSWORD`
(generated and printed when left out).

```
npm run seed -- platform-admin <mobile> <password>   # the login for the platform console
```

## Develop

```
npm run dev:api         # http://localhost:4100 (API)
npm run dev:web         # http://localhost:5173 (app; /api is proxied to 4100)
```

## Production on one PC

```
npm run build                  # builds apps/web/dist
npm start -w @platform/api     # API + app on http://<this-pc>:4100
```

Server settings (environment): `PORT`, `DATABASE_URL`, `MIGRATIONS_DIR`, `WEB_DIR`, `BACKUP_DIR`, `LOG_FILE`,
`NODE_ENV`, `TRUST_PROXY=1` (only behind a proxy that sets `X-Forwarded-For`).

On-site tools (`apps/api/src/setup-tool.ts`, bundled to `setup.mjs` on the pendrive): `init`, `backup`,
`reset-password`, `start-fresh`, `export`.

## Checks

```
npm test                # API tests (Vitest)
npm run typecheck
npm run build
npm run e2e             # browser smoke test of every role; needs Edge or Chrome
```

CI (`.github/workflows/ci.yml`) runs the first three on every pull request.

The four `e2e:*` scripts in `e2e/` still sign in with the old username form and no longer work; use
`npm run e2e`.

## Rules of the code

The full list is in `AGENTS.md`. The ones that matter every day:

- Every hospital table carries `branch_id`, and every query filters by the branch of the request.
- Every branch route declares its permission; the screens only hide what the server already refuses.
- Money is whole paise (integers). Days are India dates: use `localToday()` in `apps/api/src/lib/clinic.ts`.
- Input is checked with the Zod schemas in `packages/shared`, the same in the browser and on the server.

## Database changes

Edit `apps/api/src/db/schema.ts` (or `packages/core/src/db/schema.ts`), then
`npm run db:generate -w @platform/api` and commit the new file in `apps/api/drizzle/`. Never edit a migration
that has already run somewhere. Add only (new tables or columns), so an older version of the code keeps working.

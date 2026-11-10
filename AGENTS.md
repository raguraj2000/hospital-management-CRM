# AGENTS.md — rules for every agent (and person) working in this repo

A hospital management system for small hospitals, built on a reusable multi-branch platform.
See README.md for the layout, the commands and where each feature lives.
**Read [BUSINESS-RULES.md](BUSINESS-RULES.md) before building any feature**: how hospitals bill, branch
reset, default lists, lab report layouts. Its OPEN items are the owner's to decide, never yours.

## Rules that must stay true

- **Every business record is branch-scoped.** Product tables spread `branchColumns` and every
  query filters by the branch from `branchContext`. Nothing is shared between branches.
  Another branch's record must answer exactly like a missing one (404).
- Branch routes live under `/api/b/:branch/*` behind `requireAuth` + `branchContext`, and each
  route declares `requirePermission(...)` or `requireAnyPermission(...)`. The UI only hides things;
  the server decides. Owner-only routes are under `/api/org`, the platform console under `/api/platform`.
- Sessions are httpOnly cookies (12 hours, revocable); only a sha256 of the token is stored. Never put
  a token in localStorage or send it in a response body. There is no JWT and no refresh token.
- Every API error is `{ error, code, fields? }` via `AppError`. No stack traces to clients.
- Input is validated with the shared Zod schemas in `packages/shared` (same rules in browser and API).
- Records that staff create (patient, visit, medicine, vendor, bookmark...) are deleted softly
  (`deleted_at`). Lines that are rewritten as a set (bill lines, bookmark lines, course items) may be
  removed for real, inside the same transaction. Create/update/delete write to `audit_log`.
- Money is whole paise in integers. Days are India dates (`localToday()` in `apps/api/src/lib/clinic.ts`);
  do not compute "today" from the server's clock in a new way.
- Selling a medicine goes through `planFefo` in `routes/pharmacy.ts` (earliest expiry first, never an
  expired batch). Do not take stock any other way.
- `packages/core`, `packages/ui`, `packages/shared` core parts must not import product (clinic) code.
- Offline-first: no CDN links, no runtime downloads, no telemetry.

## How to work

- Schema changes: edit the Drizzle schema, run `npm run db:generate -w @platform/api`, never edit
  an applied migration, add only (no rename or drop). Ask the user before schema changes.
- Add tests for every new branch-scoped route: one proving another branch can't read/write it.
  Tests are in `apps/api/tests` and run against a real throwaway database (`tests/helpers.ts`).
- Before saying done: `npm test`, `npm run typecheck`, `npm run build` — show the output.
- Simplest thing that works; mark shortcuts with `// TODO(shortcut): <reason>`.
- Never commit `*.db`, `data/`, `.env*`, `.dev.vars`, `node_modules/`, `dist/`.
- The online (Cloudflare) version is in `apps/cloud` on the `web-app` branch. Nothing is deployed
  from this repo without the user's OK.

# Cloudflare prototype (throwaway)

Question: can HMS run on **one Cloudflare Worker + one Durable Object (its own SQLite database) per hospital**?
Not part of the app. Nothing here is deployed.

Run it: `npm install`, then `npm run dev` (local Cloudflare on :8787), then `BASE=http://127.0.0.1:8787 npm run check`.

## Results (2026-10-20, wrangler 4.151.2, drizzle-orm 0.45, local)

| Check | Result |
|---|---|
| The real HMS schema (`apps/api/src/db/schema.ts`) migrates inside a Durable Object | ✓ |
| Two-item sale, second item short, written **as HMS writes it today** (`db.transaction(async tx => { await … })`) | ✗ refused, but the first item's stock was **not** put back |
| The same sale with the Durable Object's `transactionSync` (synchronous Drizzle calls) | ✓ all or nothing |
| The same sale, HMS's async code unchanged, inside the Durable Object's **async** `ctx.storage.transaction(async …)` | ✓ all or nothing (`/sale-storage`) |
| 25 sales at the same moment, 10 in stock (both styles) | ✓ 10 sold, 15 refused, stock 0 (one hospital's requests run one at a time) |
| Two hospitals are two separate databases | ✓ |
| HMS password check (scrypt N=16384) | runs; ~40 ms per check locally — likely over the free plan's 10 ms CPU; real CPU shows only after a deploy |

## What it means for the move

- Drizzle's own `db.transaction(async …)` silently loses all-or-nothing in a Durable Object. The fix is ONE
  central wrapper: on Cloudflare, `db.transaction(fn)` runs `fn` inside `ctx.storage.transaction(async () => …)`.
  The 54 transactions of the API stay as written (no rewrite), and the Node/pendrive server keeps libsql,
  whose async transactions already roll back.
- This rollback behaviour of the async storage transaction for SQL was found by test, not read in Cloudflare's
  docs: keep a rollback test running against a Durable Object.
- (Tried and undone 2026-10-20: switching Node to better-sqlite3 to force sync transactions — not needed.)
- Concurrency is safer than today: a hospital's requests are serialized by the platform.

## Live on Cloudflare (free plan, new HMS account, 2026-10-20)

Deployed as `hms-proto` to `https://hms-proto.hms-cloudflare-prototype.workers.dev` (account `bc8509d9…`).
This PC has `CLOUDFLARE_ACCOUNT_ID` set to another account (other projects), so `wrangler.jsonc` pins the HMS
account and commands run with `CLOUDFLARE_ACCOUNT_ID=bc8509d94dbc0fc835d6bf44ed033c5c`.

Same results as local (async does not roll back; sync does; 25-at-once race safe; hospitals separate).
CPU time per request from `wrangler tail --format json`:

| Request | CPU ms |
|---|---|
| sale (sync or async), stock list | 0–5 |
| first request of a new hospital (creates every table) | 16–34 |
| password check ×2 (HMS scrypt settings) | 102–133, i.e. ~50–65 per login |

All 8 password requests ended "ok" on the free plan despite the 10 ms limit. That tolerance is not documented;
production logins should not depend on it (Workers Paid: 30 s CPU per request).


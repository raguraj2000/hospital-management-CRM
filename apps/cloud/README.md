# HMS on Cloudflare (the online version)

One Worker (`hms`) serves the web app and the API. Each hospital's data lives in its own Durable Object (its own
SQLite database), with the same code and the same migrations as the PC version (`apps/api`).

Everything here runs on the **HMS Cloudflare account** (`bc8509d9…`). This PC has `CLOUDFLARE_ACCOUNT_ID` set to
another account for other projects; the commands below always override it. Do not run plain `wrangler deploy`
from another folder.

## Everyday flow: local → staging → production

| Step | Command (in `apps/cloud`) | What it does |
|---|---|---|
| 1. Local | from the repo root: `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` | The PC version's checks |
| 2. Local Cloudflare | `npm run dev`, then from the root `E2E_BASE=http://127.0.0.1:8788 node scripts/e2e/smoke.mjs` and `node apps/cloud/scripts/check.mjs` | Same app on a local Cloudflare (test owner from `.dev.vars`) |
| 3. Staging | `npm run deploy:staging` | `https://hms-staging.hms-cloudflare-prototype.workers.dev` — test data only; login in `handoff/staging-login.txt` (on this PC only) |
| 4. Test staging | from the root: `E2E_BASE=<staging url> E2E_OWNER_PASSWORD=<from the file> node scripts/e2e/smoke.mjs` | Every role, every page, online |
| 5. Production | `npm run deploy:prod` | The hospital's site (`hms`) |
| 6. Something wrong | `npm run rollback:prod -- "reason"` | Production back to the previous version in seconds. Data is not touched. |

The e2e test creates staff with fixed mobile numbers, so it runs on an **empty** staging: reset staging first
(`npx wrangler delete hms-staging --force`, deploy again, set the three secrets again — see below).

**Rule for every database change:** add only (new tables/columns). Then rolling back the code is always safe,
because the older version ignores what it does not know. Never rename or drop in the same release.

## Setting up a hospital (first time only)

The hospital starts empty. Give it its owner once, as secrets (a secret is never shown again):

```
printf '%s' 'Hospital name'      | npx wrangler secret put SETUP_ORG_NAME        [--env staging]
printf '%s' 'Owner name'         | npx wrangler secret put SETUP_OWNER_NAME      [--env staging]
printf '%s' '9876543210'         | npx wrangler secret put SETUP_OWNER_MOBILE    [--env staging]
printf '%s' '<temporary password>' | npx wrangler secret put SETUP_OWNER_PASSWORD [--env staging]
```

(with `CLOUDFLARE_ACCOUNT_ID=bc8509d94dbc0fc835d6bf44ed033c5c` in front of each). On the first request the hospital
is created with that owner. Each secret rolls out a new version, which takes a few seconds: **sign in as the owner
until it works** before testing or handing over (a request in between can still reach the version without the
secrets, and then the hospital is not set up yet). The owner changes the password after the first sign-in. The secrets do nothing once
the hospital has data; they can be deleted with `npx wrangler secret delete <NAME>`.

## Free plan: check usage by hand (once a week, 2 minutes)

1. dash.cloudflare.com → choose the **HMS account** (not the other one).
2. **Workers & Pages** → the **Usage** panel on the right: requests and CPU time this month.
3. Click **hms** → **Metrics**: requests per day.
4. Its **Durable Objects** part: rows read, rows written, storage.
5. Free daily limits (reset 5:30 am India time): Worker requests 100,000 · Durable Object requests 100,000 ·
   rows read 5 million · rows written 100,000 · storage 5 GB total. Over a limit, HMS stops until the reset.
6. Any day above about **70%** → upgrade to Workers Paid ($5/month): no daily stops, nothing to move.

## What is different from the PC version

- No Backup tab: Cloudflare keeps point-in-time restore of each hospital's database by itself
  (how many days on the free plan: check before relying on it). Restores are done by support.
- No log download, no daily backup file, no "Start fresh" tool.
- Not yet: several hospitals on one site (the login directory), the super admin portal online, offline read-only.

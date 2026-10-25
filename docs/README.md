# Platform

Reusable B2B multi-branch platform. First product: the clinic.

```
packages/shared   Zod schemas + permission list (used by API and web)
packages/core     server core: DB, cookie login, sessions, branch gate, RBAC, audit, security
packages/ui       React UI kit (Tailwind + Radix, shadcn-style)
apps/api          clinic API (Hono + SQLite via Drizzle/libsql), port 4100
apps/web          clinic web app (Vite + React + React Router + TanStack Query)
```

## First run

```
npm install
npm run seed            # creates the organization, branch "main", roles, owner (prints the password)
```

Seed options (env): `ORG_NAME`, `BRANCH_NAME`, `BRANCH_SLUG`, `BRANCH_PREFIX`, `OWNER_USERNAME`, `OWNER_PASSWORD`.

## Develop

```
npm run dev:api         # http://localhost:4100 (API)
npm run dev:web         # http://localhost:5173 (app; /api is proxied to 4100)
```

## Production (one server, works offline on the LAN)

```
npm run build           # builds apps/web/dist
npm start -w @platform/api   # serves the API and the app on http://<this-pc>:4100
```

## Checks

```
npm test                # API tests (login, sessions, branch isolation, permissions, patients)
npm run typecheck
npm run build
```

## Database changes

Edit `apps/api/src/db/schema.ts` (or `packages/core/src/db/schema.ts`), then
`npm run db:generate -w @platform/api` and commit the new file in `apps/api/drizzle/`.
Migrations run automatically when the server starts.

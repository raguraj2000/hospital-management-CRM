# AGENTS.md — rules for every agent working in this repo

Reusable B2B multi-branch platform (first product: a clinic). See README.md for layout and commands.

## Rules that must stay true

- **Every business record is branch-scoped.** Product tables spread `branchColumns` and every
  query filters by the branch from `branchContext`. Nothing is shared between branches.
  Another branch's record must answer exactly like a missing one (404).
- Branch routes live under `/api/b/:branch/*` behind `requireAuth` + `branchContext`, and each
  route declares `requirePermission(...)`. The UI only hides things; the server decides.
- Sessions are httpOnly cookies; only a sha256 of the token is stored. Never put a token in
  localStorage or send it in a response body.
- Every API error is `{ error, code, fields? }` via `AppError`. No stack traces to clients.
- Input is validated with the shared Zod schemas in `packages/shared` (same rules in browser and API).
- Deletes are soft (`deleted_at`); create/update/delete write to `audit_log`.
- `packages/core`, `packages/ui`, `packages/shared` core parts must not import product (clinic) code.
- Offline-first: no CDN links, no runtime downloads, no telemetry.

## How to work

- Schema changes: edit the Drizzle schema, run `npm run db:generate -w @platform/api`, never edit
  an applied migration. Ask the user before schema changes.
- Add tests for every new branch-scoped route: one proving another branch can't read/write it.
- Before saying done: `npm test`, `npm run typecheck`, `npm run build` — show the output.
- Simplest thing that works; mark shortcuts with `// TODO(shortcut): <reason>`.
- Never commit `*.db`, `data/`, `.env*`, `node_modules/`, `dist/`.

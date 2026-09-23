# AGENTS.md — rules for every agent and subagent working in this repo

This is the Aadhi Hospital clinic system: a Hono + SQLite server (`apps/server`),
a Tauri + React desktop client (`apps/client`), shared types (`packages/shared`),
and offline PowerShell install/backup scripts (`scripts/`). It holds **real
patient data** at the clinic, and the developer cannot reach the clinic PC
remotely. When in doubt, stop and ask instead of guessing.

## 1. Never do these

- **Never delete, overwrite, move, or "clean up" patient data**, whether live or
  a backup:
  - `C:\Aadhi Hospital\` (the live install on this PC; the `ClinicSystemServer`
    service runs from it)
  - `C:\Aadhi Hospital\apps\server\data\` (live `clinic.db` and `backups\`)
  - `C:\Aadhi Hospital\update-backups\`
  - `handoff\*.db`, `handoff\laptop-data-backup-*\`
- **Never touch the pendrive** (removable drive, usually `D:`). Only read it if the
  user explicitly asks you to.
- **Never commit** `*.db`, `*.db-wal`, `*.db-shm`, `data/`, `handoff/`, `.env*`,
  `node_modules/`, `dist/`, or `src-tauri/target/`. Check `git diff --cached --name-only`
  before every commit.
- **Never overwrite `clinic.db` while anything has it open.** Stop the service
  first, and make sure nothing is listening on port 3001. Overwriting a locked DB
  corrupted it once.
- **Never let the app or scripts start their own `node dist/index.js`** on a real
  install. Only the Windows service runs the server.
- **Never run plain `npm rebuild better-sqlite3`.** It rebuilds against Node
  ≥ 24.19 headers, which brings back the `Assertion failed: (env) != nullptr` crash
  (nodejs/node#65446). Always use:
  ```
  npm_config_target=24.18.1 npm_config_build_from_source=true npm rebuild better-sqlite3
  ```
  Then confirm with `node scripts/check-native-gc.cjs`, which must survive.
  (DEVELOPER.md still shows the plain command; this rule overrides it.)
- **Never git push, deploy to `C:\Aadhi Hospital`, restart/stop the service, or
  run migrations against the live DB** without the user's explicit OK in the
  current conversation.

## 2. Offline-first

The clinic PC has **no internet**. Anything shipped must install and run fully
offline from the pendrive (`scripts/one-click-install.ps1`). Don't add CDN
links, runtime downloads, cloud services, or telemetry.

## 3. Database changes

- Schema changes only go in a **new** numbered file in `apps/server/migrations/`
  (next after the highest existing number). Never edit an existing migration;
  clinics already have them applied.
- Migrations must be additive and safe on existing real data (no dropping
  columns or tables that hold data, and give new NOT NULL columns defaults).
- Records are soft-deleted, not hard-deleted.
- Updates must back up the DB before touching it (the install scripts already
  do this; keep it that way).
- Ask the user before any schema change. It's expensive to reverse.

## 4. Business rules that must stay true

- Exactly **one Admin account** (the seeded `admin`). No endpoint or UI may create
  another Admin, change the Admin's role, or promote anyone to Admin.
- Money is handled via `apps/client/src/lib/money.ts` helpers (no ad-hoc float math).
- Pharmacy stock uses FEFO (first-expiry-first-out) batch allocation.
- Destructive actions in the UI use the type-to-confirm `ConfirmDelete` component.

## 5. How to work

- For fixes and features, give a short plan, get the user's answers, then build.
  Prototype first only for brand-new things.
- Simplest thing that works. Only change what was asked, and don't refactor,
  rename, or reformat unrelated code.
- If you don't know something, say "unknown". Don't guess APIs or versions.
- Mark shortcuts with `// TODO(shortcut): <reason>`.
- Match the surrounding code style.

## 6. Verify before saying "done"

Run and show the output:
```
npm run test:server                      # server tests (vitest), all must pass
npm run build:server                     # shared + server typecheck/build
cd apps/client && npm run build          # client typecheck + vite build
```
Add tests for anything that broke or is risky (see `apps/server/tests/`).
Test against a copy of the DB, never the live one. Report failures honestly.
End with a short checklist: what was done, how it was verified, and what's
unverified.

## 7. Subagents

- A subagent follows every rule in this file, the same as the main agent.
- Subagents should do read-only work (search, review, planning) unless the main
  agent explicitly hands them an edit task with a clear scope.
- Subagents never push, deploy, delete files, or touch `C:\Aadhi Hospital` or the
  pendrive. They report back, and the main agent asks the user.
- Keep the subagent count minimal. Don't spawn one for work you can do inline.

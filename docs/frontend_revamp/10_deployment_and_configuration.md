# 10 — Deployment and Environment Configuration

> Environment configuration, build artifacts, offline-first deployment, and operational procedures.

---

## 1. Environment Architecture

The application adheres strictly to offline-first principles. It does not require any external internet access, CDNs, third-party analytics, or remote font downloads at runtime.

| Environment Variable | Scope | Purpose | Default / Example |
|---|---|---|---|
| `PORT` | API | HTTP server listening port | `3000` |
| `DATABASE_URL` | API | LibSQL SQLite database file path | `file:local.db` |
| `NODE_ENV` | Global | Runtime environment | `development` / `production` |
| `VITE_API_URL` | Web | Optional API base URL override | Empty (proxied to same origin `/api`) |

---

## 2. Monorepo Build and Run Scripts

From repository root:

```bash
# Install dependencies
npm install

# Run development servers concurrently
npm run dev:api    # Runs Hono API server on port 3000 with watch mode
npm run dev:web    # Runs Vite dev server on port 5173 with proxy to 3000

# Database migration & seed
npm run seed       # Seeds default organization, branch, owner & demo data

# Run all quality checks
npm run typecheck  # Type check web & api workspaces
npm test           # Run Vitest suite
npm run build      # Compile production build of web application
```

---

## 3. Production Deployment Artifacts

1. **Frontend Distribution:**
   - Command: `npm run build -w @platform/web`
   - Output: `apps/web/dist/` containing pre-rendered static assets, optimized JavaScript chunks, CSS, and vendored Inter font assets.
   - Hosted directly via the Hono API static file server or an internal Nginx instance.
2. **Database & Persistence:**
   - Single-file LibSQL/SQLite database stored in persistent local volume.
   - Automated daily backup snapshots enabled via Settings > Backup.


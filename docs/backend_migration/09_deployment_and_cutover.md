# 09. Deployment, Observability & Cutover Plan

## 1. Production Runtime Architecture

```text
Reverse Proxy (NGINX / Cloudflare)
       │ HTTPS (:443)
       ▼
Uvicorn / Gunicorn ASGI Workers (:8000)
       │
       ├─ /health/liveness  -> 200 OK (Process responsive)
       ├─ /health/readiness -> Checks DB connection pool & migrations
       │
       ▼
PostgreSQL Primary Cluster (:5432)
```

---

## 2. Docker & Container Specification

A multi-stage container build minimizes attack surface and runtime size:
- Base: `python:3.12-slim-bookworm`
- Non-root user: `hms:hms` (UID 10001)
- Production command:
  ```bash
  gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 60
  ```

---

## 3. Observability & Logging Standards

1. **Correlation IDs**:
   Every request is tagged with a UUID4 `X-Correlation-ID` header, propagated through all log lines.
2. **Structured JSON Logs**:
   In production, logs are emitted as structured JSON containing timestamp, log level, correlation ID, user ID, company ID, branch slug, and duration.
3. **No Secret Leakage**:
   Passwords, cookie hashes, tokens, and patient clinical records are scrubbed from log outputs.

---

## 4. Cutover Procedure & Rollback

1. **Parallel Run**:
   Deploy the FastAPI backend to staging on port `8000`. Direct 10% of read traffic via API gateway to verify contract compatibility.
2. **Data Consistency Check**:
   Validate sequence generators (`branch_counters`, `uhid`, `invoice_no`) to ensure continuity from SQLite/legacy data.
3. **Final Switchover**:
   Update NGINX upstream to route `/api/*` to the FastAPI cluster.
4. **Instant Rollback Plan**:
   In the event of critical regressions, re-point NGINX upstream back to the Node.js Express service (`:3001`).


# 08 — Security and Permissions Architecture

> Threat model, authentication boundary, data protection, and defense-in-depth principles.

---

## 1. Core Security Model

**The frontend is not an authorization boundary.** The frontend only adapts presentation and navigation to make staff workflows seamless and prevent accidental invalid requests. The server re-evaluates all session tokens, permissions, branch context, and input schemas on every API call.

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Untrusted)                    │
│  - Presentation layer only                                  │
│  - Reads permissions from GET /auth/me                      │
│  - Hides unauthorized menus / buttons                       │
│  - Strictly NO tokens in localStorage                       │
│  - Credentials: 'include' with httpOnly cookie              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS + Same-Origin
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Authoritative)               │
│  - requireAuth: validates SHA-256 session hash               │
│  - branchContext: validates branch ID belongs to user's org │
│  - requirePermission: enforces operation permission         │
│  - Zod validation: validates all payload structures         │
│  - Soft-deletes + audit_log written for all mutations       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Lifecycle & Cookie Protections

1. **Cookie Configuration:**
   - Name: `sid`
   - Attributes: `HttpOnly; SameSite=Lax; Path=/; Secure (in HTTPS)`
   - Never accessible via `document.cookie` or client JavaScript (immune to XSS token theft).
2. **Session Hash:**
   - Server computes `sha256(token)` before DB lookup.
   - Database breaches cannot leak actionable raw bearer tokens.
3. **Session Expiry & Revocation:**
   - Default TTL: 12 hours (standard single shift).
   - Password changes or explicit logout immediately revoke active sessions in the database.
   - HTTP 401 response invokes `onUnauthenticated()`, clearing all cached queries in TanStack Query and redirecting to `/login`.

---

## 3. Network Lock & Branch Isolation

- Hospitals can enforce network locks (`allowedNetworks` CIDR block per branch).
- Outside users receive an explicit `outside_network` code, rendering an immediate blocked state.
- Branch context (`/:branch`) in the URL is verified server-side against the authenticated user's organization. Attempting to tamper with the URL branch slug to access another branch or organization results in a 404 or 403 response.

---

## 4. XSS & Dynamic Content Sanitation

1. **No Trusted HTML Injection:** Never use `dangerouslySetInnerHTML` for user-entered notes, complaints, doctor findings, or backend responses.
2. **Dynamic UI Safety:** Field rendering only instantiates known, whitelisted components from `FIELD_REGISTRY`. No dynamically generated JavaScript or script tags are ever evaluated.
3. **CSP & Security Headers:** `securityHeaders()` middleware enforces strict framing protections, X-Content-Type-Options, and Referrer-Policy.


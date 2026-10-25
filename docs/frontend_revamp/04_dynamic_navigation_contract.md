# 04 — Dynamic Navigation Contract

> How the frontend obtains enabled modules and builds the navigation menu.

---

## 1. Design Decision: Controlled Frontend Registry

After inspecting the actual codebase, **the navigation menu is and should remain a controlled frontend constant**, not a backend-provided JSON blob.

**Rationale:**
1. The frontend controls which page components exist. Unknown page IDs from a backend config would have nowhere to render.
2. All access control is enforced server-side on every API call regardless of what the frontend displays.
3. The current approach (filter `NAV` by `permissions` at runtime) already satisfies the requirement: a user only sees what they're allowed, and the backend refuses unauthorized requests.
4. Adding a backend nav-config endpoint would create a new attack surface with no security benefit (the server already enforces permissions on every route).

**What the backend controls:**
- Which modules are enabled (`organization.modulesOff` in `MeResponse`).
- Which permissions a user has in a branch (`branch.permissions` in `MeResponse`).
- Badge counts per page (`GET /api/b/:branch/nav-counts`).

**What the frontend registry controls:**
- Which page identifiers exist.
- Which component renders for each identifier.
- The label, icon, group, and ordering of each menu item.
- Which permission is required to see/access each item.
- Which module key (if any) must be enabled for the item to appear.

---

## 2. Navigation Data Flow

```
User signs in (POST /auth/login)
        │
        ▼
Server sets httpOnly sid cookie
        │
        ▼
Frontend calls GET /auth/me → MeResponse
  { user, organization.modulesOff, branches[{ slug, permissions[] }] }
        │
        ▼
useNavItems(branch, modulesOff) filters NAV array:
  • branch.permissions.includes(item.permission)
  • !modulesOff.includes(item.moduleKey)       [if moduleKey is set]
  • !(item.foldedWith && branch.permissions.includes(item.foldedWith))
        │
        ▼
AppShell renders only the permitted items
        │
        ▼
Every 15 s: GET /b/:branch/changes → version bump
  If version changed → TanStack Query invalidates all branch queries
        │
        ▼
GET /b/:branch/nav-counts → badge numbers per page key
```

---

## 3. NavItem Shape (Enhanced)

```ts
// apps/web/src/core/navigation/nav.ts

import type { ModuleKey, Permission } from '@platform/shared';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  /** URL path segment under /:branch — empty string = dashboard (index route). */
  path: string;
  /** Sidebar and page title label. */
  label: string;
  /** Lucide icon identifier. */
  icon: LucideIcon;
  /** User must have this permission in the branch to see and access this page. */
  permission: Permission;
  /** Sidebar group heading. */
  group: 'Overview' | 'Clinic' | 'Manage';
  /** Module that must be ON for this item to appear. Permission alone may not be enough. */
  moduleKey?: ModuleKey;
  /** Show in the mobile bottom bar (max 4 items). */
  primary?: boolean;
  /** Not yet built: rendered with a "Soon" badge. */
  soon?: boolean;
  /**
   * Hidden for users who have this other permission — because for them
   * this page is a tab inside another page (e.g., Vendors is a tab of Inventory).
   */
  foldedWith?: Permission;
  /**
   * The key used in nav-counts response to badge this item.
   * Defaults to `path` when not set.
   */
  countKey?: string;
}
```

---

## 4. `useNavItems` Hook

```ts
// apps/web/src/core/navigation/useNavItems.ts

import type { MeBranch, ModuleKey } from '@platform/shared';
import { NAV, type NavItem } from './nav';

export function useNavItems(
  branch: MeBranch | null,
  modulesOff: ModuleKey[],
): NavItem[] {
  if (!branch) return [];
  return NAV.filter((n) => {
    // Must have the required permission.
    if (!branch.permissions.includes(n.permission)) return false;
    // Module must be enabled (if the item declares one).
    if (n.moduleKey && modulesOff.includes(n.moduleKey)) return false;
    // Folded: this page is a tab inside another page for users with the other permission.
    if (n.foldedWith && branch.permissions.includes(n.foldedWith)) return false;
    return true;
  });
}
```

---

## 5. Route Registry (Page Resolver)

Routes are registered **statically** in the router. Only registered routes can be navigated to. Backend-provided identifiers (future nav-config) must be resolved through this registry before use — arbitrary strings cannot become routes.

```ts
// apps/web/src/app/router.tsx

const PAGE_REGISTRY: Record<string, React.LazyExoticComponent<...>> = {
  '':           lazy(() => import('@/modules/dashboard/DashboardPage')),
  'visits':     lazy(() => import('@/modules/visits/OpVisitsPage')),
  'patients':   lazy(() => import('@/modules/patients/PatientsPage')),
  'billing':    lazy(() => import('@/modules/billing/BillingPage')),
  'pharmacy':   lazy(() => import('@/modules/pharmacy/PharmacyPage')),
  'lab':        lazy(() => import('@/modules/laboratory/LabPage')),
  'inventory':  lazy(() => import('@/modules/inventory/InventoryPage')),
  'treatments': lazy(() => import('@/modules/treatments/TreatmentsPage')),
  'reports':    lazy(() => import('@/modules/reports/ReportsPage')),
  'settings':   lazy(() => import('@/modules/settings/SettingsPage')),
  // ...
};
```

An unknown path that is not in this registry renders the "Not found" state — never an arbitrary component.

---

## 6. Menu Badge Counts

`GET /api/b/:branch/nav-counts` returns:
```json
{
  "enabled": true,
  "counts": {
    "visits":     5,
    "billing":    3,
    "pharmacy":   2,
    "lab":        7,
    "treatments": 1
  }
}
```

- `enabled: false` — counts feature switched off in Settings; frontend stops polling.
- The key matches `NavItem.countKey ?? NavItem.path`.
- Counts are fetched after login and refreshed when `changes` version bumps.

---

## 7. Module Gating Rules

| Rule | Enforcement |
|---|---|
| A module that is off in `modulesOff` hides its menu items | Frontend (`useNavItems`) |
| A module that is off removes its permissions from the user's permission list | Backend (`withoutModules` in `branchesFor`) |
| Every protected API operation checks the permission server-side | Backend middleware (`requirePermission`) |
| Bookmarking a URL of a disabled module navigates to it; `RequirePermission` shows "No access"; the API returns 403 | Both layers |
| The frontend never trusts `modulesOff` as the only gate — the API always re-checks | Backend |

---

## 8. Supported Module Keys

Defined in `packages/shared/src/index.ts`:

```ts
export const MODULES = [
  { key: 'lab',     label: 'Lab',               permissions: ['lab.order', 'lab.view', 'lab.correct'] },
  { key: 'courses', label: 'Treatment courses',  permissions: [] },
] as const;
```

**Future modules** (to be added when the backend supports them):
- `appointments` — Appointment booking
- `reports` — Standalone Reports module (platform admin can disable)

Adding a new module requires:
1. Add entry to `MODULES` in `packages/shared`.
2. Run `npm run db:generate -w @platform/api` if schema changes.
3. Add `moduleKey` to relevant `NavItem` entries.
4. The platform admin console (`/platform`) will automatically show the new toggle.

---

## 9. Security Rules

1. **Never execute JavaScript from backend config.** Navigation config is static TypeScript.
2. **Never render arbitrary page identifiers.** All route paths are in `PAGE_REGISTRY`.
3. **Never accept remote URLs as internal routes.** `navigate()` only accepts registered paths.
4. **Never show unauthorized items.** Filter by actual permissions from `MeResponse`.
5. **Never trust frontend menu visibility as authorization.** The API re-checks on every call.
6. **Never cache `modulesOff` indefinitely.** Re-fetch `MeResponse` when stale (5-minute stale time).
7. **Clear nav state on logout.** `queryClient.clear()` on logout removes all cached data including `me`.


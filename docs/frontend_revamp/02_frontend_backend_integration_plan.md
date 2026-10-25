# 02 — Frontend–Backend Integration Plan

> Phase 1 output | Execution of frontend-design.md

---

## 1. Clarification: "FastAPI" vs. Actual Backend

The `frontend-design.md` spec references a "FastAPI backend migration." **That migration has already resolved into a different stack.** The active backend is:

- **Framework:** Hono v4 (TypeScript)
- **ORM:** Drizzle ORM
- **Database:** LibSQL / SQLite (via `@libsql/client`)
- **Auth:** httpOnly cookie `sid`, SHA-256 hashed in DB

The `src/` Python directory contains a legacy skeleton that is **not running in production**. All integration work targets `apps/api`.

---

## 2. Current Integration State

The frontend already integrates correctly with the Hono API on these concerns:

| Concern | Status |
|---|---|
| Auth (login/logout/me) | ✅ Working |
| Branch-scoped routes `/api/b/:branch/*` | ✅ Working |
| Permission-gated page rendering | ✅ Working (UI layer) |
| Module on/off (`modulesOff` from MeResponse) | ✅ Partial (only `lab` and `courses`) |
| Nav count badges (polling) | ✅ Working |
| Change detection (15s polling) | ✅ Working |
| Error normalization | ✅ Working |
| Print routes | ✅ Working |

---

## 3. Architecture Target

The revamp does **not** replace the framework or major dependencies. It restructures the existing working codebase to achieve the goals in `frontend-design.md`.

### Target directory layout

```
apps/web/src/
├── app/
│   ├── App.tsx              — Root providers
│   ├── router.tsx           — createBrowserRouter (moved from main.tsx)
│   └── layouts/
│       ├── AppShell.tsx     — Refactored from components/AppShell.tsx
│       └── PrintLayout.tsx  — Wrapper for /print routes
│
├── core/
│   ├── api/
│   │   └── client.ts        — Existing client (minor additions: AbortSignal threading)
│   ├── auth/
│   │   ├── hooks.ts         — useMe, useLogin, useLogout, useBranch, useCan, useModuleOn
│   │   └── RequirePermission.tsx
│   ├── navigation/
│   │   ├── nav.ts           — NAV array stays; enhanced with moduleKey field
│   │   └── useNavItems.ts   — Filters NAV by permissions + modulesOff at runtime
│   ├── permissions/
│   │   └── index.ts         — Re-export useCan, useModuleOn; canDo helper
│   └── feature-config/
│       └── index.ts         — useModuleOn wrapper; future: fetch module config
│
├── components/              — Keep existing; reorganize into sub-folders
│   ├── ui/                  — Primitives re-exported from @platform/ui
│   ├── forms/               — Reusable form building blocks
│   ├── tables/              — DataTable, ServerTable
│   ├── dialogs/             — Common dialog patterns
│   ├── feedback/            — Loading skeletons, empty states, error states
│   └── layout/              — PageHeader, Section, Breadcrumb
│
├── dynamic-ui/              — NEW: configuration-driven rendering engine
│   ├── field-registry/      — Supported field type map
│   ├── form-renderer/       — <DynamicForm config={...} />
│   ├── table-renderer/      — <DynamicTable config={...} />
│   ├── filter-renderer/     — <DynamicFilters config={...} />
│   └── config-validation/   — Zod schemas for engine configs
│
├── modules/
│   ├── dashboard/
│   ├── patients/
│   ├── visits/
│   ├── laboratory/
│   ├── pharmacy/
│   ├── billing/
│   ├── inventory/
│   ├── treatments/
│   ├── reports/             — NEW standalone Reports module
│   ├── settings/
│   └── platform/
│
├── hooks/                   — Generic reusable hooks
├── utils/                   — Pure utility functions
├── types/                   — Shared frontend types
└── styles/                  — Tailwind entry, design tokens
```

---

## 4. Migration Strategy

### Principle
**Refactor in place, not rewrite.** Move existing working code into the new structure module by module. Preserve all current business logic. Each phase must leave the application working.

### Phase sequence

```
Phase 1 (Now)   → Discovery + documentation (this file)
Phase 2         → Shared foundation (API client enhancement, core/ extraction)
Phase 3         → Navigation enhancement (moduleKey gating, runtime filtering)
Phase 4         → Dynamic UI engine (field registry, form renderer, table renderer)
Phase 5         → Reports module (standalone, backend-driven)
Phase 6         → Module migration (move pages into modules/)
Phase 7         → Visual refinement (design tokens, accessibility)
Phase 8         → Verification + release
```

---

## 5. Phase 2 — Shared Foundation

### 2a. API client additions
- Thread `AbortSignal` from TanStack Query through `api.get()` for cancellation.
- Add `api.getBlob()` for export downloads.
- Document retry behaviour in JSDoc.

### 2b. Core extraction
Move `state/auth.ts` → `core/auth/hooks.ts` (no behaviour change).  
Move `api/client.ts` → `core/api/client.ts` (no behaviour change).  
Update all imports with path aliases.

### 2c. Path aliases
Add to `vite.config.ts` and `tsconfig.json`:
```ts
'@/core'       → 'src/core'
'@/modules'    → 'src/modules'
'@/components' → 'src/components'
'@/dynamic-ui' → 'src/dynamic-ui'
```

### 2d. Design tokens
Audit existing Tailwind CSS variables in `index.css`. Document the token set. Do not replace existing tokens that are already working.

---

## 6. Phase 3 — Navigation Enhancement

### Current nav.ts gap
The `NAV` array has no `moduleKey` field. Module gating is done only via `permission` (e.g., `lab.view`). When the platform admin turns off the `lab` module, `withoutModules()` removes `lab.view` from the permissions, so the lab menu item disappears — this already works. No structural change is needed for the two existing modules.

### Enhancement required
Add an optional `moduleKey?: ModuleKey` field to `NavItem`. When present, `useNavItems()` also checks `useModuleOn(key)`. This prepares for future modules that may not tie cleanly to a single permission.

```ts
// core/navigation/useNavItems.ts
export function useNavItems(branch: MeBranch | null, modulesOff: ModuleKey[]) {
  return NAV.filter((n) => {
    if (!branch?.permissions.includes(n.permission)) return false;
    if (n.moduleKey && modulesOff.includes(n.moduleKey)) return false;
    if (n.foldedWith && branch.permissions.includes(n.foldedWith)) return false;
    return true;
  });
}
```

### Backend nav-config contract (gap)
The backend does **not** currently expose a navigation configuration endpoint. The `GET /api/b/:branch/nav-counts` endpoint returns badge counts but not menu structure. 

**Decision:** Keep the frontend `NAV` array as the menu registry (it is a controlled frontend constant, not customer config). The backend controls access via permissions and `modulesOff`. This satisfies the security requirement without adding an unnecessary API endpoint.

**Future:** If a customer needs truly custom menus (different labels, reordering), add `GET /api/b/:branch/nav-config` returning overrides. Document this as a known gap (see `11_known_gaps_and_decisions.md`).

---

## 7. Phase 4 — Dynamic UI Engine

### Scope
The dynamic form engine handles data-entry workflows that share the same interaction patterns (patient registration, lab orders, billing charges, inventory). It does **not** replace pages with unique UX (e.g., the prescription writer, the lab result entry grid).

### Field registry
```ts
// dynamic-ui/field-registry/index.ts
export const FIELD_REGISTRY = {
  text:         TextInput,
  textarea:     TextareaInput,
  number:       NumberInput,
  select:       SelectInput,
  async_select: AsyncSelectInput,
  date:         DateInput,
  checkbox:     CheckboxInput,
  radio:        RadioGroupInput,
  currency:     CurrencyInput,
} as const satisfies Record<string, ComponentType<FieldProps>>;
```

Only registered field types can be rendered. Unknown types show a safe fallback with a dev warning.

### Form configuration shape
```ts
interface DynamicFormConfig {
  version: 1;
  sections: Array<{
    id: string;
    title?: string;
    fields: FieldConfig[];
  }>;
  actions: Array<{ id: string; label: string; kind: 'submit' | 'cancel' | 'reset' }>;
}
```

Configs are validated with Zod before rendering. Invalid configs log diagnostics and show a safe error state.

---

## 8. Phase 5 — Reports Module

### Architecture
```
modules/reports/
├── pages/
│   ├── ReportsHome.tsx      — Report catalog grid
│   └── ReportViewer.tsx     — Single reusable viewer
├── components/
│   ├── ReportFilters.tsx    — Dynamic filter bar from report definition
│   ├── ReportTable.tsx      — Server-paginated results table
│   ├── ReportSummary.tsx    — Totals / aggregate row
│   └── ReportExport.tsx     — Download button (PDF, CSV where supported)
└── types.ts                 — ReportDefinition, ReportFilter types
```

### Backend gap
There is currently **no** `/api/b/:branch/reports` endpoint. The existing reporting pages (`LabPeriodReport.tsx`, `PeriodReport.tsx`) call specific endpoints like `/b/:branch/billing/period-report` directly.

**Action required:** Define the report catalog API contract and implement it in `apps/api`. The frontend Reports module will consume it. See `06_reports_module_architecture.md` for the full contract spec.

---

## 9. Breaking Changes & Migration Dependencies

| Change | Risk | Mitigation |
|---|---|---|
| Move `state/auth.ts` → `core/auth/hooks.ts` | Low | Update all imports; TypeScript catches misses |
| Move `api/client.ts` → `core/api/client.ts` | Low | Same; path alias makes it transparent |
| Restructure `components/` into sub-folders | Low | Move files; update imports |
| Add `moduleKey` to `NavItem` | None | Additive / optional field |
| Dynamic form engine (new files) | None | Additive |
| Reports module (new files + new API) | Medium | Requires new backend endpoints |
| Remove scattered report pages | Medium | Only after centralized equivalent is verified |

---

## 10. Acceptance Criteria per Phase

### Phase 2 done when
- [ ] `npm run typecheck` passes with zero errors after restructuring.
- [ ] `npm run build` succeeds.
- [ ] All existing pages and workflows continue to function.
- [ ] Path aliases resolve correctly.

### Phase 3 done when
- [ ] `useNavItems` is used in `AppShell` instead of inline filter.
- [ ] A branch with `lab` module off sees no Lab menu item.
- [ ] A user without `billing.receive` sees no Billing menu item.
- [ ] Tests cover `useNavItems` filtering logic.

### Phase 4 done when
- [ ] `DynamicForm` can render at least: text, number, select, async_select, date fields.
- [ ] Unknown field types render a safe fallback, not a crash.
- [ ] Field-level and form-level API errors surface correctly.
- [ ] Unit tests cover the field registry and config validation.

### Phase 5 done when
- [ ] Reports home lists all reports returned by `GET /api/b/:branch/reports/catalog`.
- [ ] `ReportViewer` renders filters and results for any catalog report without a custom page.
- [ ] Existing `LabPeriodReport` and `PeriodReport` link to the central viewer.
- [ ] Permission check prevents unauthorized report access.
- [ ] At least one export format works end-to-end.

### Phase 6 done when
- [ ] All pages live under `modules/`.
- [ ] No dead code from old `pages/` or `components/` directories.
- [ ] `npm test` (API) passes.
- [ ] E2E smoke tests pass.

### Phase 7–8 done when
- [ ] Design is consistent across all modules.
- [ ] WCAG 2.2 AA key issues resolved (focus management, contrast, labels).
- [ ] Production build is clean.
- [ ] All known gaps are documented.


# MASTER PROMPT — HMS FRONTEND REVAMP
## Backend-Driven Modular Hospital Management System | FastAPI Integration | Production-Grade Implementation

## 1. Your Role

Act as a Principal Frontend Architect, Senior UI/UX Engineer, Full-Stack Integration Engineer, Accessibility Specialist, and Application Security Engineer.

The HMS backend migration to Python/FastAPI has been completed. Your responsibility is to revamp the existing frontend and integrate it properly with the new backend.

This is a major frontend architecture improvement, not just a visual redesign.

You must inspect the existing frontend, understand its modules and current workflows, inspect the new FastAPI backend and its OpenAPI contract, and implement a modular, configurable, secure, production-quality frontend.

**Work directly in the existing repository. Do not create a disconnected demo, a static mockup, or a second application that is not integrated with the actual backend.**

The final system must support modular hospital deployments, backend-driven navigation, reusable dynamic forms, a completely separate Reports module, and a polished interface suitable for daily clinical and administrative use.

---

## 2. Business Vision

The HMS contains multiple independently deployable functional modules, including:

- Dashboard
- Patient Management
- Doctor and Clinical Workflows
- Visits and Consultations
- Waiting Queue
- Laboratory
- Pharmacy
- Billing and Payments
- Inventory
- Appointments
- Reports
- Organization and Branch Administration
- Users, Roles, and Permissions
- Configuration and Audit

The list above is illustrative. Inspect the actual backend and current frontend before deciding the final modules.

The architecture must support future deployments where an organization enables only selected modules, such as:

- Laboratory only.
- Pharmacy only.
- Laboratory and Pharmacy.
- Billing and Pharmacy.
- A complete hospital deployment.

The frontend must adapt to the modules enabled for the current organization without requiring hardcoded menu changes, separate frontend builds, or manual code modifications for every customer.

### Core principle

**The backend determines availability and authorization. The frontend renders the permitted configuration using reusable, controlled components.**

Do not hardcode organization-specific modules, menus, form fields, reports, or module permissions in frontend source code.

Frontend code may contain reusable components, page renderers, design tokens, and a controlled registry of supported component types. It must not contain customer-specific configuration or act as the source of truth for access control.

---

## 3. Mandatory Initial Inspection

Before changing files, inspect the actual repository.

Identify:

1. Current frontend framework, version, build tool, and package manager.
2. Existing application entry points and routing.
3. Current module structure.
4. Existing UI component library and design system.
5. Existing forms, tables, dashboards, dialogs, and report pages.
6. API clients and current backend integration.
7. Authentication, token/session handling, and user context.
8. Organization, region, branch, and inventory selection flows.
9. Current frontend state management.
10. Existing tests, lint rules, accessibility checks, and build scripts.
11. Existing API contracts and the new FastAPI OpenAPI specification.
12. Existing hardcoded menus, mock data, field definitions, report configurations, and permission checks.
13. Existing patient, laboratory, pharmacy, billing, visit, and waiting queue workflows.

Create:

`docs/frontend_revamp/01_current_state_assessment.md`

Then create:

`docs/frontend_revamp/02_frontend_backend_integration_plan.md`

The documents must identify the existing implementation, the desired architecture, breaking changes, migration dependencies, and a phased implementation plan.

Do not replace the existing frontend framework or major dependencies without first determining whether the current stack can meet the requirements.

Preserve existing working functionality during migration.

---

## 4. Required Frontend Architecture

Retain the existing framework unless inspection identifies a compelling reason to change it.

Use a modular structure appropriate to the actual project. If the current stack supports it, target a structure similar to:

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers/
│   │   └── layouts/
│   │
│   ├── core/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── organization/
│   │   ├── permissions/
│   │   ├── feature-config/
│   │   ├── navigation/
│   │   ├── error-handling/
│   │   └── observability/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── dialogs/
│   │   ├── feedback/
│   │   └── layout/
│   │
│   ├── modules/
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── visits/
│   │   ├── waiting-queue/
│   │   ├── laboratory/
│   │   ├── pharmacy/
│   │   ├── billing/
│   │   ├── inventory/
│   │   ├── appointments/
│   │   ├── reports/
│   │   ├── organization/
│   │   └── administration/
│   │
│   ├── dynamic-ui/
│   │   ├── page-renderer/
│   │   ├── form-renderer/
│   │   ├── field-registry/
│   │   ├── table-renderer/
│   │   ├── filter-renderer/
│   │   ├── action-renderer/
│   │   └── config-validation/
│   │
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── styles/
│   └── tests/
│
└── ...
```

Treat this as an architectural target, not permission to create empty directories or duplicate existing modules.

Follow the project's actual naming conventions and framework. Use TypeScript if the existing frontend is TypeScript-based; if it is JavaScript, assess the migration effort and introduce strong typing incrementally where appropriate.

### Separation of responsibilities

- `core/api/`: centralized HTTP client and API integration.
- `core/auth/`: authentication lifecycle and current-user context.
- `core/organization/`: organization and operational context.
- `core/permissions/`: frontend capability evaluation for presentation and navigation.
- `core/feature-config/`: enabled module and UI configuration retrieval.
- `core/navigation/`: backend-driven menu processing.
- `components/`: reusable UI components.
- `modules/`: module-specific workflows.
- `dynamic-ui/`: reusable rendering of validated backend-provided configurations.
- `hooks/`: reusable framework hooks.
- `utils/`: pure, generic utility functions.
- `types/`: shared frontend types and API contract types.

Do not create a second API client, duplicate authentication state, or duplicate feature configuration across modules.

---

## 5. FastAPI Backend Integration

The new FastAPI backend is the authoritative source for API behavior and data.

Inspect its actual routes, authentication requirements, response formats, pagination conventions, error formats, and OpenAPI specification before integrating.

Create a centralized API client that handles:

- Base URL configuration.
- Authentication and session handling.
- Request and response typing.
- Correlation/request identifiers when supported.
- Standard error normalization.
- Network failure handling.
- Request cancellation where appropriate.
- Timeouts where appropriate.
- Safe retry behavior for eligible operations.
- Pagination and filtering conventions.
- Consistent loading and error states.
- API versioning.
- Development and production environment configuration.

Use the actual authentication mechanism implemented by the backend. Do not assume JWT, cookies, or any specific token mechanism without inspecting it.

Never hardcode production API URLs, credentials, secrets, or organization-specific identifiers.

### API contract requirements

- Use FastAPI's actual OpenAPI specification to generate or validate frontend API types where practical.
- Avoid manually duplicating complex API response interfaces when they can be generated reliably.
- Never invent endpoints to make a page appear functional.
- Never substitute mock data for real API responses in production workflows.
- Identify missing endpoints explicitly.
- If an endpoint is unavailable, document the dependency rather than silently simulating a successful operation.
- Preserve compatibility with the backend's actual request and response contracts.

Create:

`docs/frontend_revamp/03_api_integration_matrix.md`

Map each frontend workflow to its actual API endpoints, authentication requirements, permissions, request/response types, and outstanding backend dependencies.

---

## 6. Backend-Driven Modules and Navigation

This is one of the highest-priority requirements.

The frontend must obtain the available modules and menus from the backend at runtime.

Implement the following conceptual flow:

```text
User signs in
     |
     v
Load authenticated user and active organization
     |
     v
Fetch enabled modules and navigation configuration
     |
     v
Fetch or resolve applicable permissions
     |
     v
Validate configuration and resolve supported routes
     |
     v
Render the permitted navigation
     |
     v
Load selected module and its authorized page
```

Use the actual backend API contract. If the backend does not expose a required configuration endpoint, document the gap and propose the required contract instead of assuming it exists.

### Menu configuration should support

- Module identifier.
- Module display name.
- Icon identifier.
- Navigation item label.
- Relative route or page identifier.
- Parent and child menu relationships.
- Ordering and grouping.
- Visibility conditions.
- Required permission identifiers.
- Optional badge or count configuration.
- Enabled/disabled state.
- Localization keys where supported.
- Applicable organization or deployment scope where supported.

The backend must determine which modules an organization has enabled and which menu items the authenticated user can access.

The frontend may filter menu visibility for usability, but the backend must enforce access on every protected API operation.

### Example configuration

The following is an illustrative contract only, not an assumption about the current backend:

```json
{
  "modules": [
    {
      "id": "laboratory",
      "label": "Laboratory",
      "icon": "flask",
      "enabled": true,
      "navigation": [
        {
          "id": "lab-orders",
          "label": "Lab Orders",
          "pageId": "laboratory.orders",
          "requiredPermissions": ["lab.orders.read"]
        }
      ]
    }
  ]
}
```

Adapt the contract to the actual backend rather than implementing this exact JSON blindly.

### Dynamic navigation rules

1. Do not hardcode the customer's enabled module list.
2. Do not assume all customers have every module.
3. Do not display unauthorized menu items.
4. Do not trust frontend menu visibility as an authorization control.
5. Do not execute arbitrary JavaScript supplied by the backend.
6. Do not accept arbitrary remote URLs as internal routes.
7. Resolve page identifiers through a controlled frontend route/page registry.
8. Render only supported components and registered page types.
9. Handle unknown modules and configuration versions safely.
10. Show appropriate loading, empty, unavailable, and access-denied states.

When an organization enables only Laboratory, the application should display only the appropriate enabled and authorized functionality without a new frontend build.

---

## 7. Modular Deployment and Feature Configuration

Separate these concepts clearly:

**Module availability:** Is the organization entitled or configured to use this module?

**User authorization:** Is the current user allowed to access this operation?

**Page configuration:** What supported fields, filters, columns, sections, and actions should appear on the page?

**Operational context:** Which organization, region, branch, and inventory is currently selected?

Do not combine them into one boolean flag.

Use the backend's actual module entitlement and authorization model. If the backend lacks the required configuration API, document the required additions.

The frontend must handle:

- A module being enabled or disabled.
- A user's permissions changing.
- An organization switching context.
- A configuration being updated.
- A stale configuration cache.
- A module becoming unavailable.
- An API returning an authorization failure.
- A user opening a bookmarked URL for a disabled module.

Revalidate important access decisions against backend responses. Clear or refresh cached data appropriately when the user logs out or changes organizations.

Never expose a module simply because a route is known to the frontend.

---

## 8. Dynamic Page and Form Rendering Engine

Create a reusable configuration-driven UI engine.

The objective is to avoid manually coding an entirely different form for every data-entry page when the form can be described safely by backend metadata.

The engine should support:

- Page metadata.
- Page title and description.
- Sections and field grouping.
- Labels and help text.
- Input controls.
- Read-only and disabled fields.
- Required-field indicators.
- Field ordering.
- Conditional visibility.
- Default values.
- Backend-provided option lists.
- Dependent dropdowns.
- Date and time controls.
- Numeric and decimal inputs.
- Searchable selection controls.
- Multiline text.
- Checkboxes and radio groups.
- Tables and repeatable field groups where appropriate.
- Field-level error messages.
- Form-level validation errors.
- Submit, cancel, reset, and other supported actions.
- Loading, success, and failure states.
- Permission-controlled action visibility.

### Dynamic field definition

The backend may describe a field through a validated configuration contract similar to:

```json
{
  "id": "patient_id",
  "label": "Patient",
  "type": "async_select",
  "required": true,
  "readOnly": false,
  "dataSource": {
    "type": "api",
    "resource": "patients.search"
  },
  "validation": {
    "maxLength": 50
  }
}
```

This is an example only. Align field definitions with the existing backend and introduce new contracts only when needed.

### Single renderer, multiple workflows

Implement reusable renderers instead of separate hardcoded layouts for every similar page.

For example, the same form engine may render:

- Patient registration.
- Lab order entry.
- Pharmacy dispensing.
- Billing forms.
- Visit documentation.
- Inventory transactions.
- Administrative configuration.

Each page receives a different validated configuration and uses registered field types.

### Strict safety requirements

- Never use `eval`, dynamic code execution, or backend-provided executable scripts.
- Never render backend-supplied HTML as trusted markup.
- Validate configuration shape and version before rendering.
- Allow only known component types.
- Resolve API resources through a controlled registry.
- Allow only approved relative routes or registered page identifiers.
- Reject unknown action types.
- Never allow a configuration to bypass authorization.
- Never use backend-provided field metadata as a replacement for server-side validation.
- Handle invalid configuration with a safe fallback and useful diagnostics.

### Dependent fields

For fields such as organization, region, inventory, doctor, test, medicine, and patient:

- Fetch options from approved APIs.
- Support loading and failure states.
- Clear dependent selections when parent selections change.
- Prevent stale asynchronous results from overwriting current selections.
- Enforce the actual organization and permission scope.
- Avoid loading entire datasets into the browser when server-side search or pagination is appropriate.

---

## 9. Centralized Validation Strategy

Frontend validation improves usability but does not replace FastAPI validation.

Use the backend as the authoritative source for business rules.

The frontend validation layer should support:

- Required values.
- Type and format checks.
- Numeric ranges.
- Date constraints.
- Conditional field requirements.
- Cross-field dependencies.
- Field-level API errors.
- Form-level API errors.
- Clear and accessible error messages.

Do not duplicate complex business logic in individual page components.

If the backend exposes structured validation metadata, map supported constraints into the frontend validation engine. If it does not, implement only safe, documented client-side checks and allow the backend to return authoritative validation errors.

Never assume a successful frontend validation means a transaction is permitted.

---

## 10. Reports Must Become a Completely Separate Module

The current reporting behavior is distributed across functional modules. Refactor it into a standalone Reports module.

**Reports must not be implemented as scattered module-specific reporting pages.**

Clinical and operational modules may provide navigation links to relevant reports, but actual report configuration, filtering, execution, results, history, and export behavior must belong to the Reports module.

The report engine must be reusable and backend-driven.

### Reports module structure

Conceptually:

```text
modules/reports/
├── pages/
│   ├── reports-home
│   ├── report-catalog
│   ├── report-viewer
│   ├── report-history
│   └── scheduled-reports
├── components/
│   ├── report-filters
│   ├── report-results
│   ├── report-table
│   ├── report-summary
│   ├── report-chart
│   └── report-export
└── ...
```

Adapt the implementation to the actual framework.

### Report catalog

The backend should provide the authorized report catalog.

Each report definition should support, where applicable:

- Stable report identifier.
- Report name and description.
- Report category.
- Required permissions.
- Supported filters.
- Default filter values.
- Required parameters.
- Available columns.
- Column labels and formatting.
- Sorting and pagination capabilities.
- Supported visualization types.
- Export capabilities.
- Applicable organization/branch scope.
- Configuration version.

### Single dynamic report page

Implement a reusable report viewer.

The user selects a report, and the page obtains its definition from the backend. The UI then renders the correct filters, inputs, table columns, summaries, and supported visualizations.

The page must not need a custom frontend implementation for every new report, provided that the report uses capabilities already supported by the report renderer and backend contract.

For example, a report may define:

- Start date and end date.
- Organization, region, or inventory.
- Doctor.
- Patient.
- Lab test or status.
- Payment status.
- Grouping and sorting.
- Output columns.
- Summary totals.

The report engine renders only the filters supported by that report.

### Report execution

Use actual backend report APIs. Do not construct arbitrary database queries in the frontend.

The backend must validate filters, enforce authorization, apply tenant and organizational scope, and execute the report safely.

Support, where appropriate:

- Server-side filtering.
- Server-side pagination.
- Sorting using approved field identifiers.
- Large result sets.
- Loading and execution states.
- Empty results.
- API and execution failures.
- Result summaries.
- Approved chart types.
- Export formats actually supported by the backend.
- Report execution history.
- Scheduled reports only if supported by the backend.

Use asynchronous report jobs for large reports if the backend exposes that capability. Do not simulate a background job if none exists.

### Report security

- Recheck report permissions on the backend.
- Enforce organization and branch isolation.
- Validate filter identifiers and values.
- Do not expose arbitrary SQL, file paths, or internal backend implementation details.
- Protect exports with the same scope and permission rules as on-screen results.
- Avoid logging patient data unnecessarily.
- Prevent stale report results from being displayed under a different organization context.

### Reports integration with other modules

Other modules may expose a link such as “View related reports.”

That link should open the centralized Reports module with an approved report identifier and, when supported, prefilled filter values.

It must not create another reporting implementation inside the source module.

If the user lacks permission for the report, the backend and frontend must reject or hide access appropriately.

---

## 11. Hospital-Specific Workflow Requirements

Inspect the existing workflows before redesigning them. Preserve clinical and operational behavior.

### Laboratory

Support the existing laboratory lifecycle, such as order entry, sample collection, status tracking, result entry, verification, and completion where implemented.

Use real backend APIs. Do not invent clinical workflow transitions.

Ensure sensitive results and verification actions are permission-controlled.

### Pharmacy

Support the existing pharmacy workflows, such as medicine search, dispensing, stock visibility, and transaction tracking where implemented.

Respect inventory scope and backend authorization. Avoid allowing duplicate or unintended dispensing operations.

### Billing

Preserve existing invoice, payment, adjustment, and billing workflows.

Display monetary values using the correct decimal precision and currency formatting. Do not recalculate authoritative financial amounts using frontend-only business rules.

Require clear confirmation for consequential actions and handle duplicate submissions safely.

### Doctor Visits and Waiting Queue

Provide usable operational views for the actual visit and waiting workflows.

Where supported, include:

- Patient identification.
- Queue status.
- Wait-time information.
- Doctor or department.
- Visit status.
- Search and filtering.
- Queue refresh or updates.
- Clear workflow actions.

Do not invent real-time capabilities. Use polling, server-sent events, or WebSockets only when supported and appropriate.

### Shared operational context

Respect the organization, region, branch, and inventory relationships established by the backend.

Make the current context visible to the user. Ensure changing context triggers appropriate data refreshes and permission re-evaluation.

Do not let a user access another organization's records by changing a frontend identifier.

---

## 12. Modern UI/UX Requirements

Revamp the frontend into a polished, consistent hospital operations interface.

Avoid the appearance of a generic admin template with disconnected pages.

### Application shell

Implement a responsive application shell with:

- Sidebar navigation driven by backend configuration.
- Collapsible sidebar.
- Clear active navigation state.
- Breadcrumbs.
- Page title and description.
- Organization/context selector where supported.
- User profile and session controls.
- Notifications where supported.
- Consistent content spacing.
- Responsive mobile navigation.

### Design system

Establish reusable design tokens for:

- Typography.
- Spacing.
- Color.
- Borders.
- Radius.
- Elevation.
- Focus states.
- Status indicators.
- Form controls.
- Tables.
- Dialogs.
- Alerts.
- Buttons.
- Empty states.
- Loading indicators.

Use the existing UI library if it is appropriate. Do not install several overlapping UI libraries without a clear reason.

Maintain a restrained, professional clinical-administration visual style. Prioritize readability, data density, clear status communication, and fast repetitive workflows over decorative animations.

### Data tables

Implement reusable tables supporting the features required by the actual workflows:

- Server-side pagination.
- Search.
- Filtering.
- Sorting.
- Column configuration where appropriate.
- Responsive behavior.
- Row-level actions.
- Empty states.
- Loading skeletons.
- Error and retry states.
- Accessible keyboard interaction.

Avoid loading huge datasets into the browser when the backend supports pagination.

### Forms

Forms must have consistent:

- Labels and required indicators.
- Inline validation.
- Keyboard navigation.
- Focus management.
- Submit states.
- Disabled states.
- Error handling.
- Confirmation for destructive or consequential actions.
- Unsaved-change warnings where appropriate.

### Accessibility

Target WCAG 2.2 AA where practical.

Implement:

- Semantic HTML.
- Accessible labels.
- Keyboard navigation.
- Visible focus indicators.
- Appropriate contrast.
- Screen-reader-friendly error messages.
- Accessible dialogs and menus.
- Reduced-motion support.
- Correct focus restoration.

### Responsive behavior

Test desktop, tablet, and mobile layouts.

Prioritize desktop and tablet usability for clinical operations while ensuring essential functions remain usable on smaller screens.

Do not hide critical workflow information on mobile without an appropriate alternative.

---

## 13. Performance and State Management

Use the project's current state-management approach if it remains appropriate. Do not add another state library simply by default.

Implement predictable state handling for:

- Authentication.
- Current organization and operational context.
- Module configuration.
- Navigation configuration.
- API request state.
- Form state.
- Report state.
- Table pagination and filters.

Requirements:

- Avoid duplicate API requests where safe caching is appropriate.
- Invalidate relevant caches after successful mutations.
- Prevent stale responses from overwriting newer data.
- Cancel obsolete requests where supported.
- Keep server state separate from temporary UI state.
- Avoid storing sensitive patient data or credentials unnecessarily in persistent browser storage.
- Clear relevant cached state on logout and context changes.
- Avoid expensive unnecessary re-renders.
- Lazy-load modules and route bundles when appropriate.
- Provide useful loading feedback for slower clinical workflows.

Do not cache authorization decisions indefinitely. Revalidate access when necessary and always rely on the backend for enforcement.

---

## 14. Security Requirements

Treat all backend responses and configuration as untrusted input, even when returned by the authenticated API.

Implement:

- Secure session/token handling appropriate to the backend.
- Protected route handling.
- Permission-aware navigation and actions.
- Safe rendering of dynamic content.
- Controlled route registration.
- Safe URL handling.
- XSS prevention.
- CSRF protections when required by the authentication mechanism.
- Explicit CORS assumptions documented against the actual backend deployment.
- No secrets in frontend source code.
- No unrestricted debug output in production.
- No sensitive data in URL query parameters unless explicitly justified and protected.
- No sensitive data in logs, analytics, or error-reporting payloads without an approved policy.

The frontend is not an authorization boundary. Every protected backend operation must enforce the authenticated user's permissions and scope.

---

## 15. Error Handling and Operational States

Create a consistent application-wide error-handling strategy.

Handle:

- Network errors.
- Timeouts.
- Authentication expiration.
- Authorization failures.
- Validation errors.
- Missing resources.
- Conflicts and duplicate submissions.
- Rate limits.
- Server errors.
- Unavailable modules.
- Invalid configuration.
- Failed file exports.
- Failed report execution.

Display useful, safe messages. Do not expose stack traces, SQL, tokens, or internal implementation details.

Provide recovery options where appropriate, such as retry, sign-in, return to the dashboard, or request access.

Distinguish an empty result from a failed request.

---

## 16. Testing and Quality Gates

Create or update automated tests for the actual frontend stack.

### Unit tests

Cover:

- API client behavior.
- Authentication state.
- Permission and capability evaluation.
- Module configuration processing.
- Navigation generation.
- Dynamic form rendering.
- Field registry behavior.
- Configuration validation.
- Validation error mapping.
- Report configuration rendering.
- Report filter generation.
- Table state management.

### Integration tests

Cover:

- Login and logout.
- Loading backend-driven menus.
- Module availability changes.
- Organization context switching.
- Dynamic forms populated by API data.
- Form submission and backend validation errors.
- Laboratory workflows.
- Pharmacy workflows.
- Billing workflows.
- Visit and waiting queue workflows.
- Centralized report catalog and viewer.
- Report filtering, pagination, and supported exports.
- Permission-denied behavior.
- API failures and recovery.

### End-to-end tests

Use the project's existing E2E framework where possible.

At minimum, verify:

1. A user can sign in.
2. Navigation is populated from the backend.
3. A Laboratory-only organization sees the appropriate Laboratory functionality.
4. Disabled modules are not accessible through direct URL navigation.
5. Unauthorized actions are not exposed as available operations.
6. A configured form obtains its metadata and options from the backend.
7. Backend validation errors are shown correctly.
8. The Reports module can display multiple supported report definitions through one reusable viewer.
9. Changing organization context does not expose previous-context data.
10. Critical billing and operational workflows remain functional.

Test frontend restrictions and backend authorization independently. A hidden button is not proof that an operation is secure.

### Quality checks

Run the available:

- Formatter.
- Linter.
- Type checker.
- Unit tests.
- Integration tests.
- E2E tests.
- Production build.
- Accessibility checks.
- Dependency/security checks where configured.

Report actual outcomes. Never claim that tests passed if they were not executed.

---

## 17. Required Documentation

Create:

```text
docs/frontend_revamp/
├── 01_current_state_assessment.md
├── 02_frontend_backend_integration_plan.md
├── 03_api_integration_matrix.md
├── 04_dynamic_navigation_contract.md
├── 05_dynamic_form_engine.md
├── 06_reports_module_architecture.md
├── 07_design_system_and_accessibility.md
├── 08_security_and_permissions.md
├── 09_testing_and_quality_gates.md
├── 10_deployment_and_configuration.md
└── 11_known_gaps_and_decisions.md
```

Document:

- How the frontend obtains enabled modules.
- How menu configuration is loaded and validated.
- How routes map to supported page types.
- How dynamic fields and API-backed options work.
- How reports are defined, executed, and rendered.
- Which endpoints are implemented and which are missing.
- How permissions are handled.
- How environment configuration works.
- How to run, test, build, and deploy the frontend.

Update the main README with accurate setup instructions.

---

## 18. Required Implementation Phases

### Phase 1 — Discovery and architecture

Inspect the frontend and FastAPI backend. Map the existing workflows, dependencies, API contracts, and architectural gaps.

Do not start with a cosmetic redesign while the integration architecture is unknown.

### Phase 2 — Shared foundation

Implement the centralized API client, authentication lifecycle, operational context, error handling, shared components, and design tokens.

### Phase 3 — Backend-driven navigation

Implement module discovery, menu configuration, supported route resolution, authorization-aware presentation, and module availability handling.

### Phase 4 — Dynamic UI engine

Implement the field registry, configuration validation, form renderer, filter renderer, table renderer, and controlled action renderer.

### Phase 5 — Standalone Reports module

Implement the report catalog, dynamic report viewer, filters, results, pagination, and supported exports through the actual backend.

Remove duplicated reporting implementations from individual modules once the centralized equivalent is verified.

### Phase 6 — Functional module migration

Migrate and verify the existing Laboratory, Pharmacy, Billing, Visits, Waiting Queue, and other in-scope workflows.

Preserve existing business behavior and API compatibility.

### Phase 7 — Visual refinement

Apply the new design system consistently across the application. Improve navigation, page hierarchy, data tables, forms, responsiveness, accessibility, and feedback states.

### Phase 8 — Verification and release

Run automated tests, compare existing workflows, verify module-only deployments, test the production build, document unresolved dependencies, and prepare a safe release plan.

Do not switch users to an unverified frontend.

---

## 19. Definition of Done

The revamp is complete only when:

- The frontend integrates with the actual FastAPI backend.
- Existing required workflows are preserved or their changes are explicitly documented.
- Navigation and enabled modules are sourced from backend configuration.
- The frontend does not require customer-specific hardcoded menu changes.
- Only registered, supported page and component types can be rendered dynamically.
- Form fields and options can be populated using validated backend configuration and approved API resources.
- Business validation remains authoritative on the backend.
- Reports are managed through a standalone Reports module.
- Multiple supported reports can share one reusable report viewer.
- Module availability, permissions, and operational context are handled independently.
- Direct URL access does not bypass backend authorization.
- Loading, empty, error, and recovery states are implemented.
- The design is consistent, responsive, and accessible.
- Critical workflows have automated test coverage.
- The production build succeeds.
- All remaining backend dependencies and limitations are documented.

## 20. First Action

Start by inspecting the actual repository and the completed FastAPI backend.

Do not immediately generate a new UI or rewrite every page.

First deliver the current-state assessment, API integration matrix, and implementation plan. Then implement the shared frontend foundation and backend-driven navigation. Validate that architecture before proceeding to the dynamic form engine and centralized Reports module.

Continue working through the phases rather than stopping after documentation.

At each milestone, report:

- What was implemented.
- Which files were created or modified.
- Which existing workflows were preserved.
- Which tests and builds were actually run.
- Actual results and failures.
- Missing backend APIs or unresolved decisions.
- Whether the milestone meets its acceptance criteria.

**Final objective: a modern, secure, backend-driven, configurable HMS frontend that can serve a complete hospital or a single-module deployment from the same maintainable codebase.**
# 09 — Testing Strategy and Quality Gates

> Quality gates, test pyramid, coverage requirements, and execution plan.

---

## 1. Quality Gates

All modifications must pass the following checks before being considered complete:

1. **TypeScript Typecheck:**
   `npm run typecheck` (`tsc -p apps/api && tsc -p apps/web`) must exit with code 0 and zero errors.
2. **Unit / Integration Tests:**
   `npm test` executes the 34 Vitest test suites against the API and shared core.
   New frontend unit tests for dynamic UI and navigation must also execute cleanly.
3. **End-to-End Smoke Tests:**
   `npm run build` followed by Playwright scripts in `e2e/`:
   - `e2e/screens.mjs`
   - `e2e/op-flow.mjs`
   - `e2e/settings-flow.mjs`
   - `e2e/op-workflow.mjs`
4. **Production Build:**
   `npm run build -w @platform/web` (`tsc -p . && vite build`) must succeed without warnings or chunk generation failures.

---

## 2. Test Pyramid & Scope

### A. Unit Tests (Frontend & Shared)
- **Navigation Filter:** Verify `useNavItems` removes items when permissions are missing or modules are in `modulesOff`.
- **Dynamic Field Registry:** Verify each registered field renders its expected input control and propagates value changes.
- **Config Validation:** Verify Zod schema rejects malformed form/table configs (e.g. invalid field types or missing required attributes).
- **Reports Catalog:** Verify filter definitions validate against query string parameters.

### B. Integration Tests (Backend / Database)
- **Branch Scope:** Verify queries enforce `branchId = currentBranch.id` and that cross-branch tampering yields 404.
- **Audit Logging:** Verify mutations produce audit records with entity, user, and sanitized details.
- **Financial Calculations:** All paise arithmetic and GST rounding logic.

### C. E2E Verification
- Multi-role workflow simulation:
  1. Front desk signs in, registers a patient, creates an OP visit.
  2. Doctor signs in, views waiting queue, adds prescription and orders a lab test.
  3. Lab technician collects sample and enters test results.
  4. Pharmacist dispenses medicines with FIFO batch stock decrement.
  5. Cashier receives consolidated payment and prints bill.


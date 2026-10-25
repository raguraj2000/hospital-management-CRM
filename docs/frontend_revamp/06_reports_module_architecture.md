# 06 — Standalone Reports Module Architecture

> Architectural design for extracting scattered reports into a centralized, reusable reporting engine.

---

## 1. Problem Statement

Previously, reports were scattered across multiple pages:
- Billing period report in `BillingPrints.tsx` / `PeriodReport.tsx`
- Lab period report in `LabPeriodReport.tsx`
- Stock report in `Inventory.tsx`
- Daily collection totals in `Dashboard.tsx`

This fragmentation created duplicated date filters, print views, export logic, and permission inconsistencies.

---

## 2. Solution: Centralized Reports Engine

The standalone Reports module lives under:
```
apps/web/src/modules/reports/
├── pages/
│   ├── ReportsCatalogPage.tsx   — Catalog of all accessible reports by category
│   └── ReportViewerPage.tsx     — Dynamic viewer executing any catalog report
├── components/
│   ├── ReportFilters.tsx        — Auto-generated filter controls from report definition
│   ├── ReportTable.tsx          — Paginated, sortable tabular data presentation
│   ├── ReportSummaryCards.tsx   — Aggregate totals (totals in paise, count, averages)
│   ├── ReportExportBar.tsx      — CSV, Excel, and Print triggers
│   └── ReportPrintTemplate.tsx  — Standardized header, footer, clinic logo & signature lines
├── api/
│   └── reportsApi.ts            — Catalog & execution endpoints
└── types/
    └── index.ts                 — Report definitions and query contracts
```

---

## 3. Report Definition Contract

Each report available to the branch is described by a structured definition:

```ts
export interface ReportFilterDef {
  key: string;
  label: string;
  type: 'date_range' | 'single_date' | 'select' | 'async_select' | 'text';
  required?: boolean;
  defaultValue?: unknown;
  resource?: string; // for async selects like doctors or payment modes
  options?: { label: string; value: string | number }[];
}

export interface ReportColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'date' | 'datetime' | 'number' | 'text' | 'badge';
}

export interface ReportCatalogItem {
  id: string; // e.g., 'billing_collections', 'pharmacy_sales', 'lab_turnaround', 'stock_expiry'
  title: string;
  description: string;
  category: 'Financial' | 'Clinical' | 'Inventory' | 'Operational';
  permission: Permission;
  filters: ReportFilterDef[];
  columns: ReportColumnDef[];
  supportsExport: ('csv' | 'pdf' | 'print')[];
  summaryFields?: { key: string; label: string; format: 'currency' | 'number' }[];
}
```

---

## 4. Built-in Catalog Items

1. **Daily & Period Collections Report (`billing_collections`)**
   - Category: Financial
   - Permission: `reports.view`
   - Filters: Date range (from/to), Payment Mode (Cash/UPI/Card/All), Staff/Cashier
   - Summary: Total collected, Cash total, UPI total, Card total
2. **Pharmacy Dispensing & Sales Report (`pharmacy_dispensing`)**
   - Category: Inventory/Financial
   - Permission: `reports.view`
   - Filters: Date range, Patient, Medicine search
   - Summary: Total units sold, Total sales value
3. **Lab Workload & Turnaround Report (`lab_workload`)**
   - Category: Clinical
   - Permission: `reports.view`
   - Filters: Date range, Test ID, Status (ordered/sample_collected/completed)
   - Summary: Total tests ordered, Tests completed, Average turnaround
4. **Medicine Stock & Expiry Report (`stock_expiry`)**
   - Category: Inventory
   - Permission: `inventory.view`
   - Filters: Expiring within (30/60/90 days), Low stock only (boolean)
   - Summary: Near expiry batches count, Total stock value at cost and selling price

---

## 5. Module Cross-Linking

Clinical and administrative modules link directly to reports via standard query parameters:
- From Billing: `<Link to="/:branch/reports/billing_collections?from=...&to=...">`
- From Pharmacy: `<Link to="/:branch/reports/pharmacy_dispensing">`
- From Inventory: `<Link to="/:branch/reports/stock_expiry">`

No module contains its own reporting implementation; all redirect to the unified Reports viewer.


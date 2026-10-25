import type { ReportCatalogItem } from './types';

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: 'financial_collections',
    title: 'Financial Collections & Revenue',
    description: 'Comprehensive report on cash, UPI, and card collections, consultation fees, and pharmacy/lab proceeds.',
    category: 'Financial',
    permission: 'reports.view',
    endpoint: (branch, params) => {
      const q = params.days ? `days=${params.days}` : (params.from && params.to ? `from=${params.from}&to=${params.to}` : 'days=7');
      return `/b/${branch}/reports/period?${q}`;
    },
    filters: [
      {
        key: 'period',
        label: 'Period',
        type: 'select',
        options: [
          { label: 'Today', value: '1' },
          { label: 'Last 7 Days', value: '7' },
          { label: 'Last 30 Days', value: '30' },
          { label: 'Last 365 Days', value: '365' },
        ],
      },
    ],
    columns: [
      { key: 'doctorName', header: 'Doctor / Section' },
      { key: 'patients', header: 'Patients', align: 'right', format: 'number' },
      { key: 'consultationPaise', header: 'Consultations', align: 'right', format: 'currency' },
      { key: 'labPaise', header: 'Lab Fees', align: 'right', format: 'currency' },
      { key: 'medicinesPaise', header: 'Pharmacy', align: 'right', format: 'currency' },
      { key: 'totalPaise', header: 'Total Revenue', align: 'right', format: 'currency' },
    ],
    summaryFields: [
      { key: 'totalReceived', label: 'Total Received', format: 'currency' },
      { key: 'cashReceived', label: 'Cash', format: 'currency' },
      { key: 'upiReceived', label: 'UPI', format: 'currency' },
      { key: 'cardReceived', label: 'Card', format: 'currency' },
    ],
    supportsExport: ['csv', 'print'],
    dataExtractor: (data) => {
      const rows = data?.doctors ?? [];
      const rec = data?.received ?? {};
      return {
        rows,
        summary: {
          totalReceived: rec.totalPaise ?? 0,
          cashReceived: rec.cash ?? 0,
          upiReceived: rec.upi ?? 0,
          cardReceived: rec.card ?? 0,
        },
      };
    },
  },
  {
    id: 'lab_workload',
    title: 'Laboratory Workload & Output',
    description: 'Summary of all completed diagnostic tests, turnaround volumes, and lab billing totals.',
    category: 'Clinical',
    permission: 'reports.view',
    endpoint: (branch, params) => {
      const q = params.days ? `days=${params.days}` : (params.from && params.to ? `from=${params.from}&to=${params.to}` : 'days=7');
      return `/b/${branch}/lab/report?${q}`;
    },
    filters: [
      {
        key: 'period',
        label: 'Period',
        type: 'select',
        options: [
          { label: 'Today', value: '1' },
          { label: 'Last 7 Days', value: '7' },
          { label: 'Last 30 Days', value: '30' },
          { label: 'Last 365 Days', value: '365' },
        ],
      },
    ],
    columns: [
      { key: 'name', header: 'Test Name' },
      { key: 'department', header: 'Department' },
      { key: 'count', header: 'Completed Count', align: 'right', format: 'number' },
      { key: 'amountPaise', header: 'Billed Amount', align: 'right', format: 'currency' },
    ],
    summaryFields: [
      { key: 'totalCount', label: 'Total Tests Completed', format: 'number' },
      { key: 'totalPaise', label: 'Total Billed Amount', format: 'currency' },
      { key: 'waiting', label: 'Current Pending in Lab', format: 'number' },
    ],
    supportsExport: ['csv', 'print'],
    dataExtractor: (data) => ({
      rows: data?.tests ?? [],
      summary: {
        totalCount: data?.totalCount ?? 0,
        totalPaise: data?.totalPaise ?? 0,
        waiting: data?.waiting ?? 0,
      },
    }),
  },
  {
    id: 'stock_expiry',
    title: 'Pharmacy Stock & Expiry Analysis',
    description: 'Critical batch monitoring identifying near-expiry medicines, expired units on shelf, and reorder alerts.',
    category: 'Inventory',
    permission: 'inventory.view',
    endpoint: (branch) => `/b/${branch}/pharmacy/stock-report`,
    filters: [
      {
        key: 'scope',
        label: 'Category',
        type: 'select',
        options: [
          { label: 'Expiring Soon (Next 90 Days)', value: 'expiring' },
          { label: 'Expired Batches', value: 'expired' },
          { label: 'Low Stock Alerts', value: 'lowStock' },
        ],
      },
    ],
    columns: [
      { key: 'medicineName', header: 'Medicine' },
      { key: 'batchNo', header: 'Batch No' },
      { key: 'expiryDate', header: 'Expiry Date', format: 'date' },
      { key: 'quantity', header: 'Stock Units', align: 'right', format: 'number' },
      { key: 'valuePaise', header: 'Retail Value', align: 'right', format: 'currency' },
    ],
    summaryFields: [
      { key: 'sellableValue', label: 'Total Sellable Stock Value', format: 'currency' },
      { key: 'lowStockCount', label: 'Low Stock Medicines', format: 'number' },
      { key: 'expiredCount', label: 'Expired Batches on Shelf', format: 'number' },
    ],
    supportsExport: ['csv', 'print'],
    dataExtractor: (data) => {
      const rows = data?.expiring ?? [];
      const sum = data?.summary ?? {};
      return {
        rows,
        summary: {
          sellableValue: sum.sellableValuePaise ?? 0,
          lowStockCount: sum.lowStock ?? 0,
          expiredCount: sum.expired ?? 0,
        },
      };
    },
  },
];


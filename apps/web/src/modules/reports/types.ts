import type { Permission } from '@platform/shared';
import type { ColumnDef } from '@/dynamic-ui/table-renderer/DynamicTable';
import type { FilterItem } from '@/dynamic-ui/filter-renderer/DynamicFilterBar';

export interface ReportSummaryField {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'text';
}

export interface ReportCatalogItem {
  id: string;
  title: string;
  description: string;
  category: 'Financial' | 'Clinical' | 'Inventory' | 'Operational';
  permission: Permission;
  endpoint: (branch: string, params: Record<string, any>) => string;
  filters: FilterItem[];
  columns: ColumnDef<any>[];
  summaryFields?: ReportSummaryField[];
  supportsExport: ('csv' | 'print')[];
  dataExtractor?: (res: any) => { rows: any[]; summary?: Record<string, any> };
}


import { Download, Printer } from 'lucide-react';
import { Button } from '@platform/ui';
import type { ColumnDef } from '@/dynamic-ui/table-renderer/DynamicTable';

interface ReportExportBarProps {
  title: string;
  columns: ColumnDef<any>[];
  data: any[];
  disabled?: boolean;
}

export function ReportExportBar({ title, columns, data, disabled }: ReportExportBarProps) {
  function exportCsv() {
    if (!data.length) return;

    const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(','),
    );

    const csvContent = [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !data.length}
        onClick={exportCsv}
        className="gap-1.5 text-xs h-8"
        title="Download CSV spreadsheet"
      >
        <Download className="size-3.5" />
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !data.length}
        onClick={handlePrint}
        className="gap-1.5 text-xs h-8"
        title="Print this report"
      >
        <Printer className="size-3.5" />
        Print
      </Button>
    </div>
  );
}


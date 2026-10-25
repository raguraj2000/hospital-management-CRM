import { Card } from '@platform/ui';
import { formatRupees } from '@platform/shared';
import type { ReportSummaryField } from '../types';

interface ReportSummaryCardsProps {
  fields: ReportSummaryField[];
  values: Record<string, any>;
  loading?: boolean;
}

export function ReportSummaryCards({ fields, values, loading }: ReportSummaryCardsProps) {
  if (!fields.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {fields.map((f) => {
        const raw = values[f.key];
        let display = '—';

        if (loading) {
          display = '…';
        } else if (raw !== undefined && raw !== null) {
          if (f.format === 'currency') {
            display = formatRupees(Number(raw));
          } else if (f.format === 'number') {
            display = Number(raw).toLocaleString('en-IN');
          } else {
            display = String(raw);
          }
        }

        return (
          <Card key={f.key} className="p-3.5 space-y-1">
            <span className="text-xs font-medium text-muted block truncate">{f.label}</span>
            <span className="text-xl font-bold text-ink tabular-nums block truncate">{display}</span>
          </Card>
        );
      })}
    </div>
  );
}


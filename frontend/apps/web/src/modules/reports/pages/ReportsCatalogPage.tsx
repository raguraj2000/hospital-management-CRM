import { Card } from '@platform/ui';
import { FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import { useCan } from '@/core/auth';
import { REPORT_CATALOG } from '../catalog';
import type { ReportCatalogItem } from '../types';

interface ReportsCatalogPageProps {
  onSelectReport: (reportId: string) => void;
}

export function ReportsCatalogPage({ onSelectReport }: ReportsCatalogPageProps) {
  const categories = ['Financial', 'Clinical', 'Inventory', 'Operational'] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Reports Catalog</h1>
        <p className="text-sm text-muted mt-1">
          Select an authorized clinical, financial, or operational report to view and export.
        </p>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => {
          const catReports = REPORT_CATALOG.filter((r) => r.category === cat);
          if (!catReports.length) return null;

          return (
            <div key={cat} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {cat} Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catReports.map((report) => (
                  <ReportCatalogCard
                    key={report.id}
                    report={report}
                    onSelect={() => onSelectReport(report.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportCatalogCard({
  report,
  onSelect,
}: {
  report: ReportCatalogItem;
  onSelect: () => void;
}) {
  const permitted = useCan(report.permission);

  return (
    <Card
      onClick={permitted ? onSelect : undefined}
      className={`p-4 flex flex-col justify-between transition-all ${
        permitted
          ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
          : 'opacity-60 bg-subtle/30 cursor-not-allowed'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex size-8 items-center justify-center rounded-lg bg-subtle text-ink">
            <FileText className="size-4 text-muted" />
          </span>
          {!permitted && (
            <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
              <ShieldAlert className="size-3" /> Restricted
            </span>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink group-hover:text-primary">
            {report.title}
          </h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {report.description}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-primary">
        <span>{permitted ? 'Open Report' : 'Permission Required'}</span>
        {permitted && <ArrowRight className="size-3.5" />}
      </div>
    </Card>
  );
}


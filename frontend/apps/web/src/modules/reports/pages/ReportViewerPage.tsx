import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button, Card, EmptyState } from '@platform/ui';
import { api, errorMessage } from '@/core/api/client';
import { useCan } from '@/core/auth';
import { DynamicFilterBar } from '@/dynamic-ui/filter-renderer/DynamicFilterBar';
import { DynamicTable } from '@/dynamic-ui/table-renderer/DynamicTable';
import type { ReportCatalogItem } from '../types';
import { ReportSummaryCards } from '../components/ReportSummaryCards';
import { ReportExportBar } from '../components/ReportExportBar';

interface ReportViewerPageProps {
  report: ReportCatalogItem;
  onBack: () => void;
}

export function ReportViewerPage({ report, onBack }: ReportViewerPageProps) {
  const { branch } = useParams();
  const permitted = useCan(report.permission);

  // Initialize filter state with default values
  const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    report.filters.forEach((f) => {
      if (f.type === 'select' && f.options?.length) {
        initial[f.key] = f.options[0]?.value;
      }
    });
    return initial;
  });

  const queryUrl = branch ? report.endpoint(branch, filterValues) : '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report', branch, report.id, filterValues],
    queryFn: () => api.get<any>(queryUrl),
    enabled: !!branch && permitted,
    staleTime: 30_000,
  });

  if (!permitted) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-6">
        <EmptyState
          icon={Lock}
          title="Access Restricted"
          description="Your role does not have the required permission to access this report."
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onBack}>
            Return to Catalog
          </Button>
        </div>
      </Card>
    );
  }

  const extracted = report.dataExtractor ? report.dataExtractor(data) : { rows: Array.isArray(data) ? data : [] };
  const rows = extracted.rows ?? [];
  const summary = extracted.summary ?? {};

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="size-8 p-0"
            title="Back to Catalog"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-ink">{report.title}</h1>
            <p className="text-xs text-muted">{report.description}</p>
          </div>
        </div>

        <ReportExportBar
          title={report.title}
          columns={report.columns}
          data={rows}
          disabled={isLoading || rows.length === 0}
        />
      </div>

      {/* Dynamic Filter Controls */}
      {report.filters.length > 0 && (
        <DynamicFilterBar
          filters={report.filters}
          values={filterValues}
          onChange={(k, v) => setFilterValues((prev) => ({ ...prev, [k]: v }))}
          onReset={() => setFilterValues({})}
        />
      )}

      {/* Summary KPI Cards */}
      {report.summaryFields && report.summaryFields.length > 0 && (
        <ReportSummaryCards
          fields={report.summaryFields}
          values={summary}
          loading={isLoading}
        />
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-md border border-critical/30 bg-critical-soft p-3 text-xs text-critical flex items-center justify-between">
          <span>Failed to run report: {errorMessage(error)}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Results Dynamic Table */}
      <DynamicTable
        columns={report.columns}
        data={rows}
        loading={isLoading}
        emptyTitle="No records found"
        emptyDescription="No data matches the selected filter parameters."
      />
    </div>
  );
}


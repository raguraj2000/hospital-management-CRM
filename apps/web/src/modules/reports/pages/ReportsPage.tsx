import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { REPORT_CATALOG } from '../catalog';
import { ReportsCatalogPage } from './ReportsCatalogPage';
import { ReportViewerPage } from './ReportViewerPage';

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportParam = searchParams.get('report');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reportParam);

  useEffect(() => {
    setSelectedReportId(reportParam);
  }, [reportParam]);

  const activeReport = REPORT_CATALOG.find((r) => r.id === selectedReportId);

  function handleSelectReport(id: string) {
    setSelectedReportId(id);
    setSearchParams({ report: id });
  }

  function handleBackToCatalog() {
    setSelectedReportId(null);
    setSearchParams({});
  }

  if (activeReport) {
    return <ReportViewerPage report={activeReport} onBack={handleBackToCatalog} />;
  }

  return <ReportsCatalogPage onSelectReport={handleSelectReport} />;
}


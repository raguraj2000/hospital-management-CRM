// Lab > Lab reports: tests completed in a period (today, 7 days, 30 days, 1 year), how many of each and what they
// brought in. Needs the reports permission.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { formatRupees } from '@platform/shared';
import { Card, CardHeader, EmptyState, Skeleton, Table, TBody, TD, TH, THead, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { PeriodPicker, type PeriodDays } from './PeriodReport';

interface LabReportData {
  days: number;
  to: string;
  tests: { testId: number; name: string; department: string; count: number; amountPaise: number }[];
  totalCount: number;
  totalPaise: number;
  waiting: number;
}

export function LabPeriodReport({ branch }: { branch: string }) {
  const [days, setDays] = useState<PeriodDays>(1);
  const { data, isLoading, error } = useQuery({ queryKey: ['lab-period', branch, days], queryFn: () => api.get<LabReportData>(`/b/${branch}/lab/report?days=${days}`) });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Tests completed, how many of each, and what they were billed at.</p>
        <PeriodPicker value={days} onChange={setDays} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Tests completed', data ? String(data.totalCount) : '…'],
          ['Billed for them', data ? formatRupees(data.totalPaise) : '…'],
          ['Waiting in the lab now', data ? String(data.waiting) : '…'],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <div className="text-sm text-muted">{label}</div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="By test" />
        {isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : error ? (
          <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
        ) : !data?.tests.length ? (
          <EmptyState icon={FlaskConical} title="No test completed in this period" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Test</TH>
                <TH className="hidden sm:table-cell">Department</TH>
                <TH className="text-right">Done</TH>
                <TH className="text-right">Billed</TH>
              </tr>
            </THead>
            <TBody>
              {data.tests.map((t) => (
                <TR key={t.testId}>
                  <TD className="font-medium">{t.name}</TD>
                  <TD className="hidden text-muted capitalize sm:table-cell">{t.department.toLowerCase()}</TD>
                  <TD className="text-right tabular-nums">{t.count}</TD>
                  <TD className="text-right tabular-nums">{formatRupees(t.amountPaise)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

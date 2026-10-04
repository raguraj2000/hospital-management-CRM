import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Printer, Save } from 'lucide-react';
import { flagResult, type LabReport, type LabReportTest } from '@platform/shared';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Input, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { TokenBadge } from '@/components/Visits';

const statusTone = { ordered: 'warning', sample_collected: 'brand', completed: 'positive', cancelled: 'neutral' } as const;
const statusLabel = { ordered: 'Waiting for sample', sample_collected: 'In progress', completed: 'Completed', cancelled: 'Cancelled' } as const;

/** Results entry for all tests of one OP visit, then print. */
export function LabResults() {
  const { branch, visitId } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-report', branch, visitId],
    queryFn: () => api.get<LabReport>(`/b/${branch}/visits/${visitId}/lab-report`),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Card className="p-6 text-sm">{errorMessage(error)}</Card>;
  const p = data.patient;

  return (
    <div>
      <Link to={`/${branch}/lab`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Lab queue
      </Link>
      <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Avatar name={p.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold tracking-tight">{p.name}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted">
            <Badge className="font-mono">{p.uhid}</Badge>
            <TokenBadge opNo={data.visit.opNo} />
            <Badge className="font-mono">{data.visit.opNo}</Badge>
            {p.age != null && <span>{p.age} yrs</span>}
            {p.gender && <span className="capitalize">· {p.gender}</span>}
            {data.visit.doctorName && <span>· Ref: {data.visit.doctorName}</span>}
          </div>
        </div>
        <a href={`/${branch}/lab/visits/${visitId}/print`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Printer className="size-4" /> Print report
        </a>
      </Card>

      {data.tests.length === 0 ? (
        <Card>
          <EmptyState title="No tests on this visit" icon={Printer} />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.tests.map((t) => (
            <TestCard key={t.orderId} branch={branch!} visitId={visitId!} test={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TestCard({ branch, visitId, test }: { branch: string; visitId: string; test: LabReportTest }) {
  const canEnter = useCan('lab.view');
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries(test.parameters.map((p) => [p.id, p.value])));
  const [saving, setSaving] = useState(false);
  const dirty = test.parameters.some((p) => (values[p.id] ?? '') !== p.value);
  const filled = test.parameters.filter((p) => (values[p.id] ?? '').trim()).length;

  async function save(complete: boolean) {
    setSaving(true);
    try {
      await api.put(`/b/${branch}/lab/orders/${test.orderId}/results`, {
        results: test.parameters.map((p) => ({ parameterId: p.id, value: (values[p.id] ?? '').trim() })),
        complete,
      });
      await qc.invalidateQueries({ queryKey: ['lab-report', branch, visitId] });
      qc.invalidateQueries({ queryKey: ['lab-queue', branch] });
      qc.invalidateQueries({ queryKey: ['patient-lab', branch] });
      toast.success(complete ? `${test.name} completed` : `${test.name} saved`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={test.name}
        description={`${test.department}${test.kind === 'card' ? ' · card test' : ''} · ${filled}/${test.parameters.length} filled`}
        action={
          <Badge tone={statusTone[test.status]} dot>
            {statusLabel[test.status]}
          </Badge>
        }
      />
      <div className="divide-y divide-border">
        {test.parameters.map((p) => {
          const v = values[p.id] ?? '';
          const flag = flagResult(v, p.refRange, p.noFlag);
          return (
            <div key={p.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,0.8fr)] sm:items-center">
              <div className="min-w-0">
                <div className="text-sm font-medium">{p.name}</div>
                {p.method && <div className="truncate text-xs text-muted">{p.method}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  aria-label={p.name}
                  value={v}
                  disabled={!canEnter}
                  inputMode={p.type === 'number' ? 'decimal' : 'text'}
                  onChange={(e) => setValues((s) => ({ ...s, [p.id]: e.target.value }))}
                  className={`w-28 tabular-nums ${flag ? 'border-critical font-semibold text-critical' : ''}`}
                />
                {p.unit && <span className="text-xs text-muted">{p.unit}</span>}
                {flag && flag !== '!' && <Badge tone="critical">{flag}</Badge>}
                {canEnter &&
                  p.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setValues((s) => ({ ...s, [p.id]: o }))}
                      className={`h-7 rounded-md border px-2 text-xs ${v === o ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-subtle'}`}
                    >
                      {o === 'NEGATIVE' ? 'Neg' : o === 'POSITIVE' ? 'Pos' : o}
                    </button>
                  ))}
              </div>
              <div className="text-xs text-muted sm:text-right">{p.refRange || '—'}</div>
            </div>
          );
        })}
      </div>
      {canEnter && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
          <Button variant="outline" disabled={saving || !dirty} onClick={() => save(false)}>
            <Save /> Save
          </Button>
          <Button disabled={saving || filled === 0} onClick={() => save(true)}>
            <CheckCircle2 /> {test.status === 'completed' ? 'Save (completed)' : 'Save & complete'}
          </Button>
        </div>
      )}
    </Card>
  );
}

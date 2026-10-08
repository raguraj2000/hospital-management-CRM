// The Lab tab of a visit: the tests ordered, their results, and ordering more.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FlaskConical, Stethoscope } from 'lucide-react';
import { formatRupees, type LabOrder, type LabReport, type LabTest, type OpVisit } from '@platform/shared';
import { Badge, Button, Card, CardHeader, cn, ConfirmDialog, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { CounterNote } from './CounterNote';
import { labLabel, labTone } from './format';
import { PrintLink } from './print';

/** The visit's lab orders: the same query (and cache) wherever the visit page needs them. */
export const useVisitLab = (branch: string, visitId: number, enabled = true) =>
  useQuery({ queryKey: ['visit-lab', branch, visitId], queryFn: () => api.get<{ orders: LabOrder[] }>(`/b/${branch}/visits/${visitId}/lab-orders`), enabled, staleTime: 0 }); // the lab works on another PC: always ask again

export function VisitLab({ branch, visit, onOrdered }: { branch: string; visit: OpVisit; onOrdered: () => void }) {
  const canOrder = useCan('lab.order');
  const canViewLab = useCan('lab.view');
  const canPrint = canOrder || canViewLab; // the report page takes either
  const qc = useQueryClient();
  const orders = useVisitLab(branch, visit.id);
  const tests = useQuery({ queryKey: ['lab-tests', branch], queryFn: () => api.get<{ tests: LabTest[] }>(`/b/${branch}/lab/tests`), enabled: canOrder, staleTime: 60_000 });
  const [picked, setPicked] = useState<number[]>([]);
  const [cancelling, setCancelling] = useState<LabOrder | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['visit-lab', branch, visit.id] });

  const order = useMutation({
    mutationFn: () => api.post(`/b/${branch}/visits/${visit.id}/lab-orders`, { testIds: picked }),
    onSuccess: () => {
      toast.success(`${picked.length} test${picked.length > 1 ? 's' : ''} sent to the lab`);
      setPicked([]);
      refresh();
      // The lab queue, the patient's Lab tab and the OP list (lab progress) all show it.
      for (const k of ['lab-queue', 'patient-lab', 'visits']) qc.invalidateQueries({ queryKey: [k, branch] });
      onOrdered();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api.patch(`/b/${branch}/lab/orders/${id}`, { status: 'cancelled' }),
    onSuccess: () => {
      refresh();
      // A cancelled test also leaves its unpaid bill.
      for (const k of ['visit-bills', 'patient-lab', 'patient-bills', 'visits']) qc.invalidateQueries({ queryKey: [k, branch] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const active = (orders.data?.orders ?? []).filter((o) => o.status !== 'cancelled');
  const already = new Set(active.map((o) => o.testId));
  // Every test is done and the patient is still to be seen: this is why they are back.
  const resultReady = active.length > 0 && active.every((o) => o.status === 'completed') && (visit.status === 'waiting' || visit.status === 'with_doctor' || visit.status === 'at_lab');
  const pickedTotal = (tests.data?.tests ?? []).filter((t) => picked.includes(t.id)).reduce((s, t) => s + t.pricePaise, 0);

  return (
    <Card>
      <CardHeader
        title="Lab tests"
        description="Ordered tests appear in the lab queue."
        icon={FlaskConical}
        iconTone="brand"
        action={
          active.length > 0 &&
          canPrint && (
            <PrintLink href={`/${branch}/lab/visits/${visit.id}/print`} className="text-xs font-medium text-brand hover:underline">
              Print report
            </PrintLink>
          )
        }
      />
      {resultReady && <LabResultReady branch={branch} visitId={visit.id} />}
      {orders.isLoading ? (
        <div className="p-4">
          <Skeleton className="h-16" />
        </div>
      ) : (orders.data?.orders.length ?? 0) === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">No tests ordered.</p>
      ) : (
        <ul className="divide-y divide-border">
          {orders.data!.orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className={o.status === 'cancelled' ? 'text-muted line-through' : 'font-medium'}>{o.testName}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted tabular-nums">{formatRupees(o.pricePaise)}</span>
                <Badge tone={labTone[o.status]} dot>
                  {labLabel[o.status]}
                </Badge>
                {/* Until results are entered (the server refuses after that). */}
                {canOrder && (o.status === 'ordered' || o.status === 'sample_collected') && (
                  <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => setCancelling(o)}>
                    Cancel test
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canOrder && visit.status !== 'cancelled' && (
        <div className="border-t border-border p-4">
          <div className="mb-2 text-sm font-medium">Order tests</div>
          {tests.data?.tests.length === 0 ? (
            <p className="text-sm text-muted">No tests set up yet. A branch admin adds them in Lab → Tests.</p>
          ) : (
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {(tests.data?.tests ?? []).map((t) => (
                <label key={t.id} className={`flex min-h-10 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-subtle ${already.has(t.id) ? 'opacity-50' : ''}`}>
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-primary)]"
                      disabled={already.has(t.id)}
                      checked={picked.includes(t.id)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, t.id] : p.filter((x) => x !== t.id)))}
                    />
                    {t.name} {already.has(t.id) && <span className="text-xs text-muted">(ordered)</span>}
                  </span>
                  <span className="text-muted tabular-nums">{formatRupees(t.pricePaise)}</span>
                </label>
              ))}
            </div>
          )}
          <Button className="mt-3 w-full sm:w-auto" disabled={!picked.length || order.isPending} onClick={() => order.mutate()}>
            <CheckCircle2 /> {picked.length ? `Order ${picked.length} test${picked.length > 1 ? 's' : ''} · ${formatRupees(pickedTotal)}` : 'Tick tests to order'}
          </Button>
        </div>
      )}
      <CounterNote branch={branch} visit={visit} field="labNote" label="Note to lab" placeholder="e.g. Fasting sample. Urgent, call me with the result." canEdit={canOrder} />
      {!canOrder && (
        <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted">
          <Stethoscope className="size-3.5" /> Only doctors order tests.
        </p>
      )}
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel ${cancelling?.testName ?? 'test'}?`}
        description="It is removed from the lab queue and from the bill."
        confirmLabel="Yes, cancel the test"
        cancelLabel="Keep it"
        onConfirm={() => cancelling && cancel.mutate(cancelling.id)}
      />
    </Card>
  );
}

const FLAG = { H: 'High', L: 'Low', '!': 'Check' } as const;

/** Top of the Lab tests card when every test is done: why this patient is back, with the values. */
export function LabResultReady({ branch, visitId }: { branch: string; visitId: number }) {
  const canSee = [useCan('lab.order'), useCan('lab.view')].some(Boolean); // the report takes either
  const report = useQuery({ queryKey: ['lab-report', branch, String(visitId)], queryFn: () => api.get<LabReport>(`/b/${branch}/visits/${visitId}/lab-report`), enabled: canSee, staleTime: 0 });
  const done = report.data?.tests.filter((t) => t.status === 'completed') ?? [];

  return (
    <div className="border-b border-positive/30 bg-positive-soft px-4 py-3">
      {/* The values are shown right here: the printed report is held back until the lab charges are paid. */}
      <div className="flex items-center gap-2 text-base font-semibold text-positive">
        <CheckCircle2 className="size-5" /> {canSee ? 'Result ready — the report:' : 'Result ready'}
      </div>
      {report.error && <p className="mt-1 text-sm text-critical">{errorMessage(report.error)}</p>}
      {done.map((t) => {
        const filled = t.parameters.filter((p) => p.value !== '');
        return (
          <div key={t.orderId} className="mt-2">
            <div className="text-sm font-semibold">{t.name}</div>
            {filled.length === 0 ? (
              <p className="text-sm text-muted">No values entered.</p>
            ) : (
              <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm">
                {filled.map((p) => (
                  <div key={p.id} className="contents">
                    <dt className="text-muted">
                      {p.name}
                      {p.refRange && <span className="text-xs"> (normal {p.refRange})</span>}
                    </dt>
                    <dd className={cn('text-right font-semibold tabular-nums', p.flag && 'text-critical')}>
                      {p.value} {p.unit} {p.flag && <span>· {FLAG[p.flag]}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}

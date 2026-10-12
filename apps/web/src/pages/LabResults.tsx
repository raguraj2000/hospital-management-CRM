import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Printer, Save } from 'lucide-react';
import { flagResult, type LabReport, type LabReportTest } from '@platform/shared';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Input, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { labTone } from '@/components/format';
import { PrintLink } from '@/components/print';
import { useCan } from '@/state/auth';
import { TokenBadge } from '@/components/Visits';
import { KeyHint } from '@/components/Shortcuts';

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
          {data.visit.labNote && (
            <p className="mt-2 text-sm whitespace-pre-wrap">
              <span className="font-semibold">Doctor's note: </span>
              {data.visit.labNote}
            </p>
          )}
        </div>
        <PrintLink href={`/${branch}/lab/visits/${visitId}/print`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Printer className="size-4" /> Print report
        </PrintLink>
      </Card>

      {data.tests.length === 0 ? (
        <Card>
          <EmptyState title="No tests on this visit" icon={Printer} />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.tests.map((t) => (
            <TestCard key={t.orderId} branch={branch!} visitId={visitId!} test={t} othersPending={data.tests.filter((x) => x.orderId !== t.orderId && x.status !== 'completed').length} />
          ))}
        </div>
      )}
    </div>
  );
}

/** `othersPending`: the visit's other tests that are not completed yet. */
type Param = { id: number; name: string };
const num = (v: string | undefined) => (v != null && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * The red-cell indices of a CBC from haemoglobin (g/dl), RBC (million/cumm) and PCV (%):
 * MCV = PCV / RBC x 10, MCH = Hb / RBC x 10, MCHC = Hb / PCV x 100. A box that was typed by hand is left alone.
 */
function withIndices(params: Param[], values: Record<number, string>, auto: Set<number>): Record<number, string> {
  const find = (re: RegExp) => params.find((p) => re.test(p.name));
  const hb = num(values[find(/^h(a)?emoglobin\b/i)?.id ?? -1]);
  const rbc = num(values[find(/\bRBC\b/i)?.id ?? -1]);
  const pcv = num(values[find(/\bPCV\b|hematocrit/i)?.id ?? -1]);
  const out = { ...values };
  const put = (target: Param | undefined, value: number | null) => {
    if (!target) return;
    const typed = (out[target.id] ?? '').trim() !== '' && !auto.has(target.id);
    if (typed) return;
    if (value == null || !Number.isFinite(value)) {
      if (auto.has(target.id)) out[target.id] = '';
      return;
    }
    out[target.id] = value.toFixed(1);
    auto.add(target.id);
  };
  put(find(/\bMCV\b/), pcv != null && rbc ? (pcv / rbc) * 10 : null);
  put(find(/\bMCH\b/), hb != null && rbc ? (hb / rbc) * 10 : null);
  put(find(/\bMCHC\b/), hb != null && pcv ? (hb / pcv) * 100 : null);
  return out;
}

/** What neutrophils + lymphocytes + monocytes + eosinophils + basophils add up to; null when the test has none of them. */
function differentialTotal(params: Param[], values: Record<number, string>) {
  const cells = params.filter((p) => /^(neutrophils|lymphocytes|monocytes|eosinophils|basophils)\b/i.test(p.name));
  if (cells.length < 5) return null;
  const typed = cells.map((p) => num(values[p.id]));
  if (typed.every((x) => x == null)) return null;
  return { total: Math.round(typed.reduce<number>((s, x) => s + (x ?? 0), 0) * 10) / 10, complete: typed.every((x) => x != null) };
}

function TestCard({ branch, visitId, test, othersPending }: { branch: string; visitId: string; test: LabReportTest; othersPending: number }) {
  const canEnter = useCan('lab.view');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [values, setRaw] = useState<Record<number, string>>(() => Object.fromEntries(test.parameters.map((p) => [p.id, p.value])));
  // Boxes filled by the calculation (not typed): they follow their source values until someone types in them.
  const auto = useRef(new Set<number>());
  /** Every change goes through here: a typed box stops being calculated, then the CBC indices are worked out. */
  const setValues = (change: (s: Record<number, string>) => Record<number, string>) =>
    setRaw((s) => {
      const next = change(s);
      for (const p of test.parameters) if (next[p.id] !== s[p.id]) auto.current.delete(p.id);
      return withIndices(test.parameters, next, auto.current);
    });
  const diff = differentialTotal(test.parameters, values);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Set when "Save & complete" was pressed with empty values: those boxes are marked until they are filled.
  const [showMissing, setShowMissing] = useState(false);
  // Lines the test cannot be completed without (optional ones may stay empty).
  const missing = test.parameters.filter((p) => !p.optional && !(values[p.id] ?? '').trim());
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
      if (!complete) toast.success(`${test.name} saved`);
      else if (othersPending > 0) toast.success(`${test.name} completed`, { description: `${othersPending} more test${othersPending > 1 ? 's' : ''} on this visit to complete.` });
      else {
        // Every test of the visit is done: back to the lab, on the Completed list, where the report prints.
        toast.success(`${test.name} completed`, { description: 'The report is ready.' });
        navigate(`/${branch}/lab?tab=done`);
      }
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
          <Badge tone={labTone[test.status]} dot>
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
                <div className="text-sm font-medium">
                  {p.name} {p.optional ? <span className="text-xs font-normal text-muted">(optional)</span> : <span className="text-critical" title="Required">*</span>}
                </div>
                {p.method && <div className="truncate text-xs text-muted">{p.method}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  aria-label={p.name}
                  value={v}
                  disabled={!canEnter}
                  inputMode={p.type === 'number' ? 'decimal' : 'text'}
                  onChange={(e) => setValues((s) => ({ ...s, [p.id]: e.target.value }))}
                  aria-invalid={showMissing && !p.optional && !v.trim()}
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
        {diff && (
          <div className={`flex items-center justify-between px-4 py-2 text-sm font-medium ${diff.complete && diff.total !== 100 ? 'bg-warning-soft text-warning' : 'text-muted'}`}>
            <span>Differential count total</span>
            <span className="tabular-nums">
              {diff.total}%{diff.complete ? (diff.total === 100 ? ' ✓' : ' — should be 100%') : ' so far'}
            </span>
          </div>
        )}
      </div>
      {canEnter && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
          <Button variant="outline" disabled={saving || !dirty} onClick={() => save(false)}>
            <Save /> Save
          </Button>
          <Button
            data-shortcut="alt+s"
            disabled={saving}
            onClick={() => {
              // A report must be whole: every value entered before the test can be completed.
              if (missing.length) return setShowMissing(true);
              setConfirming(true);
            }}
          >
            <CheckCircle2 /> {test.status === 'completed' ? 'Save (completed)' : 'Save & complete'} <KeyHint>Alt+S</KeyHint>
          </Button>
        </div>
      )}
      {showMissing && missing.length > 0 && (
        <p role="alert" className="border-t border-border bg-critical-soft px-4 py-3 text-sm font-medium text-critical">
          Enter all the details before completing. Missing: {missing.map((p) => p.name).join(', ')}.
        </p>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Complete ${test.name}?`}
        description="The report becomes ready for the doctor and for printing. Check the values once more."
        cancelLabel="Go back"
        confirmLabel={
          <>
            <CheckCircle2 /> Yes, save &amp; complete
          </>
        }
        pending={saving}
        onConfirm={() => save(true)}
      >
        <dl className="mb-5 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-3 text-sm">
          {test.parameters.map((p) => (
            <div key={p.id} className="flex justify-between gap-4">
              <dt className="text-muted">{p.name}</dt>
              <dd className="font-semibold tabular-nums">
                {values[p.id]} {p.unit}
              </dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>
    </Card>
  );
}

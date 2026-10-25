// The doctor's OP tab as four plain buttons: medicines, note to the pharmacy, charges, preview and send.
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Hourglass, Pill } from 'lucide-react';
import { FORM_UNIT, formatRupees, prettyDose, type OpVisit, type PrescriptionItem, type PrescriptionNote, type VisitCharges, type VisitFee } from '@platform/shared';
import { Button, Card, CardHeader, cn } from '@platform/ui';
import { api } from '@/core/api/client';
import { useCan } from '@/core/auth';
import { CounterNote } from './CounterNote';
import { Prescription } from './Prescription';
import { KeyHint } from './Shortcuts';
import { VisitChargesBox } from './VisitCharges';
import { VisitFeeEditor } from './VisitFee';
import { useVisitLab } from './VisitLab';
import { useVisitSend } from './VisitNext';
import { NoteLine, withNotes } from './PrescriptionNotes';
import type { PatientBills } from '@platform/shared';

const STEPS = ['Medicines', 'Note to pharmacy', 'Charges', 'Preview & send'];

export function RxStepper({ branch, visit, patientName, fee, onAdded }: { branch: string; visit: OpVisit; patientName: string; fee: VisitFee; onAdded: () => void }) {
  const consultationFeePaise = fee.consultationFeePaise;
  const canWrite = useCan('prescription.write');
  const canSend = useCan('patient.edit');
  const [step, setStep] = useState(0);
  const open = visit.status !== 'cancelled' && visit.status !== 'completed';
  // The same queries (and cache) as the cards of the steps: the preview follows every add and remove.
  const rx = useQuery({ queryKey: ['prescription', branch, visit.id], queryFn: () => api.get<{ items: PrescriptionItem[]; notes: PrescriptionNote[] }>(`/b/${branch}/visits/${visit.id}/prescription`) });
  const charges = useQuery({ queryKey: ['visit-charges', branch, visit.id], queryFn: () => api.get<VisitCharges>(`/b/${branch}/visits/${visit.id}/charges`), staleTime: 0 });
  const lab = useVisitLab(branch, visit.id);
  const send = useVisitSend(branch, visit, patientName);

  const items = (rx.data?.items ?? []).filter((i) => i.status !== 'declined');
  const medicinesPaise = items.filter((i) => i.status === 'pending').reduce((s, i) => s + i.quantity * i.pricePaise, 0);
  const extra = charges.data?.charges ?? [];
  const extraPaise = extra.reduce((s, c) => s + c.amountPaise, 0);
  const orders = (lab.data?.orders ?? []).filter((o) => o.status !== 'cancelled');
  const labPaise = orders.reduce((s, o) => s + o.pricePaise, 0);
  const testsToDo = orders.filter((o) => o.status !== 'completed').length;
  const withDoctor = visit.status === 'with_doctor';

  const medicinesList = (
    <ul className="divide-y divide-border">
      {items.length === 0 && <li className="px-4 py-3 text-sm text-muted">No medicines prescribed.</li>}
      {withNotes(items, rx.data?.notes ?? []).map((r) => r.type === 'note' ? (
        <li key={`n${r.note.id}`} className="px-4 py-2">
          <NoteLine note={r.note} />
        </li>
      ) : ((i) => (
        <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
          <span className="min-w-0">
            <span className="font-medium">
              {i.medicineName} {i.strength && <span className="font-normal text-muted">{i.strength}</span>}
            </span>
            <span className="block text-xs text-muted">
              {prettyDose(i.dose)} × {i.days} days{i.instructions ? ` · ${i.instructions}` : ''}
              {i.givenHere ? ' · given here' : ''}
            </span>
          </span>
          <span className="shrink-0 text-right tabular-nums">
            {i.quantity} {FORM_UNIT[i.form]}
            <span className="block text-xs text-muted">{formatRupees(i.quantity * i.pricePaise)}</span>
          </span>
        </li>
      ))(r.item))}
    </ul>
  );

  return (
    <div>
      {/* Four steps across the full width, any order: the one you are on is raised. A small figure says what is in each. */}
      <div role="tablist" aria-label="Prescription" className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-subtle/60 p-1 sm:grid-cols-4">
        {STEPS.map((x, i) => {
          const figure = [items.length || null, visit.pharmacyNote ? '✓' : null, extra.length ? extra.length : null, null][i];
          return (
            <button
              key={x}
              type="button"
              role="tab"
              aria-selected={i === step}
              onClick={() => setStep(i)}
              className={cn(
                'flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors',
                i === step ? 'bg-surface text-ink shadow-sm ring-1 ring-border' : 'text-muted hover:text-ink',
              )}
            >
              <span aria-hidden className={cn('flex size-5 items-center justify-center rounded-full text-[11px] font-semibold', i === step ? 'bg-brand text-white' : 'border border-border bg-surface text-muted')}>{i + 1}</span>
              {x}
              {figure != null && <span className={cn('rounded-full px-1.5 text-xs tabular-nums', i === step ? 'bg-brand-soft text-brand' : 'bg-border/70 text-muted')}>{figure}</span>}
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <>
          <Prescription branch={branch} visit={visit} onAdded={onAdded} hideNote withBookmarks={open} />
        </>
      )}

      {step === 1 && (
        <>
          <Prescription branch={branch} visit={visit} onAdded={onAdded} hideNote readOnly />
          <Card className="mt-4">
            <CardHeader title="Note to the pharmacy" description="Optional. The pharmacy reads it with these medicines." icon={Pill} iconTone="violet" />
            <CounterNote branch={branch} visit={visit} field="pharmacyNote" label="Note to pharmacy (optional)" placeholder="e.g. Give the generic brand. Explain the inhaler to the patient." canEdit={canWrite} />
          </Card>
        </>
      )}

      {step === 2 && (
        <div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <Card>
            <CardHeader title="Charges" description="The consultation fee of this visit, and other charges if needed (dressing, IV, injection…). The counter makes the bill and collects." />
            <div className="border-b border-border px-4 py-3">
              <VisitFeeEditor branch={branch} visitId={visit.id} fee={fee} cancelled={visit.status === 'cancelled' || visit.status === 'completed'} />
            </div>
            <div className="bg-subtle/40 px-4 py-1 text-xs font-semibold tracking-wide text-muted uppercase">Other charges</div>
            <VisitChargesBox branch={branch} visitId={visit.id} />
          </Card>
          <BalanceDue branch={branch} patientId={visit.patientId} />
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader title="Preview" description="Check everything, then create the prescription. The patient goes to the pharmacy and billing counter." />
          <Section title={`Medicines (${items.length})`} amount={medicinesPaise}>
            {medicinesList}
          </Section>
          <Section title="Note to the pharmacy">
            <p className="px-4 py-2 text-sm whitespace-pre-wrap">{visit.pharmacyNote || <span className="text-muted">No note.</span>}</p>
          </Section>
          <Section title={`Other charges (${extra.length})`} amount={extraPaise || undefined}>
            {extra.length === 0 ? (
              <p className="px-4 py-2 text-sm text-muted">None.</p>
            ) : (
              extra.map((c) => (
                <div key={c.key} className="flex justify-between px-4 py-1.5 text-sm">
                  <span>{c.description}</span>
                  <span className="tabular-nums">{formatRupees(c.amountPaise)}</span>
                </div>
              ))
            )}
          </Section>
          <Section title={`Lab tests (${orders.length})`} amount={labPaise || undefined}>
            {orders.length === 0 ? (
              <p className="px-4 py-2 text-sm text-muted">None ordered. Tests are ordered on the Lab tab.</p>
            ) : (
              <p className="px-4 py-2 text-sm">
                {orders.map((o) => o.testName).join(', ')}
                {testsToDo > 0 && <span className="block text-xs font-medium text-warning">{testsToDo} not done yet. To wait for the result, send the patient to the lab from the Lab tab instead.</span>}
              </p>
            )}
          </Section>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted">Consultation {formatRupees(consultationFeePaise)} + medicines + lab + other charges</span>
            <span className="text-2xl font-bold tabular-nums">{formatRupees(consultationFeePaise + medicinesPaise + labPaise + extraPaise)}</span>
          </div>
          {canSend && open && visit.status !== 'at_counter' && (
            <div className="flex flex-col gap-2 border-t border-border bg-subtle/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" disabled={send.isPending || !withDoctor} onClick={() => send.mutate('waiting')} title="Not finished. The patient keeps the token and waits outside.">
                <Hourglass /> Back to waiting
              </Button>
              <div className="flex flex-col items-stretch gap-1 sm:items-end">
                <Button data-shortcut="alt+s" className="h-11 px-5 text-base" disabled={send.isPending || !withDoctor} onClick={() => send.mutate('counter')}>
                  <Pill /> {send.isPending ? 'Sending…' : 'Create prescription & send to pharmacy'} <KeyHint>Alt+S</KeyHint>
                </Button>
                {!withDoctor && <span className="text-xs text-muted">Start the consultation first (the button at the bottom).</span>}
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="mt-4 flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft /> Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next: {STEPS[step + 1]} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

function Section({ title, amount, children }: { title: string; amount?: number; children: ReactNode }) {
  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between bg-subtle/40 px-4 py-1 text-xs font-semibold tracking-wide text-muted uppercase">
        <span>{title}</span>
        {amount != null && <span className="tabular-nums">{formatRupees(amount)}</span>}
      </div>
      {children}
    </div>
  );
}

/** Right of the charges: what this patient still owes, bill by bill, with the date. Only to see; the counter collects it. */
function BalanceDue({ branch, patientId }: { branch: string; patientId: number }) {
  const { data, isLoading } = useQuery({ queryKey: ['patient-bills', branch, patientId], queryFn: () => api.get<PatientBills>(`/b/${branch}/patients/${patientId}/bills`), staleTime: 0 });
  const due = data?.summary.balancePaise ?? 0;
  const unpaid = (data?.bills ?? []).filter((b) => b.balancePaise > 0);
  return (
    <Card className={due > 0 ? 'border-warning/50' : undefined}>
      <CardHeader
        title="Balance due"
        description={due > 0 ? 'Unpaid on earlier bills of this patient. The counter collects it with today’s bill.' : 'What this patient still owes.'}
        action={data && <span className={cn('text-xl font-bold tabular-nums', due > 0 ? 'text-warning' : 'text-muted')}>{due > 0 ? formatRupees(due) : 'Nothing due'}</span>}
      />
      {isLoading ? (
        <div className="p-4 text-sm text-muted">Loading…</div>
      ) : unpaid.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">No unpaid bills.</p>
      ) : (
        <ul className="divide-y divide-border">
          {unpaid.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="font-mono text-xs font-medium">{b.billNo}</span>
                <span className="block text-xs text-muted">
                  {new Date(`${b.billDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · bill {formatRupees(b.totalPaise)} · paid {formatRupees(b.paidPaise)}
                </span>
              </span>
              <span className="font-semibold text-warning tabular-nums">{formatRupees(b.balancePaise)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// The doctor's next step on the consultation screen: the slim "What next?" bar at the bottom.
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { FlaskConical, Hourglass, Pill, Stethoscope } from 'lucide-react';
import { formatRupees, type OpVisit, type PrescriptionItem, type VisitSendResponse, type VisitSendTo } from '@platform/shared';
import { Button, cn, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { useVisitLab } from './VisitLab';
import { tokenName, useCallNext, useVisitInvalidate } from './Visits';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const SENT: Record<VisitSendTo, string> = { lab: 'sent to the lab', counter: 'sent to pharmacy & billing', waiting: 'moved back to waiting' };

/**
 * Sticky bar at the bottom of the visit: what happens to this patient now. Each choice sends the patient
 * and calls the doctor's next one in. `nudge` changes when a medicine or a test was just added: the bar
 * is brought into view and lights up, so the next step is never missed.
 */
export function WhatNextBar({ branch, visit, patientName, consultationFeePaise, nudge }: { branch: string; visit: OpVisit; patientName: string; consultationFeePaise: number; nudge: number }) {
  const canEdit = useCan('patient.edit'); // the same permission as changing a visit's status
  const navigate = useNavigate();
  const invalidate = useVisitInvalidate(branch);
  const start = useCallNext(branch, { stay: true });
  // The same queries (and cache) as the Prescription and Lab tests cards: the counts follow every add / remove at once.
  const rx = useQuery({ queryKey: ['prescription', branch, visit.id], queryFn: () => api.get<{ items: PrescriptionItem[] }>(`/b/${branch}/visits/${visit.id}/prescription`), enabled: canEdit });
  const lab = useVisitLab(branch, visit.id, canEdit);

  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!nudge) return;
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setLit(true);
    const timer = setTimeout(() => setLit(false), 2500);
    return () => clearTimeout(timer);
  }, [nudge]);

  const who = tokenName({ ...visit, patientName });
  const send = useMutation({
    mutationFn: (to: VisitSendTo) => api.post<VisitSendResponse>(`/b/${branch}/visits/${visit.id}/send`, { to, callNext: true }),
    onSuccess: ({ visit: sent, next }, to) => {
      invalidate();
      // Already paid and nothing to give at the counter: the visit is done.
      const description = sent.status === 'completed' ? `${who}: visit completed, nothing to collect.` : `${who} ${SENT[to]}.`;
      if (next) {
        toast.success(next.reason === 'lab_ready' ? `Back from lab: ${tokenName(next.visit)}, result ready` : `Next: ${tokenName(next.visit)}`, { description, duration: 10_000 });
        navigate(`/${branch}/visits/${next.visit.id}`);
      } else {
        toast.success('No more patients waiting', { description, duration: 10_000 });
        navigate(`/${branch}/visits`);
      }
    },
    onError: (e) => {
      invalidate();
      toast.error(errorMessage(e));
    },
  });

  if (!canEdit || (visit.status !== 'with_doctor' && visit.status !== 'waiting' && visit.status !== 'at_lab')) return null;

  const medicines = rx.data ? rx.data.items.filter((i) => i.status === 'pending').length : visit.medicineCount;
  const orders = lab.data?.orders.filter((o) => o.status !== 'cancelled');
  const tests = orders ? orders.length : visit.lab.ordered + visit.lab.sampleCollected + visit.lab.completed;
  const testsToDo = orders ? orders.filter((o) => o.status !== 'completed').length : visit.lab.ordered + visit.lab.sampleCollected;
  const resultReady = tests > 0 && testsToDo === 0;

  // One slim row. Above the phone's bottom menu; at the bottom edge on wider screens.
  const shell = cn(
    'sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-6 flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-md transition-shadow md:bottom-4 md:flex-row md:items-center md:justify-between',
    lit && 'ring-2 ring-brand/50',
  );

  if (visit.status !== 'with_doctor') {
    const atLab = visit.status === 'at_lab';
    return (
      <div ref={ref} className={shell} role="region" aria-label="What next">
        <div className="min-w-0 text-sm">
          <span className="font-semibold">{atLab ? (resultReady ? `${who} is back from the lab — result ready` : `${who} is at the lab`) : `${who} is waiting`}</span>
          {atLab && !resultReady && <span className="text-muted"> · {tests - testsToDo} of {tests} results ready</span>}
        </div>
        <Button disabled={start.isPending} onClick={() => start.mutate({ visitId: visit.id })}>
          <Stethoscope /> {start.isPending ? 'Starting…' : 'Start consultation'}
        </Button>
      </div>
    );
  }

  // One obvious button: the lab while a test is still to be done and nothing is prescribed; otherwise the counter.
  const labFirst = testsToDo > 0 && medicines === 0;
  const pays = [medicines > 0 ? plural(medicines, 'medicine') : null, tests > 0 ? plural(tests, 'lab test') : null, consultationFeePaise > 0 ? `consultation ${formatRupees(consultationFeePaise)}` : null].filter(Boolean);
  const busy = send.isPending;

  return (
    <div ref={ref} className={shell} role="region" aria-label="What next">
      <div className="min-w-0 text-sm md:flex-1 md:truncate">
        <span className="font-semibold">Next for {who}</span>
        <span className="text-muted"> · {pays.length ? pays.join(' · ') : 'nothing to pay'}</span>
      </div>
      {/* Each choice also calls this doctor's next patient in. */}
      <div className="flex flex-wrap gap-2 md:shrink-0 md:flex-nowrap">
        <Button variant="ghost" disabled={busy} onClick={() => send.mutate('waiting')} title="Not finished. The patient keeps the token and waits outside.">
          <Hourglass /> Back to waiting
        </Button>
        <Button variant={labFirst ? 'default' : 'outline'} disabled={busy || testsToDo === 0} onClick={() => send.mutate('lab')} title={testsToDo > 0 ? 'The patient comes back in when the result is ready.' : 'Order a test first (Lab tab)'}>
          <FlaskConical /> Send to lab{testsToDo > 0 ? ` (${plural(testsToDo, 'test')})` : ''}
        </Button>
        <Button variant={labFirst ? 'outline' : 'default'} disabled={busy} onClick={() => send.mutate('counter')} title="The patient pays and collects medicines at the counter.">
          <Pill /> Send to pharmacy &amp; billing
        </Button>
      </div>
    </div>
  );
}

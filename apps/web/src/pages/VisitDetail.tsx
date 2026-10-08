import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, FlaskConical, Pill } from 'lucide-react';
import type { OpVisit, Patient, VisitFee } from '@platform/shared';
import { Avatar, Badge, Card, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { ConditionBadges } from '@/components/Conditions';
import { Prescription } from '@/components/Prescription';
import { VisitBill } from '@/components/VisitBill';
import { VisitFeeEditor } from '@/components/VisitFee';
import { useVisitLab, VisitLab } from '@/components/VisitLab';
import { WhatNextBar } from '@/components/VisitNext';
import { TokenBadge, VisitActions, VisitStatusBadge, vitalsSummary } from '@/components/Visits';
import { ageOf } from './Patients';

const TAB = 'h-10 px-5 text-base';

/** The consultation screen for one OP visit: who and why on top, then the OP tab (prescription, bill) and the Lab tab. */
export function VisitDetail() {
  const { branch, visitId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'lab' ? 'lab' : 'op';
  const { data, isLoading, error } = useQuery({
    queryKey: ['visit', branch, visitId],
    queryFn: () => api.get<{ visit: OpVisit; patient: Pick<Patient, 'id' | 'name' | 'uhid' | 'gender' | 'ageYears' | 'dob' | 'phone' | 'conditions'>; fee: VisitFee }>(`/b/${branch}/visits/${visitId}`),
  });
  // Goes up when a medicine or a test was just added: the "What next?" bar lights up.
  const [nudge, setNudge] = useState(0);
  const added = () => setNudge((n) => n + 1);

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Card className="p-6 text-sm">{errorMessage(error)}</Card>;
  const { visit: v, patient: p } = data;
  const age = ageOf(p);
  const vitals = vitalsSummary(v);

  return (
    // Keyed by visit: "see next patient" goes straight from one visit to the next, and nothing typed for the last patient may carry over.
    <div key={v.id}>
      <Link to={`/${branch}/visits`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> OP visits
      </Link>

      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar name={p.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/${branch}/patients/${p.id}`} className="truncate text-xl font-semibold tracking-tight hover:underline">
                {p.name}
              </Link>
              <VisitStatusBadge status={v.status} labReady={v.labReady} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <TokenBadge opNo={v.opNo} token={v.token} className="px-2.5 py-1 text-sm" />
              <Badge className="font-mono">{v.opNo}</Badge>
              <Badge className="font-mono">{p.uhid}</Badge>
              {age != null && <span>{age} yrs</span>}
              {p.gender && <span className="capitalize">· {p.gender}</span>}
              <span>· {v.doctorName ? `Dr. ${v.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'No doctor assigned'}</span>
            </div>
            <ConditionBadges conditions={p.conditions} className="mt-2" />
          </div>
          {/* Calling the patient in is the "Start consultation" button of the bar at the bottom. */}
          <VisitActions branch={branch!} visit={v} label={p.name} callIn={false} />
        </div>
        {/* This visit at a glance: why they came, what was measured, what the consultation costs. */}
        <dl className="grid gap-x-6 gap-y-2 border-t border-border bg-brand-soft px-5 py-3 text-sm sm:grid-cols-[1.4fr_1fr_auto] sm:items-center">
          <div>
            <dt className="text-xs font-medium text-muted">Complaint</dt>
            <dd className="text-base font-semibold">{v.complaint ?? <span className="font-normal text-muted">Not noted</span>}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Vitals</dt>
            <dd className="font-medium tabular-nums">{vitals || <span className="font-normal text-muted">Not taken</span>}</dd>
          </div>
          <div>
            <VisitFeeEditor branch={branch!} visitId={v.id} fee={data.fee} cancelled={v.status === 'cancelled'} />
          </div>
          {v.notes && (
            <div className="sm:col-span-3">
              <dt className="text-xs font-medium text-muted">Notes</dt>
              <dd className="whitespace-pre-wrap">{v.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Tabs value={tab} onValueChange={(t) => setParams(t === 'lab' ? { tab: 'lab' } : {}, { replace: true })}>
        <TabsList className="mb-4 h-12">
          <TabsTrigger value="op" className={TAB}>
            <Pill className="size-4" /> OP
            {v.medicineCount > 0 && <Badge tone="violet">{v.medicineCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="lab" className={TAB}>
            <FlaskConical className="size-4" /> Lab
            <LabTabMark branch={branch!} visit={v} />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="op">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Prescription branch={branch!} visit={v} onAdded={added} />
            </div>
            <VisitBill branch={branch!} visitId={v.id} />
          </div>
        </TabsContent>
        <TabsContent value="lab">
          <VisitLab branch={branch!} visit={v} onOrdered={added} />
        </TabsContent>
      </Tabs>

      <WhatNextBar branch={branch!} visit={v} patientName={p.name} consultationFeePaise={data.fee.consultationFeePaise} nudge={nudge} />
    </div>
  );
}

/** On the Lab tab's label: how many tests, or that the result is back. */
function LabTabMark({ branch, visit }: { branch: string; visit: OpVisit }) {
  const orders = useVisitLab(branch, visit.id).data?.orders.filter((o) => o.status !== 'cancelled');
  const tests = orders ? orders.length : visit.lab.ordered + visit.lab.sampleCollected + visit.lab.completed;
  if (!tests) return null;
  const ready = orders ? orders.every((o) => o.status === 'completed') : visit.labReady;
  return <Badge tone={ready ? 'positive' : 'warning'}>{ready ? 'Result ready' : tests}</Badge>;
}

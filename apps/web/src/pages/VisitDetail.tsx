import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, FlaskConical, History, Pill, Printer, Syringe, Wallet } from 'lucide-react';
import { CourseTab } from '@/components/Courses';
import { useModuleOn } from '@/state/auth';
import { formatRupees, type OpBill, type OpVisit, type Patient, type PatientBills, type PrescriptionItem, type VisitFee } from '@platform/shared';
import { Avatar, Badge, Button, buttonVariants, Card, CardHeader, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@platform/ui';
import { VisitBill } from '@/components/VisitBill';
import { api, errorMessage } from '@/api/client';
import { ConditionBadges } from '@/components/Conditions';
import { Prescription } from '@/components/Prescription';
import { RxStepper } from '@/components/RxStepper';
import { SendToLab } from '@/components/VisitNext';
import { BookmarkSearch, VisitInstructions } from '@/components/Bookmarks';
import { useVisitLab, VisitLab } from '@/components/VisitLab';
import { WhatNextBar } from '@/components/VisitNext';
import { TokenBadge, VisitActions, VisitStatusBadge, vitalsSummary } from '@/components/Visits';
import { ageOf } from './Patients';
import { fmtDateTime, fmtDay } from '@/components/format';

const OPEN_KEY = 'hms-visit-profile-open';

// The tab you are on is filled with the brand colour: no doubt which one is open.
const TAB = 'h-8 gap-1.5 px-3.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm';

/** The consultation screen for one OP visit: who and why on top, then the OP tab (prescription, bill) and the Lab tab. */
export function VisitDetail() {
  const { branch, visitId } = useParams();
  const [params, setParams] = useSearchParams();
  const labOn = useModuleOn('lab');
  const coursesOn = useModuleOn('courses');
  const tab = params.get('tab') === 'lab' && labOn ? 'lab' : params.get('tab') === 'course' && coursesOn ? 'course' : 'op';
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

  return (
    // Keyed by visit: "see next patient" goes straight from one visit to the next, and nothing typed for the last patient may carry over.
    <div key={v.id}>
      {/* Back is the breadcrumb on top (OP visits › Details); phones have no top breadcrumb, so a short one here. */}
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-sm text-muted md:hidden">
        <Link to={`/${branch}/visits`} className="font-medium text-brand hover:underline">
          OP visits
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-ink">Details</span>
      </nav>

      <PatientHeader branch={branch!} v={v} p={p} />
      {v.status === 'completed' ? (
        <CompletedVisit branch={branch!} visit={v} />
      ) : (
      <Tabs value={tab} onValueChange={(t) => setParams(t === 'op' ? {} : { tab: t }, { replace: true })}>
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="op" className={TAB}>
            <Pill className="size-4" /> OP
            {v.medicineCount > 0 && <Badge tone="violet">{v.medicineCount}</Badge>}
          </TabsTrigger>
          {labOn && (
            <TabsTrigger value="lab" className={TAB}>
              <FlaskConical className="size-4" /> Lab
              <LabTabMark branch={branch!} visit={v} />
            </TabsTrigger>
          )}
          {coursesOn && (
            <TabsTrigger value="course" className={TAB}>
              <Syringe className="size-4" /> Course
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="op">
          <RxStepper branch={branch!} visit={v} patientName={p.name} fee={data.fee} onAdded={added} />
        </TabsContent>
        <TabsContent value="lab">
          <VisitLab branch={branch!} visit={v} onOrdered={added} />
          <SendToLab branch={branch!} visit={v} patientName={p.name} />
        </TabsContent>
        <TabsContent value="course">
          <CourseTab branch={branch!} visit={v} />
        </TabsContent>
      </Tabs>
      )}

      {v.status !== 'completed' && <WhatNextBar branch={branch!} visit={v} patientName={p.name} consultationFeePaise={data.fee.consultationFeePaise} nudge={nudge} />}
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

/**
 * Who and why, small: one line for the patient, one strip for this visit (complaint, vitals, last visit, what is
 * still owed and since when, the fee). "Details" opens the rest (every earlier visit, notes); remembered here.
 */
function PatientHeader({ branch, v, p }: { branch: string; v: OpVisit; p: Pick<Patient, 'id' | 'name' | 'uhid' | 'gender' | 'ageYears' | 'dob' | 'phone' | 'conditions'> }) {
  const [open, setOpenState] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const setOpen = (o: boolean) => {
    setOpenState(o);
    try {
      localStorage.setItem(OPEN_KEY, o ? '1' : '0');
    } catch {
      /* private window */
    }
  };
  // Same requests as the earlier-visits list below (one call each, shared).
  const visits = useQuery({ queryKey: ['patient-visits', branch, p.id, 'record'], queryFn: () => api.get<{ visits: OpVisit[] }>(`/b/${branch}/patients/${p.id}/visits`), staleTime: 0 });
  const bills = useQuery({ queryKey: ['patient-bills', branch, p.id], queryFn: () => api.get<PatientBills>(`/b/${branch}/patients/${p.id}/bills`), staleTime: 0 });
  const last = (visits.data?.visits ?? []).find((x) => x.id !== v.id && x.status !== 'cancelled');
  const due = (bills.data?.bills ?? []).filter((b) => b.balancePaise > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const duePaise = due.reduce((sum, b) => sum + b.balancePaise, 0);
  const age = ageOf(p);
  const vitals = vitalsSummary(v);
  return (
    <>
      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Avatar name={p.name} />
          <div className="min-w-[13rem] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/${branch}/patients/${p.id}`} className="truncate text-lg font-semibold tracking-tight hover:underline">
                {p.name}
              </Link>
              <TokenBadge opNo={v.opNo} token={v.token} className="px-2 py-0.5 text-sm" />
              <VisitStatusBadge status={v.status} labReady={v.labReady} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span className="font-mono text-xs">{p.uhid}</span>
              {age != null && <span>· {age} yrs</span>}
              {p.gender && <span className="capitalize">· {p.gender}</span>}
              <span>· {v.doctorName ? `Dr. ${v.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'No doctor assigned'}</span>
              <ConditionBadges conditions={p.conditions} />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open} title="The last visit, notes, who started this visit">
              {open ? <ChevronUp /> : <ChevronDown />} {open ? 'Less' : 'Details'}
            </Button>
            {/* Calling the patient in is the "Start consultation" button of the bar at the bottom. */}
            <VisitActions branch={branch} visit={v} label={p.name} callIn={false} />
          </div>
        </div>
        {/* No coloured band: the complaint and the vitals are what the doctor reads first. The last visit is under Details. */}
        <div className="grid gap-x-8 gap-y-2 border-t border-border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted">Complaint</div>
            <div className="text-base font-semibold break-words">{v.complaint ?? <span className="font-normal text-muted">Not noted</span>}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted">Vitals</div>
            <div className="text-base font-semibold break-words tabular-nums">{vitals || <span className="font-normal text-muted">Not taken</span>}</div>
          </div>
          {duePaise > 0 && (
            <div className="flex items-center gap-1.5 self-center rounded-lg bg-critical-soft px-3 py-1.5 text-sm text-critical" title={due.map((b) => `${b.billNo}: ${formatRupees(b.balancePaise)} since ${fmtDay(b.billDate)}`).join('\n')}>
              <Wallet className="size-4" />
              <span className="font-semibold tabular-nums">{formatRupees(duePaise)} due</span>
              <span>since {fmtDay(due[0]!.billDate)}</span>
            </div>
          )}
        </div>
        {open && (
          <div className="space-y-2 border-t border-border px-4 py-3 text-sm">
            <div className="text-xs text-muted">
              OP visit {v.opNo} started {fmtDateTime(v.createdAt)}
              {v.createdByName && ` by ${v.createdByName}`}
              {p.phone && ` · ${p.phone}`}
            </div>
            {v.notes && (
              <div>
                <span className="text-xs font-medium text-muted">Notes: </span>
                <span className="whitespace-pre-wrap">{v.notes}</span>
              </div>
            )}
            {due.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {due.map((b) => (
                  <li key={b.id}>
                    <Badge tone="critical">
                      {b.billNo} · {formatRupees(b.balancePaise)} due since {fmtDay(b.billDate)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {open && <LastVisit branch={branch} patientId={p.id} last={last} loading={visits.isLoading} />}
      </Card>
    </>
  );
}

/** Inside the header when "Details" is open: only the last earlier visit, and a link to all of them on the patient page. */
function LastVisit({ branch, patientId, last, loading }: { branch: string; patientId: number; last: OpVisit | undefined; loading: boolean }) {
  const rx = useQuery({
    queryKey: ['prescription', branch, last?.id],
    queryFn: () => api.get<{ items: PrescriptionItem[] }>(`/b/${branch}/visits/${last!.id}/prescription`),
    enabled: !!last,
  });
  const meds = (rx.data?.items ?? []).filter((i) => i.status !== 'declined');
  const vitals = last ? vitalsSummary(last) : '';
  return (
    <div className="border-t border-border bg-subtle/40 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
          <History className="size-3.5" /> Last visit
        </span>
        <Link to={`/${branch}/patients/${patientId}?tab=visits`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          View all visits <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {loading ? (
        <Skeleton className="h-14" />
      ) : !last ? (
        <p className="text-sm text-muted">This is the first visit of this patient.</p>
      ) : (
        <Link to={`/${branch}/visits/${last.id}`} className="block rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-brand/40">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{fmtDay(last.visitDate)}</span>
            <span className="text-muted">· {last.complaint ?? 'No reason noted'}</span>
            {last.doctorName && <span className="text-muted">· Dr. {last.doctorName.replace(/^Dr\.?\s*/i, '')}</span>}
            <VisitStatusBadge status={last.status} labReady={last.labReady} />
          </div>
          {vitals && <div className="mt-1 text-xs text-muted tabular-nums">Vitals: {vitals}</div>}
          <div className="mt-1 text-xs text-muted">
            {meds.length ? `Medicines: ${meds.map((m) => m.medicineName).join(', ')}` : rx.isLoading ? 'Loading medicines…' : 'No medicines'}
            {last.lab.ordered > 0 && ` · Lab: ${last.lab.ordered} test${last.lab.ordered === 1 ? '' : 's'}`}
          </div>
        </Link>
      )}
    </div>
  );
}

/**
 * A completed visit: what happened, at a glance, and nothing to change. The figures on top, then the
 * prescription, the lab and the bill side by side.
 */
function CompletedVisit({ branch, visit }: { branch: string; visit: OpVisit }) {
  const rx = useQuery({ queryKey: ['prescription', branch, visit.id], queryFn: () => api.get<{ items: PrescriptionItem[] }>(`/b/${branch}/visits/${visit.id}/prescription`) });
  const lab = useVisitLab(branch, visit.id);
  const bills = useQuery({ queryKey: ['visit-bills', branch, visit.id], queryFn: () => api.get<{ bills: OpBill[] }>(`/b/${branch}/visits/${visit.id}/bills`) });
  const items = (rx.data?.items ?? []).filter((i) => i.status !== 'declined');
  const orders = (lab.data?.orders ?? []).filter((o) => o.status !== 'cancelled');
  const billed = (bills.data?.bills ?? []).reduce((s, b) => s + b.totalPaise, 0);
  const paid = (bills.data?.bills ?? []).reduce((s, b) => s + b.paidPaise, 0);
  const stats: { label: string; value: string; note: string; tone?: string }[] = [
    { label: 'Medicines', value: String(items.length), note: items.length ? `${items.filter((i) => i.status === 'dispensed').length} given out` : 'None prescribed' },
    { label: 'Lab tests', value: String(orders.length), note: orders.length ? `${orders.filter((o) => o.status === 'completed').length} with results` : 'None ordered' },
    { label: 'Billed', value: formatRupees(billed), note: `${(bills.data?.bills ?? []).length} bill${(bills.data?.bills ?? []).length === 1 ? '' : 's'}` },
    { label: billed - paid > 0 ? 'Still due' : 'Paid', value: formatRupees(billed - paid > 0 ? billed - paid : paid), note: billed - paid > 0 ? 'Collect in Billing → Pending payments' : 'Fully paid', tone: billed - paid > 0 ? 'text-critical' : 'text-positive' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-positive/30 bg-positive-soft px-4 py-3">
        <div className="flex items-center gap-2.5 text-positive">
          <CheckCircle2 className="size-5" />
          <span className="font-semibold">Visit completed</span>
          <span className="text-sm">· final, can only be read</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/${branch}/visits/${visit.id}/bill/print`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            <Printer /> Print bill
          </Link>
          {orders.some((o) => o.status === 'completed') && (
            <Link to={`/${branch}/lab/visits/${visit.id}/print`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              <FlaskConical /> Lab report
            </Link>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((x) => (
          <Card key={x.label} className="px-4 py-3">
            <div className="text-xs font-medium text-muted">{x.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${x.tone ?? ''}`}>{x.value}</div>
            <div className="text-xs text-muted">{x.note}</div>
          </Card>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Prescription branch={branch} visit={visit} onAdded={() => {}} hideNote readOnly />
        <div className="space-y-4">
          <VisitBill branch={branch} visitId={visit.id} />
          {orders.length > 0 && (
            <Card>
              <CardHeader title={`Lab tests (${orders.length})`} icon={FlaskConical} iconTone="violet" />
              <ul className="divide-y divide-border text-sm">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="font-medium">{o.testName}</span>
                    <Badge tone={o.status === 'completed' ? 'positive' : 'warning'} dot>
                      {o.status === 'completed' ? 'Result ready' : o.status === 'sample_collected' ? 'Sample collected' : 'Waiting for sample'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {visit.pharmacyNote && (
            <Card className="px-4 py-3 text-sm">
              <div className="text-xs font-medium text-muted">Note to the pharmacy</div>
              <div className="mt-1 whitespace-pre-wrap">{visit.pharmacyNote}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

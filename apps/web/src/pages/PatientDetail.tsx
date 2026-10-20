import { formatRupees, ageInfo, GENDER_LABEL } from '@platform/shared';
import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarClock, ClipboardPlus, Droplet, Mail, MapPin, MessageCircle, MoreHorizontal, Pencil, Phone, PhoneCall, Scale, Stethoscope, UserRound, Ban, ReceiptText } from 'lucide-react';
import { DirectLab } from '@/components/DirectLab';
import { PayDues } from '@/components/PayDues';
import type { OpVisit, Patient } from '@platform/shared';
import {
  Avatar,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  toast,
  Field,
  Textarea,
} from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan, useMe } from '@/state/auth';
import { ConditionBadges } from '@/components/Conditions';
import { PatientForm } from '@/components/PatientForm';
import { NewVisitForm, TokenBadge, VisitActions, VisitStatusBadge, vitalsSummary } from '@/components/Visits';
import { ageOf, formatPhone } from './Patients';
import { billsInDays, DayRangeFilter, labInDays, PatientBillsTab, PatientLabTab, usePatientBills, usePatientLab } from './PatientTabs';
import { fmtDate, inDays, istDay } from '@/components/format';
import { BookmarkSearch } from '@/components/Bookmarks';

/** Free WhatsApp click-to-chat: opens WhatsApp with the message ready; staff press send. */
function whatsAppLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}


export function PatientDetail() {
  const { branch, id } = useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = useCan('patient.edit');
  // Deactivating and activating a patient: the doctor and whoever manages the branch.
  const canSteward = [useCan('prescription.write'), useCan('settings.manage')].some(Boolean);
  const canCreate = useCan('patient.create');
  const canBill = useCan('billing.receive');
  const [billing, setBilling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [reason, setReason] = useState('');
  const [startingVisit, setStartingVisit] = useState(false);
  // ?tab=visits opens a tab straight away (the "View all visits" link of a visit).
  const [params] = useSearchParams();
  const [tab, setTab] = useState(() => params.get('tab') ?? 'overview');
  const [range, setRange] = useState({ from: '', to: '' });

  const visits = useQuery({
    queryKey: ['patient-visits', branch, id],
    queryFn: () => api.get<{ visits: OpVisit[] }>(`/b/${branch}/patients/${id}/visits`),
  });
  const bills = usePatientBills(branch, id);
  const lab = usePatientLab(branch, id);

  const key = ['patient', branch, id];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => api.get<{ patient: Patient }>(`/b/${branch}/patients/${id}`),
    retry: (n, err) => !(err instanceof ApiError && err.status < 500) && n < 1,
  });

  // What the patient still owes: it is collected before the patient can be deactivated.
  const owes = bills.data?.summary.balancePaise ?? 0;
  const setActive = useMutation({
    mutationFn: (why: string | null) => (why == null ? api.post(`/b/${branch}/patients/${id}/activate`) : api.post(`/b/${branch}/patients/${id}/deactivate`, { reason: why })),
    onSuccess: (_d, why) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['patients', branch] });
      toast.success(why == null ? `${data?.patient.name} is active again` : `${data?.patient.name} deactivated`);
      setDeactivating(false);
      setReason('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const back = (
    <Link to={`/${branch}/patients`} className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-base font-medium text-ink shadow-sm hover:bg-subtle">
      <ArrowLeft className="size-4" /> All patients
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div>
        {back}
        <Card>
          <EmptyState icon={UserRound} title="Patient not found" description={errorMessage(error)} />
        </Card>
      </div>
    );
  }

  const p = data.patient;
  const age = ageOf(p);
  // The Visits, Bills and Lab tabs show only the chosen days (and count only those).
  const filtered = !!(range.from || range.to);
  const shownVisits = visits.data?.visits.filter((v) => inDays(v.visitDate, range.from, range.to));
  const shownBills = bills.data && billsInDays(bills.data, range);
  // A bookmark's medicines and instructions belong to a visit: today's open one, if there is one.
  const openVisit = visits.data?.visits.find((v) => v.visitDate === istDay(new Date().toISOString()) && v.status !== 'completed' && v.status !== 'cancelled');

  return (
    <div>
      {back}

      {/* Profile header */}
      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={p.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="font-mono">{p.uhid}</Badge>
              {ageInfo(p) && (
                <>
                  <Badge tone="brand">{ageInfo(p)!.text}</Badge>
                  <Badge tone={ageInfo(p)!.child ? 'warning' : 'neutral'}>{ageInfo(p)!.child ? 'Child' : 'Adult'}</Badge>
                </>
              )}
              {p.gender && (
                <Badge tone={p.gender.startsWith('female') ? 'violet' : p.gender.startsWith('male') ? 'brand' : 'neutral'}>
                  {GENDER_LABEL[p.gender]}
                </Badge>
              )}
              {p.bloodGroup && <Badge tone="critical">{p.bloodGroup}</Badge>}
              {!!bills.data?.summary.balancePaise && (
                <Badge tone="critical" dot>
                  Balance due {formatRupees(bills.data.summary.balancePaise)}
                </Badge>
              )}
              <span className="text-xs text-muted">Registered {fmtDate(p.createdAt)}</span>
            </div>
            <ConditionBadges conditions={p.conditions} className="mt-2" />
            {p.deactivatedAt && (
              <div role="alert" className="mt-2 rounded-lg border border-critical/30 bg-critical-soft px-3 py-2 text-sm text-critical">
                <b>Deactivated</b> on {fmtDate(p.deactivatedAt)}: {p.deactivatedReason}
                <span className="block text-xs">No new OP visit, medicine, lab test or bill until a doctor or the admin activates the patient.</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canBill && <PayDues branch={branch!} patientId={p.id} patientName={p.name} duePaise={owes} />}
            {canBill && !p.deactivatedAt && (
              <Button variant="outline" onClick={() => setBilling(true)} title="A bill without seeing the doctor (dressing, injection…): no consultation fee.">
                <ReceiptText /> Create bill
              </Button>
            )}
            {canCreate && !p.deactivatedAt && (
              <Button onClick={() => setStartingVisit(true)}>
                <ClipboardPlus /> New OP visit
              </Button>
            )}
            {p.deactivatedAt && canSteward && (
              <Button disabled={setActive.isPending} onClick={() => setActive.mutate(null)}>
                <UserRound /> Activate patient
              </Button>
            )}
            {p.phone && (
              <a href={whatsAppLink(p.phone, `Hello ${p.name}, this is ${me?.organization.name}.`)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline' })}>
                <MessageCircle className="text-positive" /> WhatsApp
              </a>
            )}
            {canEdit && !p.deactivatedAt && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {canSteward && !p.deactivatedAt && (
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent align="end">
                  <MenuItem destructive onSelect={() => setDeactivating(true)}>
                    <Ban /> Deactivate patient
                  </MenuItem>
                </MenuContent>
              </Menu>
            )}
          </div>
        </div>
      </Card>

      <BookmarkSearch
        branch={branch!}
        visitId={openVisit?.id ?? null}
        where={openVisit ? `Goes onto today's visit${openVisit.token != null ? ` · Token ${openVisit.token}` : ''} · ${openVisit.opNo}` : 'No open visit today: start an OP visit first, then add a bookmark.'}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">
            Visits{shownVisits ? <span className="text-xs text-muted">{shownVisits.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="bills">
            Bills{shownBills ? <span className="text-xs text-muted">{shownBills.bills.length + (shownBills.pharmacy?.length ?? 0)}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="lab">
            Lab{lab.data ? <span className="text-xs text-muted">{labInDays(lab.data.orders, range).length}</span> : null}
          </TabsTrigger>
        </TabsList>
        {tab !== 'overview' && <DayRangeFilter value={range} onChange={setRange} />}

        <TabsContent value="overview" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Contact" icon={Phone} />
            <dl className="divide-y divide-border">
              <Row icon={Phone} label="Mobile" value={p.phone ? formatPhone(p.phone) : null} />
              <Row icon={Mail} label="Email" value={p.email} />
              <Row icon={MapPin} label="Address" value={p.address} />
            </dl>
          </Card>
          <Card>
            <CardHeader title="Personal & medical" icon={Stethoscope} iconTone="violet" />
            <dl className="divide-y divide-border">
              <Row icon={CalendarClock} label="Date of birth" value={p.dob ? `${fmtDate(p.dob)}${age != null ? ` (${age} yrs)` : ''}` : age != null ? `${age} yrs (no date of birth)` : null} />
              <Row icon={UserRound} label="Gender" value={p.gender ? p.gender[0]!.toUpperCase() + p.gender.slice(1) : null} />
              <Row icon={Droplet} label="Blood group" value={p.bloodGroup} />
              <Row icon={Scale} label="Weight" value={p.weightKg != null ? `${p.weightKg} kg` : null} />
              <Row icon={Scale} label="Height" value={p.heightCm != null ? `${p.heightCm} cm` : null} />
            </dl>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader title="Emergency contact" icon={PhoneCall} iconTone="critical" />
            <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <Row icon={UserRound} label="Name" value={p.emergencyContactName} />
              <Row icon={Phone} label="Phone" value={p.emergencyContactPhone ? formatPhone(p.emergencyContactPhone) : null} />
            </dl>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            {visits.isLoading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : filtered && visits.data?.visits.length && !shownVisits?.length ? (
              <EmptyState icon={Stethoscope} title="No OP visits in these dates" description="Change or clear the dates to see other visits." />
            ) : !shownVisits?.length ? (
              <EmptyState
                icon={Stethoscope}
                title="No OP visits yet"
                description="Start an OP visit when the patient comes in. It gets the next token for today."
                action={canCreate && !p.deactivatedAt && <Button size="sm" variant="outline" onClick={() => setStartingVisit(true)}><ClipboardPlus /> New OP visit</Button>}
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Token · OP no.</TH>
                    <TH>Date</TH>
                    <TH>Doctor</TH>
                    <TH>Complaint & vitals</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                    <TH />
                  </tr>
                </THead>
                <TBody>
                  {shownVisits.map((v) => (
                    <TR key={v.id} onOpen={() => navigate(`/${branch}/visits/${v.id}`)}>
                      <TD className="whitespace-nowrap">
                        <TokenBadge opNo={v.opNo} token={v.token} />
                        <Link to={`/${branch}/visits/${v.id}`} className="mt-1 block font-mono text-xs font-medium text-brand hover:underline">
                          {v.opNo}
                        </Link>
                      </TD>
                      <TD className="whitespace-nowrap text-muted">{fmtDate(v.visitDate)}</TD>
                      <TD className="whitespace-nowrap">{v.doctorName ?? <span className="text-muted">Not assigned</span>}</TD>
                      <TD className="max-w-sm">
                        <div className="truncate">{v.complaint ?? <span className="text-muted">—</span>}</div>
                        {vitalsSummary(v) && <div className="truncate text-xs text-muted tabular-nums">{vitalsSummary(v)}</div>}
                        {v.notes && <div className="truncate text-xs text-muted italic">{v.notes}</div>}
                      </TD>
                      <TD><VisitStatusBadge status={v.status} labReady={v.labReady} /></TD>
                      <TD><VisitActions branch={branch!} visit={v} label={p.name} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="bills">
          <PatientBillsTab branch={branch!} query={bills} range={range} />
        </TabsContent>
        <TabsContent value="lab">
          <PatientLabTab branch={branch!} query={lab} range={range} />
        </TabsContent>
      </Tabs>

      <Dialog open={editing} onOpenChange={setEditing} title="Edit patient" description={`${p.name} · ${p.uhid}`}>
        <PatientForm
          initial={p}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            const res = await api.patch<{ patient: Patient }>(`/b/${branch}/patients/${id}`, values);
            qc.setQueryData(key, res);
            qc.invalidateQueries({ queryKey: ['patients', branch] });
            setEditing(false);
            toast.success('Changes saved');
          }}
        />
      </Dialog>

      {canBill && <DirectLab mode="bill" branch={branch!} patient={p} open={billing} onClose={() => setBilling(false)} />}
      <Dialog open={startingVisit} onOpenChange={setStartingVisit} title="New OP visit" description={`${p.name} · ${p.uhid} — the token and OP number are assigned automatically.`}>
        <NewVisitForm
          branch={branch!}
          patientId={p.id}
          onCancel={() => setStartingVisit(false)}
          onDone={(visit) => {
            setStartingVisit(false);
            navigate(`/${branch}/visits/${visit.id}`);
          }}
        />
      </Dialog>

      <Dialog open={deactivating} onOpenChange={setDeactivating} title={`Deactivate ${p.name}?`} description="Everyone still sees the patient and their history. No new OP visit, medicine, lab test or bill can be made until a doctor or the admin activates the patient again.">
        {owes > 0 && (
          <div role="alert" className="mb-4 rounded-lg border border-critical/30 bg-critical-soft px-3 py-2 text-sm text-critical">
            <b>This patient still owes {formatRupees(owes)}.</b> Collect it first in{' '}
            <Link to={`/${branch}/billing?tab=pending`} className="font-medium underline">
              Billing → Pending payments
            </Link>
            , then deactivate.
          </div>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!owes && reason.trim().length >= 3 && !setActive.isPending) setActive.mutate(reason.trim());
          }}
        >
          <Field required label="Reason" htmlFor="deactivate-reason" hint="Shown to everyone who opens this patient.">
            <Textarea id="deactivate-reason" autoFocus rows={2} maxLength={300} placeholder="e.g. Registered twice: use AH000123. / Patient has passed away." value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeactivating(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={owes > 0 || reason.trim().length < 3 || setActive.isPending}>
              {setActive.isPending ? 'Saving…' : 'Deactivate patient'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <dt className="w-28 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm font-medium break-words">{value || <span className="font-normal text-muted">Not added</span>}</dd>
    </div>
  );
}

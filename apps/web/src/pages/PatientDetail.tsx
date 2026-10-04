import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarClock, ClipboardPlus, Droplet, Mail, MapPin, MessageCircle, MoreHorizontal, Pencil, Phone, PhoneCall, Scale, Stethoscope, Trash2, UserRound } from 'lucide-react';
import type { OpVisit, Patient } from '@platform/shared';
import {
  Avatar,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardHeader,
  ConfirmDelete,
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
} from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan, useMe } from '@/state/auth';
import { PatientForm } from '@/components/PatientForm';
import { NewVisitForm, TokenBadge, VisitActions, VisitStatusBadge, vitalsSummary } from '@/components/Visits';
import { ageOf, formatPhone } from './Patients';
import { PatientBillsTab, PatientLabTab, usePatientBills, usePatientLab } from './PatientTabs';

/** Free WhatsApp click-to-chat: opens WhatsApp with the message ready; staff press send. */
function whatsAppLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function PatientDetail() {
  const { branch, id } = useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = useCan('patient.edit');
  const canDelete = useCan('patient.delete');
  const canCreate = useCan('patient.create');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [startingVisit, setStartingVisit] = useState(false);
  const [tab, setTab] = useState('overview');

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

  const remove = useMutation({
    mutationFn: () => api.delete(`/b/${branch}/patients/${id}`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['patients', branch] });
      qc.invalidateQueries({ queryKey: ['dashboard', branch] });
      toast.success(`${data?.patient.name} deleted`);
      navigate(`/${branch}/patients`, { replace: true });
    },
  });

  const back = (
    <Link to={`/${branch}/patients`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
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
              {age != null && <Badge tone="brand">{age} yrs</Badge>}
              {p.gender && (
                <Badge tone={p.gender === 'female' ? 'violet' : p.gender === 'male' ? 'brand' : 'neutral'} className="capitalize">
                  {p.gender}
                </Badge>
              )}
              {p.bloodGroup && <Badge tone="critical">{p.bloodGroup}</Badge>}
              <span className="text-xs text-muted">Registered {fmtDate(p.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && (
              <Button onClick={() => setStartingVisit(true)}>
                <ClipboardPlus /> New OP visit
              </Button>
            )}
            {p.phone && (
              <a href={whatsAppLink(p.phone, `Hello ${p.name}, this is ${me?.organization.name}.`)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline' })}>
                <MessageCircle className="text-positive" /> WhatsApp
              </a>
            )}
            {canEdit && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {canDelete && (
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent align="end">
                  <MenuItem destructive onSelect={() => setDeleting(true)}>
                    <Trash2 /> Delete patient
                  </MenuItem>
                </MenuContent>
              </Menu>
            )}
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">
            Visits{visits.data ? <span className="text-xs text-muted">{visits.data.visits.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="bills">
            Bills{bills.data ? <span className="text-xs text-muted">{bills.data.bills.length + (bills.data.pharmacy?.length ?? 0)}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="lab">
            Lab{lab.data ? <span className="text-xs text-muted">{lab.data.orders.length}</span> : null}
          </TabsTrigger>
        </TabsList>

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
            ) : !visits.data?.visits.length ? (
              <EmptyState
                icon={Stethoscope}
                title="No OP visits yet"
                description="Start an OP visit when the patient comes in. It gets the next token for today."
                action={canCreate && <Button size="sm" variant="outline" onClick={() => setStartingVisit(true)}><ClipboardPlus /> New OP visit</Button>}
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
                  {visits.data.visits.map((v) => (
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
                      <TD><VisitStatusBadge status={v.status} /></TD>
                      <TD><VisitActions branch={branch!} visit={v} label={p.name} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="bills">
          <PatientBillsTab branch={branch!} query={bills} />
        </TabsContent>
        <TabsContent value="lab">
          <PatientLabTab branch={branch!} query={lab} />
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

      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${p.name}?`}
        description="The patient is removed from this branch's lists. The record is kept in the audit trail."
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => remove.mutate()}
      />
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

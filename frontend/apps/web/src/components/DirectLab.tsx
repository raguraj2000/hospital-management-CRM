// Without seeing the doctor, in one window:
//  - "Direct lab test": find the patient (or register them), tick the tests; the lab gets them in its queue.
//  - "Create bill" (mode "bill"): find the patient; the counter adds the charges (a dressing, an injection).
// Both make a visit with no consultation fee that goes straight to Billing > To collect.
import { useDeferredValue, useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ArrowLeft, FlaskConical, ReceiptText, Search, UserPlus } from 'lucide-react';
import { formatRupees, type LabTest, type OpVisit, type Patient } from '@platform/shared';
import { Avatar, Button, cn, Dialog, Field, Input, NativeSelect, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/core/api/client';
import { ageOf, formatPhone } from '@/pages/Patients';
import { useCan } from '@/core/auth';
import { PatientForm } from './PatientForm';
import { useDoctors } from './Visits';
import { NewTabs, type NewTabsProps } from './NewMenu';
import { isUndone, withUndo } from './undo';
import { PackagePicker, useLabPackages } from './LabPackages';

type Step = 'find' | 'register' | 'tests';
const RECENT = 4;
type Who = Pick<Patient, 'id' | 'name' | 'uhid'>;

export function DirectLab({
  branch,
  open,
  onClose,
  mode = 'lab',
  patient: given,
  tabs,
}: {
  branch: string;
  open: boolean;
  onClose: () => void;
  mode?: 'lab' | 'bill';
  /** Already known (the patient's own page): the search is skipped. */
  patient?: Who;
  /** Opened from Ctrl+K / New: the tab row to switch to the other New windows. */
  tabs?: NewTabsProps;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canRegister = useCan('patient.create');
  const canCollect = useCan('billing.receive');
  const [step, setStep] = useState<Step>('find');
  const [patient, setPatient] = useState<Who | null>(null);
  const [search, setSearch] = useState('');
  const [ticked, setTicked] = useState<number[]>([]);
  const [tickedPackages, setTickedPackages] = useState<number[]>([]);
  const [referredBy, setReferredBy] = useState('');
  // The doctor the visit is counted under in the reports: the branch's default doctor unless changed. '' = none.
  const doctors = useDoctors(branch);
  const [doctor, setDoctor] = useState<string | null>(null);
  const doctorValue = doctor ?? (doctors.data?.defaultDoctorUserId != null ? String(doctors.data.defaultDoctorUserId) : '');
  // Every opening starts at the search (or at the last step when the patient is already known).
  useEffect(() => {
    if (open) {
      setStep(given ? 'tests' : 'find');
      setPatient(given ?? null);
      setSearch('');
      setTicked([]);
      setTickedPackages([]);
      setReferredBy('');
      setDoctor(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = useDeferredValue(search.trim());
  const searching = q.length >= 2;
  const found = useQuery({
    queryKey: ['patients', branch, 'direct-lab', searching ? q : ''],
    queryFn: () => api.get<{ patients: Patient[]; total: number }>(`/b/${branch}/patients?${new URLSearchParams(searching ? { q, limit: '8' } : { limit: String(RECENT) })}`),
    enabled: open && step === 'find',
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const tests = useQuery({ queryKey: ['lab-tests', branch], queryFn: () => api.get<{ tests: LabTest[] }>(`/b/${branch}/lab/tests`), enabled: open && mode === 'lab', staleTime: 60_000 });
  const rows = found.data?.patients ?? [];
  const pick = (p: Who) => {
    setPatient(p);
    setStep('tests');
  };
  const packages = useLabPackages(branch, open && mode === 'lab');
  const chosenPackages = (packages.data?.packages ?? []).filter((p) => tickedPackages.includes(p.id));
  const chosen = (tests.data?.tests ?? []).filter((t) => ticked.includes(t.id));
  const totalPaise = chosen.reduce((s, t) => s + t.pricePaise, 0) + chosenPackages.reduce((s, p) => s + p.pricePaise, 0);
  const count = chosen.length + chosenPackages.length;

  const create = useMutation({
    mutationFn: () => {
      const doctorUserId = doctorValue ? Number(doctorValue) : null;
      const go = () => mode === 'bill'
        ? api.post<{ visit: OpVisit }>(`/b/${branch}/patients/${patient!.id}/direct-bill`, { doctorUserId })
        : api.post<{ visit: OpVisit }>(`/b/${branch}/patients/${patient!.id}/direct-lab`, { testIds: ticked, packageIds: tickedPackages, doctorUserId, referredBy: referredBy.trim() || null });
      return withUndo(mode === 'bill' ? `Starting a bill for ${patient!.name}` : `Ordering ${count} lab item${count === 1 ? '' : 's'} for ${patient!.name}`, go);
    },
    onSuccess: ({ visit }) => {
      for (const k of ['lab-queue', 'visits', 'checkout-queue', 'to-bill', 'nav-counts', 'dashboard', 'patient-lab']) qc.invalidateQueries({ queryKey: [k, branch] });
      if (mode === 'bill') toast.success(`Bill started for ${patient!.name}`, { description: `${visit.opNo} · no consultation fee. Add the charges and collect.` });
      else toast.success(`Lab tests ordered for ${patient!.name}`, { description: `${visit.opNo} · no consultation fee. ${canCollect ? `Collect ${formatRupees(totalPaise)} now.` : `The counter collects ${formatRupees(totalPaise)} in Billing.`}` });
      onClose();
      // Payment first: whoever can take money lands on this visit's card in Billing.
      if (canCollect) navigate(`/${branch}/billing?visit=${visit.id}`);
    },
    onError: (e) => !isUndone(e) && toast.error(errorMessage(e)),
  });

  const what = mode === 'bill' ? 'Create bill' : 'Direct lab test';
  return (
    <Dialog
      wide
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={what}
      description={
        step === 'tests' && patient
          ? `${patient.name} · ${patient.uhid} — no consultation fee.`
          : step === 'register'
            ? 'A UHID is assigned automatically.'
            : mode === 'bill'
              ? 'A bill without seeing the doctor (dressing, injection…): no consultation fee. Find the patient first.'
              : 'For a patient who needs a lab test without seeing the doctor. Find the patient first.'
      }
    >
      {tabs && !given && <NewTabs value={mode} {...tabs} />}
      {step === 'find' && (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
            <Input type="search" autoFocus aria-label="Search patient" placeholder="Name, UHID or phone…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="mt-3 mb-1 text-xs font-medium text-muted">{searching ? (found.data ? `${found.data.total} found` : 'Searching…') : `Last ${RECENT} patients registered`}</div>
          {found.error ? (
            <p className="py-3 text-sm text-critical">{errorMessage(found.error)}</p>
          ) : !found.data ? (
            <Skeleton className="h-40" />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{searching ? 'No patient with this name, UHID or phone.' : 'No patients registered yet.'}</p>
          ) : (
            <ul className={cn('divide-y divide-border rounded-lg border border-border transition-opacity', found.isFetching && 'opacity-60')}>
              {rows.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium">
                      {p.name} {p.deactivatedAt && <span className="ml-1 rounded bg-critical-soft px-1.5 py-0.5 text-xs font-medium text-critical">Deactivated</span>}
                    </div>
                    <div className="truncate text-xs text-muted">
                      <span className="font-mono">{p.uhid}</span> · {p.phone ? formatPhone(p.phone) : 'No phone'}
                      {ageOf(p) != null && ` · ${ageOf(p)} yrs`}
                      {p.gender && <span className="capitalize"> · {p.gender}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled={!!p.deactivatedAt} title={p.deactivatedAt ? `Deactivated: ${p.deactivatedReason ?? ''}` : undefined} onClick={() => pick(p)}>
                    {mode === 'bill' ? <ReceiptText /> : <FlaskConical />} Choose
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>{canRegister ? 'Not in the list?' : 'Not in the list? Ask the front desk to register the patient.'}</span>
            {canRegister && (
              <Button variant="brand" onClick={() => setStep('register')}>
                <UserPlus /> Register new patient
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 'register' && (
        <PatientForm
          submitLabel="Save & continue"
          onCancel={() => setStep('find')}
          onUseExisting={pick}
          onSubmit={async (values) => {
            const { patient: made } = await withUndo(`Registering ${values.name}`, () => api.post<{ patient: Patient }>(`/b/${branch}/patients`, values));
            qc.invalidateQueries({ queryKey: ['patients', branch] });
            toast.success(`${made.name} registered`, { description: `UHID ${made.uhid}` });
            pick(made);
          }}
        />
      )}

      {step === 'tests' && patient && (
        <div>
          {!given && (
            <button type="button" className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-subtle" onClick={() => setStep('find')}>
              <ArrowLeft className="size-4" /> Another patient
            </button>
          )}
          <Field label="Doctor (the reports count this visit under this doctor)" htmlFor="direct-doctor" className="mb-3 sm:max-w-sm">
            <NativeSelect id="direct-doctor" value={doctorValue} onChange={(e) => setDoctor(e.target.value)}>
              <option value="">No doctor</option>
              {doctors.data?.doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {mode === 'bill' ? (
            <p className="rounded-lg bg-subtle px-3 py-2.5 text-sm text-muted">The bill opens in Billing → To collect. Add the charges there with “Add charge”, then collect.</p>
          ) : tests.isLoading ? (
            <Skeleton className="h-40" />
          ) : tests.error ? (
            <p className="py-3 text-sm text-critical">{errorMessage(tests.error)}</p>
          ) : (
            <>
            <Field label="Referred by (outside doctor, optional)" htmlFor="direct-referred" className="mb-3 sm:max-w-sm">
              <Input id="direct-referred" placeholder="e.g. Dr. Kumar, City Clinic" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
            </Field>
            <PackagePicker packages={packages.data?.packages ?? []} tests={tests.data?.tests ?? []} picked={tickedPackages} onChange={setTickedPackages} />
            <ul className="grid max-h-[34vh] gap-1.5 overflow-y-auto sm:grid-cols-2">
              {(tests.data?.tests ?? []).map((t) => (
                <li key={t.id}>
                  <label className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm', ticked.includes(t.id) ? 'border-brand bg-brand/5' : 'border-border hover:bg-subtle')}>
                    <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={ticked.includes(t.id)} onChange={(e) => setTicked((s) => (e.target.checked ? [...s, t.id] : s.filter((x) => x !== t.id)))} />
                    <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                    <span className="tabular-nums text-muted">{formatRupees(t.pricePaise)}</span>
                  </label>
                </li>
              ))}
            </ul>
            </>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <div className="text-sm text-muted">
              {mode === 'bill' ? (
                'No consultation fee on this bill.'
              ) : count ? (
                <>
                  {count} item{count === 1 ? '' : 's'} · <b className="text-base text-ink tabular-nums">{formatRupees(totalPaise)}</b> {canCollect ? 'to collect next' : 'to collect in Billing'}
                </>
              ) : (
                'Tick the tests the patient needs.'
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={(mode === 'lab' && !count) || create.isPending} onClick={() => create.mutate()}>
                {mode === 'bill' ? <ReceiptText /> : <FlaskConical />} {create.isPending ? 'Saving…' : mode === 'bill' ? 'Create bill' : canCollect ? 'Order tests & collect payment' : 'Order tests'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

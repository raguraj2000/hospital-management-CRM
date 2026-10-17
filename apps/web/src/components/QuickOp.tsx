// Ctrl+K from any page: find the patient (or register them), then start the OP visit, all in one window.
import { useDeferredValue, useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, ClipboardPlus, Search, UserPlus } from 'lucide-react';
import type { Patient } from '@platform/shared';
import { Avatar, Button, cn, Dialog, Input, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { ageOf, formatPhone } from '@/pages/Patients';
import { useCan } from '@/state/auth';
import { ConditionBadges } from './Conditions';
import { PatientForm } from './PatientForm';
import { NewVisitForm } from './Visits';
import { NewTabs, type NewTabsProps } from './NewMenu';
import { withUndo } from './undo';

/** Any page opens the window with window.dispatchEvent(new Event(NEW_OP_EVENT)). */
export const NEW_OP_EVENT = 'hms:new-op-visit';

type Step = 'find' | 'register' | 'visit';
const RECENT = 4;

export function QuickOp({ branch, open, onClose, tabs }: { branch: string; open: boolean; onClose: () => void; tabs?: NewTabsProps }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canPrescribe = useCan('prescription.write');
  const [step, setStep] = useState<Step>('find');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  // Every opening starts at the search.
  useEffect(() => {
    if (open) {
      setStep('find');
      setPatient(null);
      setSearch('');
    }
  }, [open]);

  const q = useDeferredValue(search.trim());
  const searching = q.length >= 2;
  const { data, isFetching, error } = useQuery({
    queryKey: ['patients', branch, 'quick-op', searching ? q : ''],
    queryFn: () => api.get<{ patients: Patient[]; total: number }>(`/b/${branch}/patients?${new URLSearchParams(searching ? { q, limit: '8' } : { limit: String(RECENT) })}`),
    enabled: open && step === 'find',
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const rows = data?.patients ?? [];
  const pick = (p: Patient) => {
    setPatient(p);
    setStep('visit');
  };

  return (
    <Dialog
      wide
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="New OP visit"
      description={step === 'visit' && patient ? `${patient.name} · ${patient.uhid} — the token and OP number are assigned automatically.` : step === 'register' ? 'A UHID is assigned automatically.' : 'Find the patient, or register a new one.'}
    >
      {tabs && <NewTabs value="op" {...tabs} />}
      <Stepper step={step} />

      {step === 'find' && (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
            <Input
              type="search"
              autoFocus
              aria-label="Search patient"
              placeholder="Name, UHID or phone…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // Enter takes the first one in the list.
                if (e.key === 'Enter' && searching && rows.length && !isFetching && !rows[0]!.deactivatedAt) {
                  e.preventDefault();
                  pick(rows[0]!);
                }
              }}
            />
          </div>
          <div className="mt-3 mb-1 text-xs font-medium text-muted">{searching ? (data ? `${data.total} found${data.total > rows.length ? ` · showing ${rows.length}, type more to narrow down` : ''}` : 'Searching…') : `Last ${RECENT} patients registered`}</div>
          {error ? (
            <p className="py-3 text-sm text-critical">{errorMessage(error)}</p>
          ) : !data ? (
            <Skeleton className="h-40" />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{searching ? 'No patient with this name, UHID or phone.' : 'No patients registered yet.'}</p>
          ) : (
            <ul className={cn('divide-y divide-border rounded-lg border border-border transition-opacity', isFetching && 'opacity-60')}>
              {rows.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium">
                      {p.name} {p.deactivatedAt && <span className="ml-1 rounded bg-critical-soft px-1.5 py-0.5 text-xs font-medium text-critical">Deactivated</span>}
                    </div>
                    <ConditionBadges conditions={p.conditions} className="my-0.5" />
                    <div className="truncate text-xs text-muted">
                      <span className="font-mono">{p.uhid}</span> · {p.phone ? formatPhone(p.phone) : 'No phone'}
                      {ageOf(p) != null && ` · ${ageOf(p)} yrs`}
                      {p.gender && <span className="capitalize"> · {p.gender}</span>}
                      {!searching && ` · registered ${new Date(p.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onClose();
                      navigate(`/${branch}/patients/${p.id}`);
                    }}
                  >
                    Open
                  </Button>
                  <Button size="sm" variant={searching && i === 0 ? 'default' : 'outline'} disabled={!!p.deactivatedAt} title={p.deactivatedAt ? `Deactivated: ${p.deactivatedReason ?? ''}` : undefined} onClick={() => pick(p)}>
                    <ClipboardPlus /> New OP visit
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>{searching && rows.length ? 'Enter takes the first one.' : 'Not in the list?'}</span>
            <Button variant="brand" onClick={() => setStep('register')}>
              <UserPlus /> Register new patient
            </Button>
          </div>
        </div>
      )}

      {step === 'register' && (
        <PatientForm
          submitLabel="Save & continue to the visit"
          onCancel={() => setStep('find')}
          onUseExisting={pick}
          onSubmit={async (values) => {
            const { patient: made } = await withUndo(`Registering ${values.name}`, () => api.post<{ patient: Patient }>(`/b/${branch}/patients`, values));
            qc.invalidateQueries({ queryKey: ['patients', branch] });
            qc.invalidateQueries({ queryKey: ['dashboard', branch] });
            toast.success(`${made.name} registered`, { description: `UHID ${made.uhid}` });
            pick(made);
          }}
        />
      )}

      {step === 'visit' && patient && (
        <div>
          <button type="button" className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-subtle" onClick={() => setStep('find')}>
            <ArrowLeft className="size-4" /> Another patient
          </button>
          <NewVisitForm
            branch={branch}
            patientId={patient.id}
            onCancel={onClose}
            onDone={(visit, seenNow) => {
              onClose();
              if (seenNow && canPrescribe) navigate(`/${branch}/visits/${visit.id}`);
            }}
          />
        </div>
      )}
    </Dialog>
  );
}

/** 1 Patient → 2 Visit details: where the window is now. */
function Stepper({ step }: { step: Step }) {
  const at = step === 'visit' ? 1 : 0;
  return (
    <ol className="mb-4 flex items-center gap-2 text-xs font-medium">
      {['Patient', 'Visit details'].map((label, i) => (
        <li key={label} className={cn('flex items-center gap-2', i > at && 'text-muted')}>
          {i > 0 && <span className={cn('h-px w-8', i <= at ? 'bg-brand' : 'bg-border')} />}
          <span className={cn('flex size-5 items-center justify-center rounded-full text-[11px]', i < at ? 'bg-brand text-white' : i === at ? 'border-2 border-brand text-brand' : 'border border-border')}>{i < at ? <Check className="size-3" /> : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

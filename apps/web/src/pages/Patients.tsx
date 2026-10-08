import { useDeferredValue } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ChevronRight, Plus, Search, SearchX, Users } from 'lucide-react';
import type { Patient } from '@platform/shared';
import { Avatar, Badge, Button, Card, Dialog, EmptyState, Input, PageHeader, Pager, Skeleton, Table, Tabs, TabsList, TabsTrigger, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useBranch, useCan } from '@/state/auth';
import { PatientForm } from '@/components/PatientForm';

const PAGE_SIZE = 20;

export const formatPhone = (p: string | null) => (p ? p.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2') : '—');

const genderTone = { female: 'violet', male: 'brand', other: 'neutral' } as const;

export function Patients() {
  const { branch } = useParams();
  const current = useBranch();
  const canCreate = useCan('patient.create');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Search text, filter and page live in the URL: shareable, and Back works.
  const search = params.get('q') ?? '';
  const q = useDeferredValue(search.trim());
  const gender = params.get('gender') ?? 'all';
  const page = Math.max(Number(params.get('page')) || 1, 1);
  const adding = params.get('add') === '1';

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const query = new URLSearchParams({ q, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
  if (gender !== 'all') query.set('gender', gender);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['patients', branch, q, gender, page],
    queryFn: () => api.get<{ patients: Patient[]; total: number }>(`/b/${branch}/patients?${query}`),
    placeholderData: keepPreviousData, // no flicker while typing or paging
  });

  const total = data?.total ?? 0;
  const filtered = q !== '' || gender !== 'all';

  return (
    <div>
      <PageHeader
        title="Patients"
        description={`Everyone registered at ${current?.name}.`}
        actions={
          canCreate && (
            <Button onClick={() => setParam('add', '1')}>
              <Plus /> Add patient
            </Button>
          )
        }
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
            <Input
              type="search"
              placeholder="Search name, UHID or phone…"
              value={search}
              onChange={(e) => setParam('q', e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={gender} onValueChange={(v) => setParam('gender', v === 'all' ? null : v)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="female">Female</TabsTrigger>
              <TabsTrigger value="male">Male</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error ? (
          <p className="p-6 text-sm text-critical">{errorMessage(error)}</p>
        ) : isLoading || !data ? (
          <div className="space-y-3 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : data.patients.length === 0 ? (
          filtered ? (
            <EmptyState icon={SearchX} title="No matching patients" description="Try a different name, ID or phone number, or clear the filter." />
          ) : (
            <EmptyState
              icon={Users}
              title="No patients yet"
              description="Register the first patient of this branch."
              action={canCreate && <Button variant="outline" size="sm" onClick={() => setParam('add', '1')}><Plus /> Add patient</Button>}
            />
          )
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Phone: list rows */}
            <ul className="divide-y divide-border md:hidden">
              {data.patients.map((p) => (
                <li key={p.id}>
                  <Link to={`/${branch}/patients/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-subtle">
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted">
                        <span className="font-mono">{p.uhid}</span> · {p.phone ? formatPhone(p.phone) : 'No phone'}
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop: data table */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <TH>Patient</TH>
                    <TH>Phone</TH>
                    <TH>Age</TH>
                    <TH>Gender</TH>
                    <TH>Blood</TH>
                    <TH className="text-right">Registered</TH>
                    <TH />
                  </tr>
                </THead>
                <TBody>
                  {data.patients.map((p) => (
                    <TR key={p.id} onOpen={() => navigate(`/${branch}/patients/${p.id}`)}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div className="min-w-0">
                            <Link to={`/${branch}/patients/${p.id}`} className="block truncate font-medium hover:underline">
                              {p.name}
                            </Link>
                            <div className="font-mono text-xs text-muted">{p.uhid}</div>
                          </div>
                        </div>
                      </TD>
                      <TD className="tabular-nums">{formatPhone(p.phone)}</TD>
                      <TD className="tabular-nums">{ageOf(p) ?? <span className="text-muted">—</span>}</TD>
                      <TD>{p.gender ? <Badge tone={genderTone[p.gender]} className="capitalize">{p.gender}</Badge> : <span className="text-muted">—</span>}</TD>
                      <TD>{p.bloodGroup ? <Badge tone="critical">{p.bloodGroup}</Badge> : <span className="text-muted">—</span>}</TD>
                      <TD className="text-right text-muted tabular-nums">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={(n) => setParam('page', String(n))} />
          </div>
        )}
      </Card>

      <Dialog open={adding} onOpenChange={(o) => setParam('add', o ? '1' : null)} title="Register a new patient" description="A UHID is assigned automatically.">
        <PatientForm
          submitLabel="Save patient"
          onCancel={() => setParam('add', null)}
          onSubmit={async (values) => {
            const { patient } = await api.post<{ patient: Patient }>(`/b/${branch}/patients`, values);
            qc.invalidateQueries({ queryKey: ['patients', branch] });
            qc.invalidateQueries({ queryKey: ['dashboard', branch] });
            toast.success(`${patient.name} registered`, { description: `UHID ${patient.uhid}` });
            navigate(`/${branch}/patients/${patient.id}`);
          }}
        />
      </Dialog>
    </div>
  );
}

/** Age from date of birth (always current), else the age typed at registration. */
export function ageOf(p: Pick<Patient, 'dob' | 'ageYears'>): number | null {
  if (p.dob) {
    const d = new Date(p.dob);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    return age;
  }
  return p.ageYears;
}

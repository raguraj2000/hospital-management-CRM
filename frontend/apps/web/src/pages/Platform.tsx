import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router';
import { Building2, IndianRupee, KeyRound, LogOut, Pause, Play, Plus, SlidersHorizontal, Users } from 'lucide-react';
import { formatRupees, MODULES, newCustomerSchema, planStatus, type Customer, type ModuleKey, type NewCustomerInput, type OwnerHelp, type PlatformPayment } from '@platform/shared';
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, PageHeader, Skeleton, StatCard, Table, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/core/api/client';
import { useLogout, useMe } from '@/core/auth';

/** You (hosting the SaaS): customers, their owner logins, suspend / activate. No patient data here. */
export function Platform() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [limitsOf, setLimitsOf] = useState<Customer | null>(null);
  const [planOf, setPlanOf] = useState<Customer | null>(null);
  const [ownerOf, setOwnerOf] = useState<Customer | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['customers'], queryFn: () => api.get<{ customers: Customer[] }>('/platform/customers'), enabled: !!me?.user.isPlatformAdmin });
  const toggle = useMutation({
    mutationFn: (c: Customer) => api.post(`/platform/customers/${c.id}/${c.isActive ? 'suspend' : 'activate'}`),
    onSuccess: (_d, c) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(c.isActive ? `${c.name} suspended` : `${c.name} active again`, { description: c.isActive ? 'Their staff were signed out and cannot sign in.' : undefined });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!me) return <Navigate to="/login" replace />;
  if (!me.user.isPlatformAdmin) return <Navigate to="/" replace />;
  const customers = data?.customers ?? [];
  document.title = 'Customers · Platform';

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:px-8">
        <div className="font-semibold">Platform console</div>
        <div className="flex items-center gap-3 text-sm text-muted">
          {me.user.name}
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await logout.mutateAsync().catch(() => undefined);
              navigate('/login', { replace: true });
            }}
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <PageHeader
          title="Customers"
          description="Hospitals and clinics using the app. Each one's data is fully separate."
          actions={
            <Button onClick={() => setAdding(true)}>
              <Plus /> New customer
            </Button>
          }
        />
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Building2} label="Customers" value={customers.length} loading={isLoading} />
          <StatCard icon={Play} tone="positive" label="Active" value={customers.filter((c) => c.isActive).length} loading={isLoading} />
          <StatCard icon={Users} tone="violet" label="Patients (all customers)" value={customers.reduce((s, c) => s + c.patients, 0)} loading={isLoading} />
        </div>
        <Card>
          {isLoading ? (
            <Skeleton className="m-4 h-32" />
          ) : error ? (
            <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
          ) : customers.length === 0 ? (
            <EmptyState icon={Building2} title="No customers yet" description="Create the first hospital or clinic." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH className="hidden md:table-cell">Owner login</TH>
                  <TH className="text-right">Branches</TH>
                  <TH className="hidden text-right sm:table-cell">Staff</TH>
                  <TH className="hidden text-right sm:table-cell">Patients</TH>
                  <TH className="hidden lg:table-cell">Plan</TH>
                  <TH>Status</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {customers.map((c) => (
                  <TR key={c.id} className={c.isActive ? '' : 'opacity-60'}>
                    <TD>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted">
                        UHID prefix <span className="font-mono">{c.idPrefix}</span> · since {new Date(c.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                      {c.modulesOff.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.modulesOff.map((k) => (
                            <Badge key={k} tone="warning">
                              {MODULES.find((m) => m.key === k)?.label} off
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TD>
                    <TD className="hidden md:table-cell">
                      <div>{c.ownerName ?? '—'}</div>
                      <div className="text-xs text-muted tabular-nums">{c.ownerMobile ?? ''}</div>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {c.branches}
                      {c.maxBranches != null && <span className="text-muted"> / {c.maxBranches}</span>}
                    </TD>
                    <TD className="hidden text-right tabular-nums sm:table-cell">
                      {c.staff}
                      {c.maxStaff != null && <span className="text-muted"> / {c.maxStaff}</span>}
                    </TD>
                    <TD className="hidden text-right tabular-nums sm:table-cell">{c.patients}</TD>
                    <TD className="hidden lg:table-cell">
                      <PlanCell c={c} />
                    </TD>
                    <TD>
                      <Badge tone={c.isActive ? 'positive' : 'critical'} dot>
                        {c.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </TD>
                    <TD className="space-x-1 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setOwnerOf(c)}>
                        <KeyRound /> Owner
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPlanOf(c)}>
                        <IndianRupee /> Plan
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setLimitsOf(c)}>
                        <SlidersHorizontal /> Limits
                      </Button>
                      <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate(c)}>
                        {c.isActive ? (
                          <>
                            <Pause /> Suspend
                          </>
                        ) : (
                          <>
                            <Play /> Activate
                          </>
                        )}
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </main>

      <Dialog open={!!ownerOf} onOpenChange={(o) => !o && setOwnerOf(null)} title={`Owner · ${ownerOf?.name ?? ''}`} description="Help when the owner forgot the password, is locked out, or the hospital has a new owner. Every change is in your activity log.">
        {ownerOf && <OwnerHelpForm key={ownerOf.id} customer={ownerOf} />}
      </Dialog>

      <Dialog open={!!planOf} onOpenChange={(o) => !o && setPlanOf(null)} title={`Plan & payments · ${planOf?.name ?? ''}`} description="Not billed = never suspended for payment. Suspension happens at night, never during the day.">
        {planOf && <PlanForm key={planOf.id} customer={planOf} />}
      </Dialog>

      <Dialog open={!!limitsOf} onOpenChange={(o) => !o && setLimitsOf(null)} title={`Limits · ${limitsOf?.name ?? ''}`} description="What this hospital may have. Empty = no limit. Takes effect on their next page load.">
        {limitsOf && <LimitsForm key={limitsOf.id} customer={limitsOf} onDone={() => setLimitsOf(null)} />}
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding} title="New customer" description="Creates the hospital / clinic, its first branch, default roles, and the owner's login.">
        <NewCustomerForm
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            await api.post('/platform/customers', v);
            qc.invalidateQueries({ queryKey: ['customers'] });
            setAdding(false);
            toast.success(`${v.name} created`, { description: `Owner signs in with ${v.ownerMobile}.` });
          }}
        />
      </Dialog>
    </div>
  );
}

/** Owner help: who the owner is, a temporary password, or another person as the owner. */
function OwnerHelpForm({ customer }: { customer: Customer }) {
  const qc = useQueryClient();
  const help = useQuery({ queryKey: ['owner-help', customer.id], queryFn: () => api.get<OwnerHelp>(`/platform/customers/${customer.id}/owner`) });
  const [password, setPassword] = useState('');
  const [next, setNext] = useState('');
  const [confirming, setConfirming] = useState(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['owner-help', customer.id] });
    qc.invalidateQueries({ queryKey: ['customers'] });
  };
  const reset = useMutation({
    mutationFn: () => api.post(`/platform/customers/${customer.id}/owner/password`, { password }),
    onSuccess: () => {
      refresh();
      toast.success('Temporary password set', { description: 'Tell the owner on the phone, and ask them to change it after signing in. They were signed out everywhere.' });
      setPassword('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const change = useMutation({
    mutationFn: () => api.put(`/platform/customers/${customer.id}/owner`, { userId: Number(next) }),
    onSuccess: () => {
      refresh();
      setConfirming(false);
      setNext('');
      toast.success('Owner changed', { description: 'Both people were signed out; the new owner sees every branch on the next sign-in.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (help.isLoading) return <Skeleton className="h-40" />;
  if (help.error || !help.data) return <p className="text-sm text-critical">{errorMessage(help.error)}</p>;
  const o = help.data.owner;
  const locked = o?.lockedUntil && o.lockedUntil > new Date().toISOString();
  const nextName = help.data.candidates.find((x) => String(x.id) === next)?.name;
  // Easy to read out on the phone: no 0/O or 1/l look-alikes.
  const generate = () => setPassword(Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => 'abcdefghjkmnpqrstuvwxyz23456789'[n % 31]).join(''));
  return (
    <div className="space-y-5">
      {o ? (
        <div className="rounded-lg border border-border px-3 py-2.5 text-sm">
          <div className="font-medium">{o.name}</div>
          <div className="text-xs text-muted tabular-nums">
            {o.mobile ?? 'No mobile'} · last sign-in {o.lastSignInAt ? new Date(o.lastSignInAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never'}
            {locked && <span className="ml-1 font-medium text-critical">· locked after wrong passwords</span>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-critical">This hospital has no owner. Choose one below.</p>
      )}

      {o && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            reset.mutate();
          }}
        >
          <div className="text-sm font-semibold">Temporary password</div>
          <p className="text-xs text-muted">Also unlocks the account. The owner is signed out everywhere and signs in with this password.</p>
          <div className="flex gap-2">
            <Input aria-label="Temporary password" autoComplete="off" className="font-mono" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="button" variant="outline" onClick={generate}>
              Make one
            </Button>
            <Button type="submit" disabled={password.length < 8 || reset.isPending}>
              {reset.isPending ? 'Saving…' : 'Set'}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        <div className="text-sm font-semibold">Change the owner</div>
        <p className="text-xs text-muted">Someone who already works at this hospital. {o ? `${o.name} keeps the account but loses the owner's rights.` : ''}</p>
        {help.data.candidates.length === 0 ? (
          <p className="text-sm text-muted">Nobody else has an active account here yet.</p>
        ) : (
          <div className="flex gap-2">
            <select aria-label="New owner" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-sm" value={next} onChange={(e) => setNext(e.target.value)}>
              <option value="">Choose a person…</option>
              {help.data.candidates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} {x.mobile ? `· ${x.mobile}` : ''}
                </option>
              ))}
            </select>
            <Button variant="outline" disabled={!next} onClick={() => setConfirming(true)}>
              Make owner
            </Button>
          </div>
        )}
        {confirming && nextName && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
            <span>
              Make <b>{nextName}</b> the owner of {customer.name}?
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={change.isPending} onClick={() => change.mutate()}>
                {change.isPending ? 'Changing…' : 'Yes, make owner'}
              </Button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const showDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function PlanCell({ c }: { c: Customer }) {
  const s = planStatus(c.paidUntil, c.graceDays, indiaToday());
  if (s.state === 'unbilled') return <span className="text-xs text-muted">{c.planName ?? 'Not billed'}</span>;
  return (
    <div className="text-xs">
      <div className="font-medium">
        {c.planName ?? 'Plan'} · {formatRupees(c.yearlyFeePaise)}/year
      </div>
      <div className={s.state === 'overdue' ? 'font-medium text-critical' : s.state === 'due_soon' ? 'font-medium text-warning' : 'text-muted'}>
        {s.state === 'overdue' ? `Overdue · suspends ${showDay(s.suspendOn!)}` : `Paid until ${showDay(c.paidUntil!)}`}
      </div>
    </div>
  );
}

/** The plan (name, fee, grace days, paid until), "Mark paid", and the payment history. */
function PlanForm({ customer }: { customer: Customer }) {
  const qc = useQueryClient();
  const [planName, setPlanName] = useState(customer.planName ?? '');
  const [fee, setFee] = useState(customer.yearlyFeePaise ? String(customer.yearlyFeePaise / 100) : '');
  const [grace, setGrace] = useState(String(customer.graceDays));
  const [paidUntil, setPaidUntil] = useState(customer.paidUntil ?? '');
  const [years, setYears] = useState(1);
  const [amount, setAmount] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(indiaToday());
  const [note, setNote] = useState('');
  const paise = (v: string) => Math.round(Number(v || 0) * 100);
  const history = useQuery({ queryKey: ['customer-payments', customer.id], queryFn: () => api.get<{ payments: PlatformPayment[] }>(`/platform/customers/${customer.id}/payments`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['customers'] });
    qc.invalidateQueries({ queryKey: ['customer-payments', customer.id] });
  };
  const savePlan = useMutation({
    mutationFn: () => api.patch(`/platform/customers/${customer.id}`, { planName, yearlyFeePaise: paise(fee), graceDays: Math.floor(Number(grace) || 0), paidUntil: paidUntil || null }),
    onSuccess: () => {
      refresh();
      toast.success('Plan saved');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const amountPaise = amount == null ? paise(fee) * years : paise(amount);
  const markPaid = useMutation({
    mutationFn: () => api.post<{ periodFrom: string; periodTo: string }>(`/platform/customers/${customer.id}/payments`, { amountPaise, years, paidOn, note: note || undefined }),
    onSuccess: (r) => {
      refresh();
      setPaidUntil(r.periodTo);
      setAmount(null);
      setNote('');
      toast.success(`Paid until ${showDay(r.periodTo)}`, { description: customer.isActive ? undefined : 'The hospital is still suspended: press Activate to let them sign in.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan name" htmlFor="p-name">
          <Input id="p-name" placeholder="e.g. Basic" value={planName} onChange={(e) => setPlanName(e.target.value)} />
        </Field>
        <Field label="Yearly fee (₹)" htmlFor="p-fee">
          <Input id="p-fee" inputMode="decimal" placeholder="0" value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <Field label="Paid until" htmlFor="p-until" hint="Empty = not billed">
          <Input id="p-until" type="date" value={paidUntil} onChange={(e) => setPaidUntil(e.target.value)} />
        </Field>
        <Field label="Grace days after that" htmlFor="p-grace" hint="Then suspended at night">
          <Input id="p-grace" inputMode="numeric" value={grace} onChange={(e) => setGrace(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" disabled={savePlan.isPending} onClick={() => savePlan.mutate()}>
          {savePlan.isPending ? 'Saving…' : 'Save plan'}
        </Button>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="mb-2 text-sm font-semibold">Mark paid</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Years" htmlFor="p-years">
            <select id="p-years" className="h-10 w-full rounded-lg border border-border bg-surface px-2" value={years} onChange={(e) => setYears(Number(e.target.value))}>
              {[1, 2, 3].map((y) => (
                <option key={y} value={y}>
                  {y} year{y === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₹)" htmlFor="p-amount">
            <Input id="p-amount" inputMode="decimal" value={amount ?? String(amountPaise / 100)} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Paid on" htmlFor="p-on">
            <Input id="p-on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field label="Note" htmlFor="p-note">
            <Input id="p-note" placeholder="UPI ref…" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <Button disabled={markPaid.isPending || amountPaise <= 0} onClick={() => markPaid.mutate()}>
            {markPaid.isPending ? 'Saving…' : `Mark ${formatRupees(amountPaise)} paid`}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm font-semibold">Payments</div>
        {history.isLoading ? (
          <Skeleton className="h-16" />
        ) : !history.data?.payments.length ? (
          <p className="text-sm text-muted">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {history.data.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  <span className="font-medium">{formatRupees(p.amountPaise)}</span> on {showDay(p.paidOn)}
                  {p.note && <span className="text-muted"> · {p.note}</span>}
                </span>
                <span className="text-xs text-muted">
                  {showDay(p.periodFrom)} – {showDay(p.periodTo)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Branches, staff accounts and modules of one hospital. Staff (owner not counted) and branches already there stay. */
function LimitsForm({ customer, onDone }: { customer: Customer; onDone: () => void }) {
  const qc = useQueryClient();
  const [branches, setBranches] = useState(customer.maxBranches == null ? '' : String(customer.maxBranches));
  const [staff, setStaff] = useState(customer.maxStaff == null ? '' : String(customer.maxStaff));
  const [off, setOff] = useState<ModuleKey[]>(customer.modulesOff);
  const num = (v: string) => (v.trim() === '' ? null : Math.floor(Number(v)));
  const save = useMutation({
    mutationFn: () => api.patch(`/platform/customers/${customer.id}`, { maxBranches: num(branches), maxStaff: num(staff), modulesOff: off }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Limits saved for ${customer.name}`);
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const below = (limit: number | null, used: number) => limit != null && limit < used;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branches allowed" htmlFor="l-branches" hint={`${customer.branches} now${below(num(branches), customer.branches) ? ': the ones there stay, no new ones' : ''}`}>
          <Input id="l-branches" inputMode="numeric" placeholder="No limit" value={branches} onChange={(e) => setBranches(e.target.value)} />
        </Field>
        <Field label="Staff accounts allowed" htmlFor="l-staff" hint={`${customer.staff} accounts now, owner included (the owner does not count toward the limit)`}>
          <Input id="l-staff" inputMode="numeric" placeholder="No limit" value={staff} onChange={(e) => setStaff(e.target.value)} />
        </Field>
      </div>
      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">Modules</legend>
        <div className="space-y-2">
          {MODULES.map((m) => (
            <label key={m.key} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>{m.label}</span>
              <span className="flex items-center gap-2">
                <span className={off.includes(m.key) ? 'text-muted' : 'font-medium text-positive'}>{off.includes(m.key) ? 'Off' : 'On'}</span>
                <input type="checkbox" role="switch" className="size-5 accent-[var(--color-primary)]" checked={!off.includes(m.key)} onChange={(e) => setOff(e.target.checked ? off.filter((k) => k !== m.key) : [...off, m.key])} />
              </span>
            </label>
          ))}
          <p className="text-xs text-muted">Off hides the module and its pages for everyone at this hospital; what was entered stays. Billing and Pharmacy are always on.</p>
        </div>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save limits'}
        </Button>
      </div>
    </form>
  );
}

function NewCustomerForm({ onSubmit, onCancel }: { onSubmit: (v: NewCustomerInput) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<NewCustomerInput>({ resolver: zodResolver(newCustomerSchema), defaultValues: { branchName: 'HMS', branchSlug: 'main' } });
  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((v) =>
        onSubmit(v).catch((e) => {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof NewCustomerInput, { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }),
      )}
    >
      <Field required label="Hospital / clinic name" htmlFor="c-name" error={errors.name?.message} className="sm:col-span-2">
        <Input
          id="c-name"
          autoFocus
          {...register('name', {
            onChange: (e) => {
              // Suggest a UHID prefix from the initials ("Sri Clinic" -> "SC").
              if (getFieldState('idPrefix').isDirty) return;
              const initials = String(e.target.value)
                .split(/\s+/)
                .filter(Boolean)
                .map((w: string) => w[0]!.toUpperCase())
                .join('')
                .replace(/[^A-Z]/g, '')
                .slice(0, 4);
              setValue('idPrefix', initials);
            },
          })}
        />
      </Field>
      <Field label="UHID prefix" htmlFor="c-prefix" error={errors.idPrefix?.message} hint="Patient IDs start with it, e.g. CH000001">
        <Input id="c-prefix" className="font-mono uppercase" {...register('idPrefix')} />
      </Field>
      <Field required label="First branch name" htmlFor="c-branch" error={errors.branchName?.message}>
        <Input id="c-branch" {...register('branchName')} />
      </Field>
      <Field required label="Branch web address" htmlFor="c-slug" error={errors.branchSlug?.message}>
        <Input id="c-slug" className="font-mono" {...register('branchSlug')} />
      </Field>
      <div className="border-t border-border pt-4 text-sm font-semibold sm:col-span-2">Owner login</div>
      <Field required label="Owner name" htmlFor="c-owner" error={errors.ownerName?.message}>
        <Input id="c-owner" {...register('ownerName')} />
      </Field>
      <Field required label="Owner mobile" htmlFor="c-mobile" error={errors.ownerMobile?.message}>
        <Input id="c-mobile" type="tel" inputMode="tel" placeholder="98765 43210" {...register('ownerMobile')} />
      </Field>
      <Field required label="Temporary password" htmlFor="c-password" error={errors.ownerPassword?.message} hint="At least 8 characters. They can change it after signing in." className="sm:col-span-2">
        <Input id="c-password" autoComplete="off" {...register('ownerPassword')} />
      </Field>
      {errors.root && <p className="text-sm text-critical sm:col-span-2">{errors.root.message}</p>}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create customer'}
        </Button>
      </div>
    </form>
  );
}

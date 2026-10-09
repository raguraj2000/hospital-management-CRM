import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router';
import { Building2, LogOut, Pause, Play, Plus, Users } from 'lucide-react';
import { newCustomerSchema, type Customer, type NewCustomerInput } from '@platform/shared';
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, PageHeader, Skeleton, StatCard, Table, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useLogout, useMe } from '@/state/auth';

/** You (hosting the SaaS): customers, their owner logins, suspend / activate. No patient data here. */
export function Platform() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
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
                        UHID prefix <span className="font-mono">{c.idPrefix}</span> · since {new Date(c.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <div>{c.ownerName ?? '—'}</div>
                      <div className="text-xs text-muted tabular-nums">{c.ownerMobile ?? ''}</div>
                    </TD>
                    <TD className="text-right tabular-nums">{c.branches}</TD>
                    <TD className="hidden text-right tabular-nums sm:table-cell">{c.staff}</TD>
                    <TD className="hidden text-right tabular-nums sm:table-cell">{c.patients}</TD>
                    <TD>
                      <Badge tone={c.isActive ? 'positive' : 'critical'} dot>
                        {c.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </TD>
                    <TD className="text-right">
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

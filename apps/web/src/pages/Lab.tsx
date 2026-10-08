import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ClipboardEdit, FlaskConical, ListPlus, Pencil, Plus, Printer, TestTube, Trash2, X } from 'lucide-react';
import { formatRupees, opToken, toPaise, type LabQueueEntry, type LabTest } from '@platform/shared';
import { Avatar, Badge, Button, buttonVariants, Card, ConfirmDelete, ConfirmDialog, Dialog, EmptyState, Field, Input, PageHeader, Pager, Skeleton, Table, Tabs, TabsContent, TabsList, TabsTrigger, TBody, TD, TH, THead, toast, TR, usePaged } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { PrintHeaderForm } from '@/components/PrintHeaderForm';
import { useBranch, useCan } from '@/state/auth';
import { PrintLink } from '@/components/print';

export function Lab() {
  const current = useBranch();
  const canManageTests = useCan('settings.manage');
  // The tab lives in the URL (?tab=done), so the results page can send the lab straight to Completed.
  const [params, setParams] = useSearchParams();
  const tab = ['done', 'tests', 'header'].includes(params.get('tab') ?? '') ? params.get('tab')! : 'queue';
  return (
    <div>
      <PageHeader title="Lab" description={`Tests ordered by doctors at ${current?.name}. Enter results, then print the report.`} />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'queue' ? {} : { tab: v }, { replace: true })}>
        <TabsList className="mb-4">
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="done">Completed</TabsTrigger>
          <TabsTrigger value="tests">Tests & prices</TabsTrigger>
          {canManageTests && current && <TabsTrigger value="header">Report header</TabsTrigger>}
        </TabsList>
        <TabsContent value="queue">
          <LabQueue status="" />
        </TabsContent>
        <TabsContent value="done">
          <LabQueue status="completed" />
        </TabsContent>
        <TabsContent value="tests">
          <LabTests canManage={canManageTests} />
        </TabsContent>
        {canManageTests && current && (
          <TabsContent value="header">
            <PrintHeaderForm branch={current.slug} branchName={current.name} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function LabQueue({ status }: { status: '' | 'completed' }) {
  const { branch } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canCollect = useCan('lab.view');
  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-queue', branch, status],
    queryFn: () => api.get<{ orders: LabQueueEntry[] }>(`/b/${branch}/lab/orders${status ? `?status=${status}` : ''}`),
    refetchInterval: 20_000,
  });
  const [cancelling, setCancelling] = useState<LabQueueEntry | null>(null);
  const { rows, pager } = usePaged(data?.orders ?? [], status);
  const cancel = useMutation({
    mutationFn: (o: LabQueueEntry) => api.patch(`/b/${branch}/lab/orders/${o.id}`, { status: 'cancelled' }),
    onSuccess: (_d, o) => {
      for (const k of ['lab-queue', 'patient-lab', 'patient-bills', 'visit-lab', 'visit-bills', 'visits', 'visit', 'checkout-queue']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(`${o.testName} cancelled for ${o.patientName}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const collect = useMutation({
    mutationFn: (o: LabQueueEntry) => api.patch(`/b/${branch}/lab/orders/${o.id}`, { status: 'sample_collected' }),
    onSuccess: (_d, o) => {
      qc.invalidateQueries({ queryKey: ['lab-queue', branch] });
      qc.invalidateQueries({ queryKey: ['patient-lab', branch] });
      toast.success(`Sample collected · ${o.testName} for ${o.patientName}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-48" />;
  if (error) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;
  const orders = rows;
  return (
    <Card>
      {orders.length === 0 ? (
        <EmptyState icon={FlaskConical} title={status ? 'No completed tests yet' : 'No tests waiting'} description={status ? undefined : 'Tests a doctor orders from an OP visit show up here.'} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Patient</TH>
              <TH>Test</TH>
              <TH className="hidden md:table-cell">Token · OP no. · Doctor</TH>
              <TH>Status</TH>
              <TH className="text-right">Action</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {orders.map((o) => (
              <TR key={o.id} onOpen={() => navigate(`/${branch}/lab/visits/${o.visitId}`)}>
                <TD>
                  <Link to={`/${branch}/lab/visits/${o.visitId}`} className="flex items-center gap-2.5">
                    <Avatar name={o.patientName} size="sm" />
                    <span>
                      <span className="block font-medium hover:underline">{o.patientName}</span>
                      <span className="block font-mono text-[11px] text-muted">{o.patientUhid}</span>
                    </span>
                  </Link>
                </TD>
                <TD className="font-medium">
                  {o.testName}
                  {o.labNote && (
                    <span className="mt-0.5 block max-w-xs text-xs font-normal whitespace-pre-wrap text-muted">
                      <span className="font-semibold text-ink">Doctor's note: </span>
                      {o.labNote}
                    </span>
                  )}
                </TD>
                <TD className="hidden text-muted md:table-cell">
                  {opToken(o.opNo) != null && <span className="font-medium text-ink">Token {opToken(o.opNo)} · </span>}
                  <span className="font-mono text-xs">{o.opNo}</span>
                  {o.doctorName && ` · ${o.doctorName}`}
                </TD>
                <TD>
                  <Badge tone={o.status === 'ordered' ? 'warning' : o.status === 'completed' ? 'positive' : 'brand'} dot>
                    {o.status === 'ordered' ? 'Waiting for sample' : o.status === 'completed' ? 'Completed' : 'Sample collected'}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-1.5">
                    {/* The patient is going elsewhere: allowed until results are entered (the server refuses after that). */}
                    {o.status !== 'completed' && (
                      <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => setCancelling(o)}>
                        <X /> Cancel test
                      </Button>
                    )}
                    {canCollect && o.status === 'ordered' && (
                      <Button size="sm" variant="outline" disabled={collect.isPending} onClick={() => collect.mutate(o)}>
                        <TestTube /> Sample collected
                      </Button>
                    )}
                    {o.status === 'completed' ? (
                      <PrintLink href={`/${branch}/lab/visits/${o.visitId}/print`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                        <Printer /> Print report
                      </PrintLink>
                    ) : (
                      <Link to={`/${branch}/lab/visits/${o.visitId}`} className={buttonVariants({ size: 'sm' })}>
                        <ClipboardEdit /> Enter results
                      </Link>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pager {...pager} />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel ${cancelling?.testName ?? 'test'}?`}
        description={`For ${cancelling?.patientName ?? 'this patient'}. It is removed from the queue and from the bill.`}
        confirmLabel="Yes, cancel the test"
        cancelLabel="Keep it"
        onConfirm={() => cancelling && cancel.mutate(cancelling)}
      />
    </Card>
  );
}

const testFormSchema = z.object({ name: z.string().trim().min(2, 'Enter the test name').max(120), price: z.number({ error: 'Enter the price' }).min(0).max(100_000) });

function LabTests({ canManage }: { canManage: boolean }) {
  const { branch } = useParams();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<LabTest | null>(null);
  const [pricing, setPricing] = useState<LabTest | null>(null);
  const [confirmLoad, setConfirmLoad] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['lab-tests', branch], queryFn: () => api.get<{ tests: LabTest[] }>(`/b/${branch}/lab/tests`) });
  const loadStandard = useMutation({
    mutationFn: () => api.post<{ added: number; skipped: number }>(`/b/${branch}/lab/tests/load-standard`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['lab-tests', branch] });
      toast.success(r.added ? `${r.added} standard tests added` : 'All standard tests are already in the list', { description: r.added ? 'Prices start at ₹0 — set them with the pencil.' : undefined });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const setPrice = useMutation({
    mutationFn: ({ t, price }: { t: LabTest; price: number }) => api.patch(`/b/${branch}/lab/tests/${t.id}`, { pricePaise: toPaise(price) }),
    onSuccess: (_d, { t }) => {
      qc.invalidateQueries({ queryKey: ['lab-tests', branch] });
      setPricing(null);
      toast.success(`Price of ${t.name} saved`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (t: LabTest) => api.delete(`/b/${branch}/lab/tests/${t.id}`),
    onSuccess: (_d, t) => {
      qc.invalidateQueries({ queryKey: ['lab-tests', branch] });
      setDeleting(null);
      toast.success(`${t.name} deleted`);
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof testFormSchema>>({ resolver: zodResolver(testFormSchema) });

  return (
    <Card>
      <ConfirmDialog
        open={confirmLoad}
        onOpenChange={setConfirmLoad}
        title="Load the standard tests?"
        description="Adds the standard list (CBC, LFT, urine, card tests …) to this branch. Tests already in the list are kept as they are, with their prices. New ones start at ₹0."
        confirmLabel="Yes, load them"
        pending={loadStandard.isPending}
        onConfirm={() => loadStandard.mutate()}
      />
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Tests & prices</div>
          <div className="text-xs text-muted">What doctors can order in this branch.</div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={loadStandard.isPending} onClick={() => setConfirmLoad(true)}>
              <ListPlus /> Load standard tests
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add test
            </Button>
          </div>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : !data?.tests.length ? (
        <EmptyState
          icon={TestTube}
          title="No tests yet"
          description={canManage ? 'Load the standard list (CBC, LFT, urine, card tests …) or add tests one by one.' : 'A branch admin adds the tests.'}
          action={canManage && <Button size="sm" variant="outline" onClick={() => setConfirmLoad(true)}><ListPlus /> Load standard tests</Button>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Test</TH>
              <TH className="hidden md:table-cell">Department</TH>
              <TH className="text-right">Price</TH>
              {canManage && <TH />}
            </tr>
          </THead>
          <TBody>
            {data.tests.map((t) => (
              <TR key={t.id}>
                <TD>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted">
                    {t.parameterCount} result line{t.parameterCount === 1 ? '' : 's'}
                    {t.kind === 'card' && ' · card test'}
                  </div>
                </TD>
                <TD className="hidden text-xs text-muted md:table-cell">{t.department.replace('DEPARTMENT OF ', '')}</TD>
                <TD className={`text-right tabular-nums ${t.pricePaise === 0 ? 'text-warning' : ''}`}>{formatRupees(t.pricePaise)}</TD>
                {canManage && (
                  <TD className="text-right whitespace-nowrap">
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit price of ${t.name}`} onClick={() => setPricing(t)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                      <Trash2 className="text-critical" />
                    </Button>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Dialog open={adding} onOpenChange={setAdding} title="Add lab test">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={handleSubmit(async ({ name, price }) => {
            try {
              await api.post(`/b/${branch}/lab/tests`, { name, pricePaise: toPaise(price) });
              qc.invalidateQueries({ queryKey: ['lab-tests', branch] });
              toast.success(`${name} added`);
              reset();
              setAdding(false);
            } catch (e) {
              setError('root', { message: errorMessage(e) });
            }
          })}
        >
          <Field label="Test name" htmlFor="test-name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="test-name" autoFocus placeholder="e.g. CBC" {...register('name')} />
          </Field>
          <Field label="Price (₹)" htmlFor="test-price" error={errors.price?.message}>
            <Input id="test-price" inputMode="decimal" {...register('price', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />
          </Field>
          {errors.root && <p className="text-sm text-critical sm:col-span-3">{errors.root.message}</p>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:col-span-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Add test
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={!!pricing} onOpenChange={(o) => !o && setPricing(null)} title={`Price · ${pricing?.name ?? ''}`}>
        {pricing && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const price = Number(new FormData(e.currentTarget).get('price'));
              if (Number.isFinite(price) && price >= 0) setPrice.mutate({ t: pricing, price });
            }}
          >
            <Field label="Price (₹)" htmlFor="edit-price">
              <Input id="edit-price" name="price" inputMode="decimal" autoFocus defaultValue={String(pricing.pricePaise / 100)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPricing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={setPrice.isPending}>
                Save price
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? ''}?`}
        description="Doctors can no longer order it. Earlier orders keep their price."
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </Card>
  );
}

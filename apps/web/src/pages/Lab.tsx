import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ClipboardEdit, FlaskConical, GripVertical, ListPlus, Pencil, Plus, Printer, TestTube, Trash2, X, Undo2 } from 'lucide-react';
import { formatRupees, LAB_CATALOG, opToken, type LabQueueEntry, type LabTest } from '@platform/shared';
import { Avatar, Badge, Button, buttonVariants, Card, ConfirmDelete, ConfirmDialog, Dialog, EmptyState, Field, Input, PageHeader, Pager, Skeleton, Table, Tabs, TabsContent, TabsList, TabsTrigger, TBody, TD, TH, THead, toast, TR, usePaged } from '@platform/ui';
import { fmtDateTime } from '@/components/format';
import { api, errorMessage } from '@/api/client';
import { PrintHeaderForm } from '@/components/PrintHeaderForm';
import { useBranch, useCan } from '@/state/auth';
import { PrintLink } from '@/components/print';
import { departmentLabel, LabTestForm } from '@/components/LabTestForm';
import { DirectLab } from '@/components/DirectLab';
import { LabPackagesCard } from '@/components/LabPackages';
import { LabPeriodReport } from '@/components/LabPeriodReport';
import { ListSearch, textMatch } from '@/components/ListSearch';

export function Lab() {
  const current = useBranch();
  const canManageTests = useCan('settings.manage');
  // The tab lives in the URL (?tab=done), so the results page can send the lab straight to Completed.
  const [params, setParams] = useSearchParams();
  const canReports = useCan('reports.view');
  const labTests = useQuery({ queryKey: ['lab-tests', current?.slug], queryFn: () => api.get<{ tests: LabTest[] }>(`/b/${current!.slug}/lab/tests`), enabled: !!current });
  const [direct, setDirect] = useState(false);
  const tab = ['done', 'tests', 'header', 'reports'].includes(params.get('tab') ?? '') ? params.get('tab')! : 'queue';
  return (
    <div>
      <PageHeader
        title="Lab"
        description={`Tests ordered by doctors at ${current?.name}. Enter results, then print the report.`}
        actions={
          <Button onClick={() => setDirect(true)}>
            <FlaskConical /> Direct lab test
          </Button>
        }
      />
      {current && <DirectLab branch={current.slug} open={direct} onClose={() => setDirect(false)} />}
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'queue' ? {} : { tab: v }, { replace: true })}>
        <TabsList className="mb-4 max-w-full overflow-x-auto">
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="done">Completed</TabsTrigger>
          <TabsTrigger value="tests">Tests & prices</TabsTrigger>
          {canReports && <TabsTrigger value="reports">Lab reports</TabsTrigger>}
          {canManageTests && current && <TabsTrigger value="header">Report header</TabsTrigger>}
        </TabsList>
        <TabsContent value="queue">
          <LabQueue status="" />
        </TabsContent>
        <TabsContent value="done">
          <LabQueue status="completed" />
        </TabsContent>
        <TabsContent value="tests">
          {current && <LabPackagesCard branch={current.slug} tests={labTests.data?.tests ?? []} canManage={canManageTests} />}
          <LabTests canManage={canManageTests} />
        </TabsContent>
        {canReports && current && (
          <TabsContent value="reports">
            <LabPeriodReport branch={current.slug} />
          </TabsContent>
        )}
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
  const [q, setQ] = useState('');
  // Completed tests: typed, the server looks through all of them (the list shows the latest 300).
  const asked = useDeferredValue(q.trim());
  const searching = status === 'completed' && asked.length >= 2;
  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-queue', branch, status, searching ? asked : ''],
    queryFn: () => api.get<{ orders: LabQueueEntry[] }>(`/b/${branch}/lab/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(searching ? { q: asked } : {}) })}`),
    placeholderData: (prev) => prev,
  });
  const [cancelling, setCancelling] = useState<LabQueueEntry | null>(null);
  const found = (data?.orders ?? []).filter((o) => textMatch(q, o.patientName, o.patientUhid, o.opNo, o.testName, o.doctorName));
  // One row per patient visit (a direct lab order of 4 tests is one patient, one sample round, one report).
  const visits = Object.values(
    found.reduce<Record<number, LabQueueEntry[]>>((acc, o) => ((acc[o.visitId] ??= []).push(o), acc), {}),
  ).sort((a, b) => (status ? b[0]!.id - a[0]!.id : a[0]!.id - b[0]!.id));
  const { rows, pager } = usePaged(visits, `${status}|${q}`);
  const back = useMutation({
    mutationFn: (o: LabQueueEntry) => api.post(`/b/${branch}/lab/visits/${o.visitId}/back-to-doctor`),
    onSuccess: (_d, o) => {
      for (const k of ['lab-queue', 'visits', 'visit']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(`${o.patientName} sent back to the doctor`, { description: 'They are on the doctor\'s waiting list again. The test stays in this list: cancel it if it is not wanted.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (o: LabQueueEntry) => api.patch(`/b/${branch}/lab/orders/${o.id}`, { status: 'cancelled' }),
    onSuccess: (_d, o) => {
      for (const k of ['lab-queue', 'patient-lab', 'patient-bills', 'visit-lab', 'visit-bills', 'visits', 'visit', 'checkout-queue']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(`${o.testName} cancelled for ${o.patientName}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  // One press for all the tests of the visit still waiting for their sample.
  const collect = useMutation({
    mutationFn: async (os: LabQueueEntry[]) => {
      for (const o of os) await api.patch(`/b/${branch}/lab/orders/${o.id}`, { status: 'sample_collected' });
    },
    onSuccess: (_d, os) => {
      qc.invalidateQueries({ queryKey: ['lab-queue', branch] });
      qc.invalidateQueries({ queryKey: ['patient-lab', branch] });
      qc.invalidateQueries({ queryKey: ['checkout-queue', branch] });
      toast.success(`Sample collected · ${os.map((o) => o.testName).join(', ')} for ${os[0]!.patientName}`);
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ['lab-queue', branch] });
      toast.error(errorMessage(e));
    },
  });

  const undoSample = useMutation({
    mutationFn: (o: LabQueueEntry) => api.patch(`/b/${branch}/lab/orders/${o.id}`, { status: 'ordered' }),
    onSuccess: (_d, o) => {
      qc.invalidateQueries({ queryKey: ['lab-queue', branch] });
      qc.invalidateQueries({ queryKey: ['patient-lab', branch] });
      toast.success(`${o.testName} is waiting for the sample again`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-48" />;
  if (error) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;
  const orders = rows;
  return (
    <Card>
      {((data?.orders.length ?? 0) > 0 || q) && (
        <div className="border-b border-border px-4 py-3">
          <ListSearch label="Search the tests" placeholder="Name, UHID, OP no. or test…" value={q} onChange={setQ} />
        </div>
      )}
      {orders.length === 0 ? (
        q ? <EmptyState icon={FlaskConical} title={`Nothing matches “${q}”`} /> : <EmptyState icon={FlaskConical} title={status ? 'No completed tests yet' : 'No tests waiting'} description={status ? undefined : 'Tests a doctor orders from an OP visit show up here.'} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Patient</TH>
              <TH>Tests</TH>
              <TH className="hidden md:table-cell">Token · OP no. · Doctor</TH>
              <TH className="hidden sm:table-cell">Status</TH>
              <TH className="hidden text-right sm:table-cell">Action</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {orders.map((tests) => {
              const o = tests[0]!;
              const waiting = tests.filter((t) => t.status === 'ordered');
              const done = tests.every((t) => t.status === 'completed');
              const count = (st: string) => tests.filter((t) => t.status === st).length;
              return (
              <TR key={o.visitId} onOpen={() => navigate(`/${branch}/lab/visits/${o.visitId}`)}>
                <TD>
                  <Link to={`/${branch}/lab/visits/${o.visitId}`} className="flex items-center gap-2.5">
                    <Avatar name={o.patientName} size="sm" />
                    <span>
                      <span className="block font-medium hover:underline">{o.patientName}</span>
                      <span className="block font-mono text-[11px] text-muted">{o.patientUhid}</span>
                      {/* On a phone the status column is left out: paid or not shows here. */}
                      <Badge tone={o.paid ? 'positive' : 'critical'} className="mt-1 sm:hidden">
                        {o.paid ? 'Paid' : 'Not paid'}
                      </Badge>
                    </span>
                  </Link>
                </TD>
                <TD className="sm:min-w-80">
                  <ul className="space-y-1">
                    {tests.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:whitespace-nowrap">
                        <span className="font-medium">{t.testName}</span>
                        <Badge tone={t.status === 'ordered' ? 'warning' : t.status === 'completed' ? 'positive' : 'brand'} dot>
                          {t.status === 'ordered' ? 'Waiting for sample' : t.status === 'completed' ? 'Completed' : 'Sample collected'}
                        </Badge>
                        {canCollect && t.status === 'sample_collected' && (
                          <button type="button" className="text-xs font-medium text-muted hover:text-ink hover:underline" disabled={undoSample.isPending} onClick={(e) => (e.stopPropagation(), undoSample.mutate(t))} title="Pressed by mistake? Puts this test back to waiting for the sample.">
                            Undo sample
                          </button>
                        )}
                        {t.status !== 'completed' && (
                          <button type="button" className="rounded p-0.5 text-muted hover:bg-subtle hover:text-critical" aria-label={`Cancel ${t.testName}`} title="Cancel this test" disabled={cancel.isPending} onClick={(e) => (e.stopPropagation(), setCancelling(t))}>
                            <X className="size-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {o.labNote && (
                    <span className="mt-1 block max-w-xs text-xs font-normal whitespace-pre-wrap text-muted">
                      <span className="font-semibold text-ink">Doctor's note: </span>
                      {o.labNote}
                    </span>
                  )}
                  {/* Phone: the one action that is pressed here; everything else opens with the row. */}
                  {canCollect && waiting.length > 0 && (
                    <Button size="sm" variant="outline" className="mt-2 sm:hidden" disabled={collect.isPending} onClick={(e) => (e.stopPropagation(), collect.mutate(waiting))}>
                      <TestTube /> Sample collected{waiting.length > 1 ? ` (${waiting.length})` : ''}
                    </Button>
                  )}
                </TD>
                <TD className="hidden text-muted md:table-cell">
                  {opToken(o.opNo) != null && <span className="font-medium text-ink">Token {opToken(o.opNo)} · </span>}
                  <span className="font-mono text-xs">{o.opNo}</span>
                  {o.doctorName && ` · ${o.doctorName}`}
                  <span className="block text-xs">Ordered {fmtDateTime(o.createdAt)}{done && o.completedAt ? ` · done ${fmtDateTime(tests.map((t) => t.completedAt!).sort().at(-1)!)}` : ''}</span>
                </TD>
                <TD className="hidden sm:table-cell">
                  <div className="text-xs text-muted">
                    {tests.length} test{tests.length === 1 ? '' : 's'}
                    {!done && [count('ordered') && `${count('ordered')} waiting`, count('sample_collected') && `${count('sample_collected')} collected`, count('completed') && `${count('completed')} done`].filter(Boolean).map((x) => ` · ${x}`).join('')}
                  </div>
                  <Badge tone={o.paid ? 'positive' : 'critical'} className="mt-1">
                    {o.paid ? 'Paid' : 'Not paid'}
                  </Badge>
                  {/* Sent back by the lab: the tests stay here until they are done or cancelled. */}
                  {!done && o.visitStatus === 'waiting' && <span className="mt-1 block text-xs text-muted">Patient is back with the doctor</span>}
                </TD>
                <TD className="hidden sm:table-cell">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {/* The patient is going elsewhere: allowed until results are entered (the server refuses after that). */}
                    {!done && o.visitStatus === 'at_lab' && (
                      <Button size="sm" variant="ghost" disabled={back.isPending} onClick={() => back.mutate(o)} title="The patient does not wait here: back to the doctor's waiting list. The tests stay ordered.">
                        <Undo2 /> Back to doctor
                      </Button>
                    )}
                    {canCollect && waiting.length > 0 && (
                      <Button size="sm" variant="outline" disabled={collect.isPending} onClick={() => collect.mutate(waiting)} title={waiting.length > 1 ? `Marks all ${waiting.length} tests as collected` : undefined}>
                        <TestTube /> Sample collected{waiting.length > 1 ? ` (${waiting.length})` : ''}
                      </Button>
                    )}
                    {done ? (
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
              );
            })}
          </TBody>
        </Table>
      )}
      <Pager {...pager} />
      <ConfirmDelete
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel ${cancelling?.testName ?? 'test'}?`}
        description={`For ${cancelling?.patientName ?? 'this patient'}. It is removed from the queue and from the bill.`}
        pending={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling, { onSettled: () => setCancelling(null) })}
      />
    </Card>
  );
}

function LabTests({ canManage }: { canManage: boolean }) {
  const { branch } = useParams();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LabTest | null>(null);
  const [deleting, setDeleting] = useState<LabTest | null>(null);
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
  const remove = useMutation({
    mutationFn: (t: LabTest) => api.delete(`/b/${branch}/lab/tests/${t.id}`),
    onSuccess: (_d, t) => {
      qc.invalidateQueries({ queryKey: ['lab-tests', branch] });
      setDeleting(null);
      toast.success(`${t.name} deleted`);
    },
  });
  // "Load standard tests" is offered only while a standard test is missing from the list: once loaded, it is gone.
  const have = new Set((data?.tests ?? []).map((t) => t.name.toLowerCase()));
  const canLoad = canManage && !!data && LAB_CATALOG.some((t) => !have.has(t.name.toLowerCase()));
  const departments = [...new Set((data?.tests ?? []).map((t) => t.department))].sort();
  const [q, setQ] = useState('');
  const shownTests = (data?.tests ?? []).filter((t) => textMatch(q, t.name, departmentLabel(t.department)));
  // Drag a test onto another to put it there: the doctor's list, the queue and the printed report follow this order.
  const [dragId, setDragId] = useState<number | null>(null);
  const canDrag = canManage && !q.trim() && (data?.tests.length ?? 0) > 1;
  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.put(`/b/${branch}/lab/tests/order`, { ids }),
    onMutate: (ids) => {
      const prev = qc.getQueryData<{ tests: LabTest[] }>(['lab-tests', branch]);
      if (prev) qc.setQueryData(['lab-tests', branch], { ...prev, tests: ids.map((id) => prev.tests.find((x) => x.id === id)!).filter(Boolean) });
      return { prev };
    },
    onError: (e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(['lab-tests', branch], ctx.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: () => toast.success('Order saved', { description: 'The doctor’s list and the report follow it.' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['lab-tests', branch] }),
  });
  const dropOn = (targetId: number) => {
    const list = data?.tests ?? [];
    if (dragId == null || dragId === targetId) return;
    const from = list.findIndex((x) => x.id === dragId), to = list.findIndex((x) => x.id === targetId);
    const ids = list.map((x) => x.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId) + (from < to ? 1 : 0), 0, dragId);
    reorder.mutate(ids);
  };

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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Tests & prices</div>
          <div className="text-xs text-muted">What doctors can order in this branch.{canManage ? ' Drag a test by its handle to change the order.' : ''}</div>
        </div>
        {(data?.tests.length ?? 0) > 8 && <ListSearch className="sm:w-56" label="Search the tests" placeholder="Test name…" value={q} onChange={setQ} />}
        {canManage && (
          <div className="flex gap-2">
            {canLoad && (
              <Button size="sm" variant="outline" disabled={loadStandard.isPending} onClick={() => setConfirmLoad(true)}>
                <ListPlus /> Load standard tests
              </Button>
            )}
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
            {shownTests.map((t) => (
              <TR
                key={t.id}
                draggable={canDrag}
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => dragId != null && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOn(t.id);
                  setDragId(null);
                }}
                className={dragId === t.id ? 'opacity-40' : dragId != null ? 'outline-dashed outline-1 outline-brand/40' : undefined}
              >
                <TD>
                  <div className="flex items-start gap-2">
                  {canDrag && (
                    <span className="mt-0.5 cursor-grab text-muted active:cursor-grabbing" title="Drag to change the order" aria-hidden>
                      <GripVertical className="size-4" />
                    </span>
                  )}
                  <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted">
                    {t.parameterCount} result line{t.parameterCount === 1 ? '' : 's'}
                    {t.kind === 'card' && ' · card test'}
                  </div>
                  </div>
                  </div>
                </TD>
                <TD className="hidden text-xs text-muted md:table-cell">{departmentLabel(t.department)}</TD>
                <TD className={`text-right tabular-nums ${t.pricePaise === 0 ? 'text-warning' : ''}`}>{formatRupees(t.pricePaise)}</TD>
                {canManage && (
                  <TD className="text-right whitespace-nowrap">
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
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
      <Dialog wide open={adding} onOpenChange={setAdding} title="Add lab test" description="A single test, or a group test with its own result lines (e.g. CBC: Haemoglobin, Basophils …).">
        {adding && <LabTestForm branch={branch!} departments={departments} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
      </Dialog>
      <Dialog wide open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={`Edit · ${editing?.name ?? ''}`} description="Name, price and result lines. Reports already printed are not changed; a reprint shows the lines as they are now.">
        {editing && <LabTestForm branch={branch!} testId={editing.id} departments={departments} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />}
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

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { Building2, FilePlus2, MoreHorizontal, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { formatRupees, vendorInputSchema, type PurchaseBillSummary, type Vendor, type VendorInput } from '@platform/shared';
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  ConfirmDelete,
  Dialog,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  toast,
  TR,
} from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useBranch, useCan } from '@/state/auth';
import { fmtDay } from '@/components/format';



export const purchaseStatus: Record<PurchaseBillSummary['status'], { label: string; tone: 'warning' | 'brand' | 'positive' | 'neutral' }> = {
  unpaid: { label: 'Unpaid', tone: 'warning' },
  part_paid: { label: 'Part paid', tone: 'brand' },
  paid: { label: 'Paid', tone: 'positive' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function Vendors() {
  const { branch } = useParams();
  const current = useBranch();
  const canManage = useCan('vendor.manage');
  const navigate = useNavigate();
  const vendors = useQuery({ queryKey: ['vendors', branch], queryFn: () => api.get<{ vendors: Vendor[] }>(`/b/${branch}/vendors`) });
  const bills = useQuery({ queryKey: ['purchases', branch], queryFn: () => api.get<{ bills: PurchaseBillSummary[] }>(`/b/${branch}/purchases`) });
  const due = (vendors.data?.vendors ?? []).reduce((s, v) => s + v.duePaise, 0);
  const overdue = (vendors.data?.vendors ?? []).reduce((s, v) => s + v.overduePaise, 0);

  return (
    <div>
      <PageHeader
        title="Vendors"
        description={`Suppliers of ${current?.name}, medicine purchases and what you owe them.`}
        actions={
          <Button onClick={() => navigate(`/${branch}/vendors/purchases/new`)}>
            <FilePlus2 /> New purchase bill
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Building2} label="Vendors" value={vendors.data?.vendors.length ?? 0} loading={vendors.isLoading} />
        <StatCard icon={ReceiptText} tone="warning" label="You owe" value={formatRupees(due)} footnote="Unpaid purchase bills" loading={vendors.isLoading} />
        <StatCard icon={ReceiptText} tone="critical" label="Overdue" value={formatRupees(overdue)} footnote="Past the due date" loading={vendors.isLoading} />
      </div>
      <Tabs defaultValue="bills">
        <TabsList className="mb-4">
          <TabsTrigger value="bills">Purchase bills</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>
        <TabsContent value="bills">
          <PurchaseBillsTable branch={branch!} bills={bills.data?.bills} loading={bills.isLoading} error={bills.error} />
        </TabsContent>
        <TabsContent value="vendors">
          <VendorsTable branch={branch!} vendors={vendors.data?.vendors} loading={vendors.isLoading} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PurchaseBillsTable({ branch, bills, loading, error }: { branch: string; bills?: PurchaseBillSummary[]; loading: boolean; error: unknown }) {
  const navigate = useNavigate();
  return (
    <Card>
      {loading ? (
        <div className="space-y-3 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : !bills?.length ? (
        <EmptyState icon={ReceiptText} title="No purchase bills yet" description="When medicines arrive, enter the vendor's bill here. It adds the stock in one go." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Vendor</TH>
              <TH className="hidden sm:table-cell">Bill no.</TH>
              <TH className="hidden md:table-cell">Date · Due</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {bills.map((b) => (
              <TR key={b.id} onOpen={() => navigate(`/${branch}/vendors/purchases/${b.id}`)}>
                <TD>
                  <Link to={`/${branch}/vendors/purchases/${b.id}`} className="font-medium hover:underline">
                    {b.vendorName}
                  </Link>
                </TD>
                <TD className="hidden font-mono text-xs sm:table-cell">{b.vendorBillNo ?? '—'}</TD>
                <TD className="hidden text-muted md:table-cell">
                  {fmtDay(b.billDate)} · <span className={b.overdue ? 'font-medium text-critical' : ''}>{fmtDay(b.dueDate)}</span>
                </TD>
                <TD className="text-right tabular-nums">
                  <div className="font-medium">{formatRupees(b.totalPaise)}</div>
                  {b.status === 'part_paid' && <div className="text-xs text-muted">paid {formatRupees(b.paidPaise)}</div>}
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={purchaseStatus[b.status].tone} dot>
                      {purchaseStatus[b.status].label}
                    </Badge>
                    {b.overdue && <Badge tone="critical">Overdue</Badge>}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function VendorsTable({ branch, vendors, loading, canManage }: { branch: string; vendors?: Vendor[]; loading: boolean; canManage: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Vendor | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['vendors', branch] });
  const remove = useMutation({
    mutationFn: (v: Vendor) => api.delete(`/b/${branch}/vendors/${v.id}`),
    onSuccess: (_d, v) => {
      refresh();
      setDeleting(null);
      toast.success(`${v.name} deleted`);
    },
  });

  return (
    <Card>
      {canManage && (
        <div className="flex justify-end border-b border-border p-3">
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Add vendor
          </Button>
        </div>
      )}
      {loading ? (
        <Skeleton className="m-4 h-24" />
      ) : !vendors?.length ? (
        <EmptyState icon={Building2} title="No vendors yet" description="Add the distributors you buy medicines from." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Vendor</TH>
              <TH className="hidden md:table-cell">GST no.</TH>
              <TH className="hidden sm:table-cell">Credit</TH>
              <TH className="text-right">You owe</TH>
              {canManage && <TH />}
            </tr>
          </THead>
          <TBody>
            {vendors.map((v) => (
              <TR key={v.id}>
                <TD>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-muted">{v.phone ?? ''}</div>
                </TD>
                <TD className="hidden font-mono text-xs md:table-cell">{v.gstNo ?? '—'}</TD>
                <TD className="hidden text-muted sm:table-cell">{v.creditDays ? `${v.creditDays} days` : 'Cash'}</TD>
                <TD className="text-right tabular-nums">
                  <div className={v.duePaise ? 'font-medium' : 'text-muted'}>{formatRupees(v.duePaise)}</div>
                  {v.overduePaise > 0 && <div className="text-xs font-medium text-critical">{formatRupees(v.overduePaise)} overdue</div>}
                </TD>
                {canManage && (
                  <TD className="text-right">
                    <Menu>
                      <MenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${v.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </MenuTrigger>
                      <MenuContent align="end">
                        <MenuItem onSelect={() => setEditing(v)}>
                          <Pencil /> Edit
                        </MenuItem>
                        <MenuItem destructive onSelect={() => setDeleting(v)}>
                          <Trash2 /> Delete vendor
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'Add vendor' : `Edit ${editing?.name ?? ''}`}>
        {editing && (
          <VendorForm
            initial={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => {
              if (editing === 'new') await api.post(`/b/${branch}/vendors`, v);
              else await api.patch(`/b/${branch}/vendors/${editing.id}`, v);
              refresh();
              setEditing(null);
              toast.success(editing === 'new' ? `${v.name} added` : 'Vendor saved');
            }}
          />
        )}
      </Dialog>
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? ''}?`}
        description="Only possible when nothing is owed to them. Their old bills stay in the records."
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </Card>
  );
}

function VendorForm({ initial, onSubmit, onCancel }: { initial?: Vendor; onSubmit: (v: VendorInput) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VendorInput>({
    resolver: zodResolver(vendorInputSchema),
    defaultValues: { name: initial?.name ?? '', phone: initial?.phone ?? '', address: initial?.address ?? '', gstNo: initial?.gstNo ?? '', creditDays: initial?.creditDays ?? 30, notes: initial?.notes ?? '' },
  });
  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((v) =>
        onSubmit(v).catch((e) => {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof VendorInput, { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }),
      )}
    >
      <Field label="Vendor name" htmlFor="v-name" error={errors.name?.message} className="sm:col-span-2">
        <Input id="v-name" autoFocus {...register('name')} />
      </Field>
      <Field label="Phone" htmlFor="v-phone">
        <Input id="v-phone" inputMode="tel" {...register('phone')} />
      </Field>
      <Field label="GST no." htmlFor="v-gst" error={errors.gstNo?.message} hint="Optional, 15 characters">
        <Input id="v-gst" className="font-mono uppercase" {...register('gstNo')} />
      </Field>
      <Field label="Credit days" htmlFor="v-credit" error={errors.creditDays?.message} hint="Bills are due this many days after the bill date (0 = pay now)">
        <Input id="v-credit" inputMode="numeric" {...register('creditDays', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })} />
      </Field>
      <Field label="Address" htmlFor="v-address" className="sm:col-span-2">
        <Textarea id="v-address" rows={2} {...register('address')} />
      </Field>
      {errors.root && <p className="text-sm text-critical sm:col-span-2">{errors.root.message}</p>}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save vendor'}
        </Button>
      </div>
    </form>
  );
}


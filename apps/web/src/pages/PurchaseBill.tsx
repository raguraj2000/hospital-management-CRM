import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Ban, Plus, Trash2, Wallet } from 'lucide-react';
import {
  FORM_UNIT,
  formatRupees,
  toPaise,
  VENDOR_PAYMENT_MODES,
  type Medicine,
  type PurchaseBillDetail,
  type Vendor,
  type VendorPaymentMode,
} from '@platform/shared';
import { Badge, Button, Card, CardHeader, Dialog, EmptyState, Field, Input, NativeSelect, PageHeader, Skeleton, Table, TBody, TD, Textarea, TH, THead, toast, TR } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { fmtDay, purchaseStatus } from './Vendors';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const modeLabel: Record<VendorPaymentMode, string> = { cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank: 'Bank transfer' };

interface Line {
  key: number;
  medicineId: string;
  batchNo: string;
  expiryDate: string;
  quantity: string;
  cost: string;
}
const emptyLine = (key: number): Line => ({ key, medicineId: '', batchNo: '', expiryDate: '', quantity: '', cost: '' });

/** Enter a vendor's bill as it arrives: every line becomes stock (batch + expiry). */
export function NewPurchaseBill() {
  const { branch } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const vendors = useQuery({ queryKey: ['vendors', branch], queryFn: () => api.get<{ vendors: Vendor[] }>(`/b/${branch}/vendors`) });
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`) });
  const [vendorId, setVendorId] = useState('');
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [billDate, setBillDate] = useState(today());
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * toPaise(Number(l.cost) || 0), 0), [lines]);
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function save() {
    setErrors({});
    const filled = lines.filter((l) => l.medicineId || l.batchNo || l.quantity);
    setSaving(true);
    try {
      const { bill } = await api.post<{ bill: PurchaseBillDetail }>(`/b/${branch}/purchases`, {
        vendorId: Number(vendorId) || 0,
        vendorBillNo,
        billDate,
        lines: filled.map((l) => ({
          medicineId: Number(l.medicineId) || 0,
          batchNo: l.batchNo,
          expiryDate: l.expiryDate,
          quantity: Number(l.quantity) || 0,
          unitCostPaise: toPaise(Number(l.cost) || 0),
        })),
      });
      qc.invalidateQueries({ queryKey: ['purchases', branch] });
      qc.invalidateQueries({ queryKey: ['vendors', branch] });
      qc.invalidateQueries({ queryKey: ['medicines', branch] });
      toast.success('Purchase bill saved', { description: `${filled.length} item${filled.length > 1 ? 's' : ''} added to stock · ${formatRupees(bill.totalPaise)}` });
      navigate(`/${branch}/vendors/purchases/${bill.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0]!])));
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link to={`/${branch}/vendors`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Vendors
      </Link>
      <PageHeader title="New purchase bill" description="Type it exactly as on the vendor's bill. Saving adds every line to stock." />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-3">
        <Field label="Vendor" htmlFor="pb-vendor" error={errors.vendorId}>
          <NativeSelect id="pb-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">{vendors.data?.vendors.length === 0 ? 'Add a vendor first' : 'Choose vendor'}</option>
            {vendors.data?.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.creditDays ? ` · ${v.creditDays} days credit` : ''}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Vendor's bill no." htmlFor="pb-no">
          <Input id="pb-no" className="font-mono" value={vendorBillNo} onChange={(e) => setVendorBillNo(e.target.value)} />
        </Field>
        <Field label="Bill date" htmlFor="pb-date" error={errors.billDate}>
          <Input id="pb-date" type="date" value={billDate} max={today()} onChange={(e) => setBillDate(e.target.value)} />
        </Field>
      </Card>

      <Card>
        <CardHeader title="Items" description="One line per batch." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-subtle/60 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Medicine</th>
                <th className="px-3 py-2 font-medium">Batch no.</th>
                <th className="px-3 py-2 font-medium">Expiry</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Cost / unit (₹)</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const med = meds.data?.medicines.find((m) => String(m.id) === l.medicineId);
                const err = (f: string) => errors[`lines.${i}.${f}`];
                return (
                  <tr key={l.key} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <NativeSelect aria-label={`Line ${i + 1} medicine`} value={l.medicineId} onChange={(e) => setLine(l.key, { medicineId: e.target.value })} aria-invalid={!!err('medicineId')}>
                        <option value="">Choose</option>
                        {meds.data?.medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                            {m.strength ? ` ${m.strength}` : ''}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="px-3 py-2">
                      <Input aria-label={`Line ${i + 1} batch`} className="w-28 font-mono uppercase" value={l.batchNo} onChange={(e) => setLine(l.key, { batchNo: e.target.value })} aria-invalid={!!err('batchNo')} />
                    </td>
                    <td className="px-3 py-2">
                      <Input aria-label={`Line ${i + 1} expiry`} type="date" className="w-40" value={l.expiryDate} onChange={(e) => setLine(l.key, { expiryDate: e.target.value })} aria-invalid={!!err('expiryDate')} />
                      {err('expiryDate') && <div className="mt-1 text-xs text-critical">{err('expiryDate')}</div>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input aria-label={`Line ${i + 1} quantity`} inputMode="numeric" className="ml-auto w-20 text-right" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} aria-invalid={!!err('quantity')} />
                      {med && <div className="mt-1 text-xs text-muted">{FORM_UNIT[med.form]}</div>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input aria-label={`Line ${i + 1} cost`} inputMode="decimal" className="ml-auto w-24 text-right" value={l.cost} onChange={(e) => setLine(l.key, { cost: e.target.value })} />
                      {med && <div className="mt-1 text-xs text-muted">sells {formatRupees(med.pricePaise)}</div>}
                    </td>
                    <td className="px-3 py-2 pt-4 text-right font-medium tabular-nums">{formatRupees((Number(l.quantity) || 0) * toPaise(Number(l.cost) || 0))}</td>
                    <td className="px-1 py-2">
                      {lines.length > 1 && (
                        <Button size="icon-sm" variant="ghost" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                          <Trash2 className="text-critical" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, emptyLine(Math.max(...ls.map((x) => x.key)) + 1)])}>
            <Plus /> Add line
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted">Bill total</div>
              <div className="text-2xl font-semibold tabular-nums">{formatRupees(total)}</div>
            </div>
            <Button size="lg" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save & add to stock'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** One purchase bill: lines, payments to the vendor, cancel. */
export function PurchaseBillPage() {
  const { branch, id } = useParams();
  const qc = useQueryClient();
  const canManage = useCan('vendor.manage');
  const key = ['purchase', branch, id];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get<{ bill: PurchaseBillDetail }>(`/b/${branch}/purchases/${id}`) });
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const refresh = (bill: PurchaseBillDetail) => {
    qc.setQueryData(key, { bill });
    qc.invalidateQueries({ queryKey: ['purchases', branch] });
    qc.invalidateQueries({ queryKey: ['vendors', branch] });
    qc.invalidateQueries({ queryKey: ['medicines', branch] });
  };
  const pay = useMutation({
    mutationFn: (v: { amountPaise: number; mode: VendorPaymentMode; reference: string }) => api.post<{ bill: PurchaseBillDetail }>(`/b/${branch}/purchases/${id}/payments`, v),
    onSuccess: ({ bill }) => {
      refresh(bill);
      setPaying(false);
      toast.success('Payment recorded');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => api.post<{ bill: PurchaseBillDetail }>(`/b/${branch}/purchases/${id}/cancel`, { reason }),
    onSuccess: ({ bill }) => {
      refresh(bill);
      setCancelling(false);
      toast.success('Purchase bill cancelled', { description: 'Its stock was taken back out.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Card className="p-6 text-sm">{errorMessage(error)}</Card>;
  const b = data.bill;
  const balance = b.totalPaise - b.paidPaise;

  return (
    <div>
      <Link to={`/${branch}/vendors`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Vendors
      </Link>
      <PageHeader
        title={b.vendorName}
        description={`Bill ${b.vendorBillNo ?? '(no number)'} · ${fmtDay(b.billDate)} · due ${fmtDay(b.dueDate)}`}
        actions={
          <>
            <Badge tone={purchaseStatus[b.status].tone} dot>
              {purchaseStatus[b.status].label}
            </Badge>
            {b.overdue && <Badge tone="critical">Overdue</Badge>}
            {canManage && b.status !== 'cancelled' && balance > 0 && (
              <Button onClick={() => setPaying(true)}>
                <Wallet /> Pay vendor
              </Button>
            )}
            {canManage && b.canCancel && (
              <Button variant="outline" onClick={() => setCancelling(true)}>
                <Ban /> Cancel bill
              </Button>
            )}
          </>
        }
      />
      {b.status === 'cancelled' && <Card className="mb-4 border-critical/30 bg-critical-soft p-3 text-sm text-critical">Cancelled: {b.cancelReason}</Card>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Items" description="Sold = already dispensed from this batch." />
          <Table>
            <THead>
              <tr>
                <TH>Medicine</TH>
                <TH>Batch · Expiry</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-right">Cost</TH>
                <TH className="text-right">Amount</TH>
              </tr>
            </THead>
            <TBody>
              {b.lines.map((l) => (
                <TR key={l.id}>
                  <TD className="font-medium">{l.medicineName}</TD>
                  <TD className="text-muted">
                    <span className="font-mono text-xs">{l.batchNo}</span> · {fmtDay(l.expiryDate)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {l.quantity}
                    {l.soldQty > 0 && <div className="text-xs text-muted">{l.soldQty} sold</div>}
                  </TD>
                  <TD className="text-right tabular-nums text-muted">{formatRupees(l.unitCostPaise)}</TD>
                  <TD className="text-right font-medium tabular-nums">{formatRupees(l.amountPaise)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Payments" />
          <dl className="space-y-1.5 border-b border-border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Bill total</dt>
              <dd className="font-medium tabular-nums">{formatRupees(b.totalPaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Paid</dt>
              <dd className="tabular-nums">{formatRupees(b.paidPaise)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Balance</dt>
              <dd className="tabular-nums">{formatRupees(b.status === 'cancelled' ? 0 : balance)}</dd>
            </div>
          </dl>
          {b.payments.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" />
          ) : (
            <ul className="divide-y divide-border">
              {b.payments.map((p) => (
                <li key={p.id} className="flex justify-between px-4 py-2.5 text-sm">
                  <span>
                    {modeLabel[p.mode]}
                    {p.reference && <span className="text-muted"> · {p.reference}</span>}
                    <span className="block text-xs text-muted">
                      {new Date(p.paidAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {p.paidByName && ` · ${p.paidByName}`}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{formatRupees(p.amountPaise)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={paying} onOpenChange={setPaying} title={`Pay ${b.vendorName}`} description={`${formatRupees(balance)} is due on this bill.`}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            pay.mutate({ amountPaise: toPaise(Number(f.get('amount')) || 0), mode: f.get('mode') as VendorPaymentMode, reference: String(f.get('reference') ?? '') });
          }}
        >
          <Field label="Amount (₹)" htmlFor="vp-amount">
            <Input id="vp-amount" name="amount" inputMode="decimal" autoFocus defaultValue={String(balance / 100)} />
          </Field>
          <Field label="Paid by" htmlFor="vp-mode">
            <NativeSelect id="vp-mode" name="mode" defaultValue="bank">
              {VENDOR_PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {modeLabel[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Reference (UTR / cheque no.)" htmlFor="vp-ref" className="sm:col-span-2">
            <Input id="vp-ref" name="reference" className="font-mono" />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="outline" onClick={() => setPaying(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pay.isPending}>
              Record payment
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={cancelling} onOpenChange={setCancelling} title="Cancel this purchase bill?" description="Only for a bill entered by mistake. Its stock is taken back out. Type a short reason.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            cancel.mutate(String(new FormData(e.currentTarget).get('reason') ?? ''));
          }}
        >
          <Field label="Reason" htmlFor="pb-cancel">
            <Textarea id="pb-cancel" name="reason" rows={2} autoFocus placeholder="e.g. Entered twice" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelling(false)}>
              Keep bill
            </Button>
            <Button type="submit" variant="danger" disabled={cancel.isPending}>
              <Ban /> Cancel bill
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

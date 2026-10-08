import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Ban, Wallet } from 'lucide-react';
import {
  formatRupees,
  toPaise,
  VENDOR_PAYMENT_MODES,
  type PurchaseBillDetail,
  type VendorPaymentMode,
} from '@platform/shared';
import { Badge, Button, Card, CardHeader, Dialog, EmptyState, Field, Input, NativeSelect, PageHeader, Skeleton, Table, TBody, TD, Textarea, TH, THead, toast, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { fmtDay } from '@/components/format';
import { purchaseStatus } from './Vendors';

const modeLabel: Record<VendorPaymentMode, string> = { cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank: 'Bank transfer' };

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
                <TH className="text-right">Rate</TH>
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
                    {l.packSize > 1 || l.freeQty > 0 ? (
                      <>
                        {l.packQty} × {l.packSize}
                        {l.freeQty > 0 && <span className="text-positive"> + {l.freeQty} free</span>}
                        <div className="text-xs text-muted">= {l.quantity} units</div>
                      </>
                    ) : (
                      l.quantity
                    )}
                    {l.soldQty > 0 && <div className="text-xs text-muted">{l.soldQty} sold</div>}
                  </TD>
                  <TD className="text-right tabular-nums text-muted">
                    {formatRupees(l.ratePaise)}
                    {l.gstPercent > 0 && <div className="text-xs">+ {l.gstPercent}% GST</div>}
                    {l.mrpPaise != null && <div className="text-xs">MRP {formatRupees(l.mrpPaise)}</div>}
                  </TD>
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

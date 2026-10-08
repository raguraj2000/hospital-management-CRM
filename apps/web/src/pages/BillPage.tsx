import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, Lock, Printer, Wallet } from 'lucide-react';
import { billCharges, formatRupees, toPaise, type BillPaymentMode, type OpBill } from '@platform/shared';
import { Badge, Button, Card, CardHeader, Field, Input, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan, useMe } from '@/state/auth';
import { PrintLink, printInPlace } from '@/components/print';
import { PrintFacts, PrintSheet, usePrintHeader } from '@/components/PrintSheet';
import { useAutoPrint } from '@/components/useAutoPrint';
import { printDateTime, printMoney } from '@/components/printFormat';
import { visitLabel } from '@/components/Visits';
import { billLabel, billTone, fmtDateTime, modeLabel } from '@/components/format';
import { receiptUrl } from './Billing';
import { PaymentModeSelect } from '@/components/PaymentModeSelect';
import { chargeRowsOf, ChargeRowsEditor, chargesOf, type ChargeRow } from '@/components/BillCharges';

const rupees = (p: number) => String(p / 100);

/** One OP bill: fees + lab lines + discount; take payments; print. */
export function BillPage() {
  const { branch, billId } = useParams();
  const qc = useQueryClient();
  const canReceive = useCan('billing.receive');
  const key = ['bill', branch, billId];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get<{ bill: OpBill }>(`/b/${branch}/bills/${billId}`) });
  const [fee, setFee] = useState('');
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [discount, setDiscount] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<BillPaymentMode>('cash');

  useEffect(() => {
    if (!data) return;
    const b = data.bill;
    setFee(rupees(b.consultationFeePaise));
    setCharges(chargeRowsOf(billCharges(b)));
    setDiscount(rupees(b.discountPaise));
    setAmount(rupees(b.balancePaise));
  }, [data]);

  const after = (bill: OpBill) => {
    qc.setQueryData(key, { bill });
    for (const k of ['bills-due', 'to-bill', 'collection', 'visit-bills', 'patient-bills', 'patient-lab']) qc.invalidateQueries({ queryKey: [k, branch] });
    qc.invalidateQueries({ queryKey: ['lab-report', branch] });
  };
  const save = useMutation({
    mutationFn: () =>
      api.patch<{ bill: OpBill }>(`/b/${branch}/bills/${billId}`, {
        consultationFeePaise: toPaise(Number(fee) || 0),
        charges: chargesOf(charges),
        discountPaise: toPaise(Number(discount) || 0),
      }),
    onSuccess: ({ bill }) => {
      after(bill);
      toast.success('Bill updated');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const pay = useMutation({
    mutationFn: () => api.post<{ bill: OpBill }>(`/b/${branch}/bills/${billId}/payments`, { amountPaise: toPaise(Number(amount) || 0), mode }),
    onSuccess: ({ bill }) => {
      after(bill);
      toast.success(bill.status === 'paid' ? `Fully paid · ${bill.billNo}` : `Payment recorded · ${formatRupees(bill.balancePaise)} still due`);
      printInPlace(receiptUrl(branch!, bill.id, bill.payments.at(-1)!.id));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Card className="p-6 text-sm">{errorMessage(error)}</Card>;
  const b = data.bill;
  const editable = b.editable && canReceive;

  return (
    <div>
      <Link to={`/${branch}/billing`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Billing
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Bill <span className="font-mono">{b.billNo}</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            <Link to={`/${branch}/patients/${b.patientId}`} className="hover:underline">
              {b.patientName}
            </Link>{' '}
            · {b.patientUhid} · <Link to={`/${branch}/visits/${b.visitId}`} className="hover:underline">{visitLabel(b)}</Link>
            {b.doctorName && ` · ${b.doctorName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={billTone[b.status]} dot>
            {billLabel[b.status]}
          </Badge>
          <a href={`/${branch}/billing/${b.id}/print`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-subtle">
            <Printer className="size-4" /> Print bill
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Charges"
            description={editable ? 'Change fees or discount before taking payment.' : undefined}
            action={!b.editable && <span className="flex items-center gap-1 text-xs text-muted"><Lock className="size-3.5" /> Locked after payment</span>}
          />
          <div className="divide-y divide-border">
            <Row label="Consultation fee">{editable ? <MoneyInput label="Consultation fee" value={fee} onChange={setFee} /> : formatRupees(b.consultationFeePaise)}</Row>
            {b.lines
              .filter((l) => l.labOrderId != null)
              .map((l) => (
                <Row key={l.id} label={l.description} hint="Lab test">
                  {formatRupees(l.amountPaise)}
                </Row>
              ))}
            {editable ? (
              <ChargeRowsEditor rows={charges} onChange={setCharges} />
            ) : (
              billCharges(b).map((x, i) => (
                <Row key={i} label={x.description} hint="Other charge">
                  {formatRupees(x.amountPaise)}
                </Row>
              ))
            )}
            <Row label="Discount">{editable ? <MoneyInput label="Discount" value={discount} onChange={setDiscount} /> : `− ${formatRupees(b.discountPaise)}`}</Row>
            <div className="flex items-center justify-between px-4 py-3 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatRupees(b.totalPaise)}</span>
            </div>
          </div>
          {editable && (
            <div className="flex justify-end border-t border-border p-3">
              <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate()}>
                Update bill
              </Button>
            </div>
          )}
        </Card>

        <Card className="h-fit lg:col-span-2">
          <CardHeader title="Payment" icon={Wallet} iconTone="positive" />
          <dl className="space-y-1.5 border-b border-border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Paid</dt>
              <dd className="tabular-nums">{formatRupees(b.paidPaise)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Balance due</dt>
              <dd className="tabular-nums">{formatRupees(b.balancePaise)}</dd>
            </div>
          </dl>
          {canReceive && b.balancePaise > 0 && (
            <form
              className="grid grid-cols-2 gap-3 border-b border-border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                pay.mutate();
              }}
            >
              <Field label="Amount (₹)" htmlFor="pay-amount">
                <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Paid by" htmlFor="pay-mode">
                <PaymentModeSelect id="pay-mode" value={mode} onChange={setMode} />
              </Field>
              <Button type="submit" className="col-span-2" size="lg" disabled={pay.isPending}>
                <Wallet /> Receive {formatRupees(toPaise(Number(amount) || 0))}
              </Button>
            </form>
          )}
          {b.payments.length > 0 && (
            <ul className="divide-y divide-border">
              {b.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span>
                    {modeLabel[p.mode]}
                    <span className="block text-xs text-muted">
                      {fmtDateTime(p.receivedAt)}
                      {p.receivedByName && ` · ${p.receivedByName}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">{formatRupees(p.amountPaise)}</span>
                    <PrintLink href={receiptUrl(branch!, b.id, p.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-subtle">
                      <Printer className="size-3.5" /> Receipt
                    </PrintLink>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className="tabular-nums">{children}</div>
    </div>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted">₹</span>
      <Input aria-label={label} inputMode="decimal" className="h-8 w-28 text-right" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** A4 bill with the branch letterhead. */
export function BillPrint() {
  const { branch, billId } = useParams();
  const { data: me } = useMe();
  const allowed = me?.branches.find((b) => b.slug === branch)?.permissions.some((p) => p === 'billing.receive' || p === 'patient.view');
  const bill = useQuery({ queryKey: ['bill', branch, billId], queryFn: () => api.get<{ bill: OpBill }>(`/b/${branch}/bills/${billId}`), enabled: !!allowed });
  const header = usePrintHeader(branch, !!allowed);
  useAutoPrint(!!bill.data && !!header.data);

  if (!me) return <Navigate to="/login" replace />;
  if (!allowed) return <p className="p-8 text-sm">No access.</p>;
  if (bill.isLoading || header.isLoading) return <p className="p-8 text-sm">Loading…</p>;
  if (!bill.data || !header.data) return <p className="p-8 text-sm text-red-700">{errorMessage(bill.error ?? header.error)}</p>;
  const b = bill.data.bill;
  // Consultation always shows; lab tests and other charges when present.
  const rows: [string, number][] = [['Consultation fee', b.consultationFeePaise]];
  for (const l of b.lines) if (l.labOrderId != null) rows.push([`Lab: ${l.description}`, l.amountPaise]);
  for (const x of billCharges(b)) rows.push([x.description, x.amountPaise]);

  return (
    <PrintSheet header={header.data.header} title="BILL" tabTitle={`Bill ${b.billNo} - ${b.patientName}`}>
      <PrintFacts
        facts={[
          ['Patient', b.patientName],
          ['Bill No.', b.billNo],
          ['UHID', b.patientUhid],
          ['Date & time', printDateTime(b.createdAt)],
          ['OP No.', b.opNo],
          ['Doctor', b.doctorName ?? '—'],
        ]}
      />
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-[#111]">
              <th className="w-10 py-1.5 text-left">#</th>
              <th className="py-1.5 text-left">Description</th>
              <th className="py-1.5 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([d, a], i) => (
              <tr key={i} className="border-b border-[#ccc]">
                <td className="py-1.5">{i + 1}</td>
                <td className="py-1.5">{d}</td>
                <td className="py-1.5 text-right tabular-nums">{printMoney(a)}</td>
              </tr>
            ))}
            {b.discountPaise > 0 && (
              <tr>
                <td />
                <td className="py-1.5 text-right">Discount</td>
                <td className="py-1.5 text-right tabular-nums">− {printMoney(b.discountPaise)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-[#111] text-[15px] font-bold">
              <td />
              <td className="py-2 text-right">Total</td>
              <td className="py-2 text-right tabular-nums">{printMoney(b.totalPaise)}</td>
            </tr>
            <tr>
              <td />
              <td className="py-1 text-right">Paid {b.payments.length > 0 && `(${[...new Set(b.payments.map((p) => modeLabel[p.mode]))].join(', ')})`}</td>
              <td className="py-1 text-right tabular-nums">{printMoney(b.paidPaise)}</td>
            </tr>
            {b.payments.map((x) => (
              <tr key={x.id} className="text-[12px]">
                <td />
                <td className="py-0.5 text-right">
                  {printDateTime(x.receivedAt)} · {modeLabel[x.mode]}
                </td>
                <td className="py-0.5 text-right tabular-nums">{printMoney(x.amountPaise)}</td>
              </tr>
            ))}
            {b.balancePaise > 0 && (
              <tr className="font-semibold">
                <td />
                <td className="py-1 text-right">Balance due</td>
                <td className="py-1 text-right tabular-nums">{printMoney(b.balancePaise)}</td>
              </tr>
            )}
          </tbody>
        </table>
    </PrintSheet>
  );
}

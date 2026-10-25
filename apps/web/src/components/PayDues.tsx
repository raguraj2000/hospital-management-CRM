// "Collect dues": the patient pays what they owe from earlier bills, all at once or a part, later than the visit.
// The amount goes to the oldest bill first.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { BILL_PAYMENT_MODES, formatRupees, toPaise, type BillPaymentMode } from '@platform/shared';
import { Button, Dialog, Field, Input, NativeSelect, toast } from '@platform/ui';
import { api, errorMessage } from '@/core/api/client';

const MODE: Record<BillPaymentMode, string> = { cash: 'Cash', upi: 'UPI', card: 'Card' };

export function PayDues({ branch, patientId, patientName, duePaise }: { branch: string; patientId: number; patientName: string; duePaise: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<BillPaymentMode>('cash');
  const paise = amount === '' ? duePaise : toPaise(Number(amount) || 0);
  const pay = useMutation({
    mutationFn: () => api.post<{ bills: { billNo: string; amountPaise: number }[]; leftDuePaise: number }>(`/b/${branch}/patients/${patientId}/pay-dues`, { amountPaise: paise, mode }),
    onSuccess: (r) => {
      for (const k of ['patient-bills', 'bills-due', 'checkout-queue', 'collection', 'dashboard', 'bill', 'patients']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(`Collected ${formatRupees(paise)} from ${patientName}`, { description: `${r.bills.map((b) => `${b.billNo} ${formatRupees(b.amountPaise)}`).join(' · ')}${r.leftDuePaise ? ` · ${formatRupees(r.leftDuePaise)} still due` : ' · nothing due now'}` });
      setOpen(false);
      setAmount('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (duePaise <= 0) return null;
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Wallet /> Collect dues {formatRupees(duePaise)}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Collect dues" description={`${patientName} owes ${formatRupees(duePaise)} on earlier bills. The oldest bill is paid first.`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (paise > 0 && paise <= duePaise && !pay.isPending) pay.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field required label="Amount (₹)" htmlFor="dues-amount" hint={paise < duePaise && paise > 0 ? `${formatRupees(duePaise - paise)} stays due` : 'All of it'}>
              <Input id="dues-amount" autoFocus inputMode="decimal" className="text-right text-lg font-semibold tabular-nums" placeholder={String(duePaise / 100)} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={paise > duePaise} />
            </Field>
            <Field required label="Paid by" htmlFor="dues-mode">
              <NativeSelect id="dues-mode" value={mode} onChange={(e) => setMode(e.target.value as BillPaymentMode)}>
                {BILL_PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {MODE[m]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {paise > duePaise && <p className="text-sm text-critical">Only {formatRupees(duePaise)} is due.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={paise <= 0 || paise > duePaise || pay.isPending}>
              <Wallet /> {pay.isPending ? 'Saving…' : `Collect ${formatRupees(paise)}`}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

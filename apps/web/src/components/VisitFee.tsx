import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { formatRupees, toPaise, type VisitFee } from '@platform/shared';
import { Button, Chips, Dialog, Field, Input, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';

/**
 * This visit's consultation fee, with "Change" for the doctor (and the counter): a different amount, free,
 * or back to the standard fee from Settings. Locked once a payment was taken on the bill.
 */
export function VisitFeeEditor({ branch, visitId, fee, cancelled }: { branch: string; visitId: number; fee: VisitFee; cancelled: boolean }) {
  const canChange = [useCan('prescription.write'), useCan('billing.receive')].some(Boolean) && !fee.locked && !cancelled;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rupees, setRupees] = useState('');
  const paise = toPaise(Number(rupees));
  const valid = rupees.trim() !== '' && Number.isFinite(paise) && paise >= 0;
  const standard = String(fee.standardFeePaise / 100);
  const quick = [...new Set([standard, '0'])];

  const save = useMutation({
    // The standard amount is stored as "no own fee", so the visit follows Settings again.
    mutationFn: () => api.put(`/b/${branch}/visits/${visitId}/consultation-fee`, { consultationFeePaise: paise === fee.standardFeePaise ? null : paise }),
    onSuccess: () => {
      for (const k of ['visit', 'visit-bills', 'bill', 'checkout', 'checkout-queue', 'bills-due', 'patient-bills']) qc.invalidateQueries({ queryKey: [k, branch] });
      setOpen(false);
      toast.success(`Consultation fee for this visit: ${formatRupees(paise)}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <span className="inline-flex items-center gap-2">
      <span>
        <span className="text-muted">Consultation fee </span>
        <b className="tabular-nums">{formatRupees(fee.consultationFeePaise)}</b>
        {fee.consultationFeePaise !== fee.standardFeePaise && <span className="text-muted"> (standard {formatRupees(fee.standardFeePaise)})</span>}
        {fee.locked && <span className="text-muted"> · paid</span>}
      </span>
      {canChange && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setRupees(String(fee.consultationFeePaise / 100));
            setOpen(true);
          }}
        >
          <Pencil /> Change
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="Consultation fee for this visit" description={`Only this visit changes. The standard fee stays ${formatRupees(fee.standardFeePaise)} (Settings).`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate();
          }}
        >
          <Field label="Fee (₹)" htmlFor="visit-fee">
            <Input id="visit-fee" autoFocus inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} />
          </Field>
          <Chips aria-label="Quick amounts" options={quick} isOn={(x) => x === rupees.trim()} onPick={setRupees} label={(x) => (x === '0' ? 'Free (₹0)' : `Standard ₹${x}`)} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save fee'}
            </Button>
          </div>
        </form>
      </Dialog>
    </span>
  );
}

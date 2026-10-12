// The extra charges of a visit (dressing, IV, ...): the doctor adds them on the visit page, the counter while
// collecting. Each one is saved at once, so it is still there after a refresh and on the other screen.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { formatRupees, ROUND_OFF_LINE, toPaise, type VisitCharges } from '@platform/shared';
import { Button, cn, Input, NativeSelect, toast, ConfirmDelete } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';

/** The procedures every clinic day has. A price set for the same name in Settings is used; otherwise Rs 100 to start with. */
const USUAL_CHARGES = ['IM INJ', 'IVF', 'SV Set Inj', 'Dressing', 'Sutures', 'Venflon', 'Procedure (I & D)', 'Procedure (D & C)', 'USG', 'ECG'];

/** Everything that shows a visit's money. */
const AFTER_CHARGE = ['visit-charges', 'checkout', 'checkout-queue', 'visit-bills', 'bill', 'bills-due', 'to-bill', 'patient-bills', 'dashboard'];

/** `big`: the taller rows of the counter's checkout. */
export function VisitChargesBox({ branch, visitId, big }: { branch: string; visitId: number; big?: boolean }) {
  const qc = useQueryClient();
  const canWrite = [useCan('prescription.write'), useCan('billing.receive')].some(Boolean);
  const key = ['visit-charges', branch, visitId];
  const { data } = useQuery({ queryKey: key, queryFn: () => api.get<VisitCharges>(`/b/${branch}/visits/${visitId}/charges`), staleTime: 0 });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<{ key: string; description: string } | null>(null);
  const [what, setWhat] = useState('');
  // A typed charge starts at Rs 100: most are, and it is one key to change.
  const [amount, setAmount] = useState('100');
  const refresh = (fresh: VisitCharges) => {
    qc.setQueryData(key, fresh);
    for (const k of AFTER_CHARGE) qc.invalidateQueries({ queryKey: [k, branch] });
  };
  const add = useMutation({
    mutationFn: () => api.post<VisitCharges>(`/b/${branch}/visits/${visitId}/charges`, { description: what.trim(), amountPaise: Math.max(0, toPaise(Number(amount) || 0)) }),
    onSuccess: (fresh) => {
      refresh(fresh);
      toast.success(`${what.trim()} added · ${formatRupees(toPaise(Number(amount) || 0))}`);
      setWhat('');
      setAmount('100');
      setAdding(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (k: string) => api.delete<VisitCharges>(`/b/${branch}/visits/${visitId}/charges/${k}`),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data) return null;
  const priced = (name: string) => data.presets.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
  const choices = [...USUAL_CHARGES.map((name) => ({ name, amountPaise: priced(name)?.amountPaise ?? 10_000 })), ...data.presets.filter((p) => !USUAL_CHARGES.some((n) => n.toLowerCase() === p.name.trim().toLowerCase()))];
  const canChange = canWrite && !data.locked;
  const row = cn('flex items-center justify-between gap-3 px-4', big ? 'min-h-11 py-2' : 'py-2 text-sm');
  const box = big ? 'h-11 text-base' : 'h-9';
  const ready = what.trim().length > 0 && Number(amount) > 0;

  return (
    <div>
      {data.charges.filter((c) => c.description !== ROUND_OFF_LINE).map((c) => (
        <div key={c.key} className={row}>
          <div className="min-w-0 font-medium">{c.description}</div>
          <div className="flex items-center gap-1.5">
            {/* Extra charges stand out: they are the ones that get forgotten. */}
            <span className="rounded-md bg-warning-soft px-2 py-0.5 font-semibold text-warning tabular-nums">{formatRupees(c.amountPaise)}</span>
            {canChange && (
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${c.description}`} disabled={remove.isPending} onClick={() => setRemoving(c)}>
                <X />
              </Button>
            )}
          </div>
        </div>
      ))}
      {data.charges.length === 0 && !adding && !big && <p className="px-4 py-2 text-sm text-muted">No other charges.</p>}
      {canChange &&
        (adding ? (
          <form
            className="space-y-2 border-t border-border bg-subtle/40 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && !add.isPending) add.mutate();
            }}
          >
            {(
              <NativeSelect
                aria-label="Ready-made charge"
                className={box}
                value=""
                onChange={(e) => {
                  const p = choices[Number(e.target.value)];
                  if (p) {
                    setWhat(p.name);
                    setAmount(String(p.amountPaise / 100));
                  }
                }}
              >
                <option value="">Pick a charge…</option>
                {choices.map((p, i) => (
                  <option key={i} value={i}>
                    {p.name} — {formatRupees(p.amountPaise)}
                  </option>
                ))}
              </NativeSelect>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Input aria-label="What the charge is for" placeholder="What for (e.g. Dressing, IV)" maxLength={60} className={cn(box, 'min-w-40 flex-1')} value={what} onChange={(e) => setWhat(e.target.value)} />
              <span className="text-muted">₹</span>
              <Input aria-label="Amount of the charge" inputMode="decimal" className={cn(box, 'w-24 text-right')} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size={big ? 'md' : 'sm'} onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size={big ? 'md' : 'sm'} disabled={!ready || add.isPending}>
                <Plus /> {add.isPending ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="px-4 py-2">
            <Button variant="outline" size={big ? 'md' : 'sm'} className={big ? 'h-11 text-base' : undefined} disabled={data.charges.length >= 20} onClick={() => setAdding(true)}>
              <Plus /> Add charge
            </Button>
          </div>
        ))}
      {data.locked && canWrite && <p className="px-4 py-2 text-xs text-muted">{data.locked}</p>}
      <ConfirmDelete
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.description ?? 'this charge'}?`}
        description="The charge is taken off this visit's bill."
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.key, { onSettled: () => setRemoving(null) })}
      />
    </div>
  );
}

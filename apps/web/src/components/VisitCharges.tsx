// The extra charges of a visit (dressing, IV, ...): the doctor adds them on the visit page, the counter while
// collecting. Each one is saved at once, so it is still there after a refresh and on the other screen.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Pencil, Plus, X } from 'lucide-react';
import { formatRupees, ROUND_OFF_LINE, toPaise, type VisitCharges } from '@platform/shared';
import { Button, cn, Input, NativeSelect, toast, ConfirmDelete } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';

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
  // The charge being changed (name and amount as typed).
  const [editing, setEditing] = useState<{ key: string; description: string; amount: string } | null>(null);
  const canSettings = useCan('settings.manage');
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
  const change = useMutation({
    mutationFn: (c: { key: string; description: string; amount: string }) => api.put<VisitCharges>(`/b/${branch}/visits/${visitId}/charges/${c.key}`, { description: c.description.trim(), amountPaise: Math.max(0, toPaise(Number(c.amount) || 0)) }),
    onSuccess: (fresh, c) => {
      refresh(fresh);
      toast.success(`${c.description.trim()} changed`);
      setEditing(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  // A ready-made charge picked from the list is added at once, at its price (change it after with the pencil).
  const quick = useMutation({
    mutationFn: (p: { name: string; amountPaise: number }) => api.post<VisitCharges>(`/b/${branch}/visits/${visitId}/charges`, { description: p.name, amountPaise: p.amountPaise }),
    onSuccess: (fresh, p) => {
      refresh(fresh);
      toast.success(`${p.name} added · ${formatRupees(p.amountPaise)}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (k: string) => api.delete<VisitCharges>(`/b/${branch}/visits/${visitId}/charges/${k}`),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data) return null;
  // The branch's own list (Settings > Branch settings > Ready-made charges): every name and price is theirs to edit.
  const choices = data.presets;
  const canChange = canWrite && !data.locked;
  const row = cn('flex items-center justify-between gap-3 px-4', big ? 'min-h-11 py-2' : 'py-2 text-sm');
  const box = big ? 'h-11 text-base' : 'h-9';
  const ready = what.trim().length > 0 && Number(amount) > 0;

  return (
    <div>
      {data.charges.filter((c) => c.description !== ROUND_OFF_LINE).map((c) => (
        editing?.key === c.key ? (
          <form
            key={c.key}
            className="flex flex-wrap items-center gap-2 bg-subtle/40 px-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing.description.trim() && !change.isPending) change.mutate(editing);
            }}
          >
            <Input autoFocus aria-label="Charge name" maxLength={60} className={cn(box, 'min-w-40 flex-1')} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <span className="text-muted">₹</span>
            <Input aria-label="Charge amount" inputMode="decimal" className={cn(box, 'w-24 text-right')} value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
            <Button type="submit" size="sm" disabled={!editing.description.trim() || change.isPending}>
              {change.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </form>
        ) : (
        <div key={c.key} className={row}>
          <div className="min-w-0 font-medium">{c.description}</div>
          <div className="flex items-center gap-1.5">
            {/* Extra charges stand out: they are the ones that get forgotten. */}
            <span className="rounded-md bg-warning-soft px-2 py-0.5 font-semibold text-warning tabular-nums">{formatRupees(c.amountPaise)}</span>
            {canChange && (
              <Button variant="ghost" size="icon-sm" aria-label={`Change ${c.description}`} onClick={() => setEditing({ key: c.key, description: c.description, amount: String(c.amountPaise / 100) })}>
                <Pencil />
              </Button>
            )}
            {canChange && (
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${c.description}`} disabled={remove.isPending} onClick={() => setRemoving(c)}>
                <X />
              </Button>
            )}
          </div>
        </div>
        )
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
            {choices.length > 0 && (
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
            <div className="flex items-center justify-end gap-2">
              {canSettings && (
                <Link to={`/${branch}/settings?tab=print#ready-made-charges`} className="mr-auto text-xs font-medium text-brand hover:underline" title="Settings > Branch settings > Ready-made charges">
                  Edit this list of charges
                </Link>
              )}
              <Button type="button" variant="ghost" size={big ? 'md' : 'sm'} onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size={big ? 'md' : 'sm'} disabled={!ready || add.isPending}>
                <Plus /> {add.isPending ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2">
            {choices.length > 0 && (
              <NativeSelect
                aria-label="Add a ready-made charge"
                className={cn(box, 'min-w-52 flex-1 sm:max-w-xs')}
                value=""
                disabled={quick.isPending || data.charges.length >= 20}
                onChange={(e) => {
                  const p = choices[Number(e.target.value)];
                  if (p) quick.mutate(p);
                }}
              >
                <option value="">{quick.isPending ? 'Adding…' : '+ Add a charge from the list…'}</option>
                {choices.map((p, i) => (
                  <option key={i} value={i}>
                    {p.name} — {formatRupees(p.amountPaise)}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button variant="outline" size={big ? 'md' : 'sm'} className={big ? 'h-11 text-base' : undefined} disabled={data.charges.length >= 20} onClick={() => setAdding(true)}>
              <Plus /> {choices.length > 0 ? 'Other charge' : 'Add charge'}
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

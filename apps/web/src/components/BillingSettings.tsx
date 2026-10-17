import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from 'lucide-react';
import { formatRupees, toPaise, type ChargePreset, type FeeSlot } from '@platform/shared';
import { Button, Card, CardHeader, cn, Field, Input, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';

/** Names most clinics charge for; the owner fills in the prices. */
const USUAL = ['IM INJ', 'IVF', 'SV Set Inj', 'Dressing', 'Sutures', 'Venflon', 'Procedure (I & D)', 'Procedure (D & C)', 'USG', 'ECG'];

/** Per-branch default consultation fee (front desk can still change it on a bill). */
export function BillingSettings({ branch, part }: { branch: string; /** One card only, so the page can lay them out; not given = all three. */ part?: 'fee' | 'counts' | 'charges' }) {
  const show = (p: 'fee' | 'counts' | 'charges') => !part || part === p;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['billing-settings', branch], queryFn: () => api.get<{ consultationFeePaise: number; feeSlots?: FeeSlot[]; chargePresets?: ChargePreset[]; navCounts?: boolean }>(`/b/${branch}/billing/settings`) });
  // The ready-made charges as typed (amount in rupees).
  const [presets, setPresets] = useState<{ name: string; amount: string }[]>([]);
  const [savingPresets, setSavingPresets] = useState(false);
  useEffect(() => {
    if (data) setPresets((data.chargePresets ?? []).map((p) => ({ name: p.name, amount: String(p.amountPaise / 100) })));
  }, [data]);
  // Drag a row by its handle and drop it on another row (the arrows do the same, also on touch screens).
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dropAt = (to: number) => {
    if (dragFrom == null || dragFrom === to) return;
    setPresets((ps) => {
      const next = [...ps];
      const [moved] = next.splice(dragFrom, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  };
  const movePreset = (i: number, by: -1 | 1) =>
    setPresets((ps) => {
      const next = [...ps];
      [next[i], next[i + by]] = [next[i + by]!, next[i]!];
      return next;
    });
  const presetsChanged = !!data && JSON.stringify(presets.map((p) => [p.name.trim(), Number(p.amount) || 0])) !== JSON.stringify((data.chargePresets ?? []).map((p) => [p.name, p.amountPaise / 100]));
  const setPreset = (i: number, patch: Partial<{ name: string; amount: string }>) => setPresets((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);
  // Fees by time of day, as typed (fee in rupees).
  const [slots, setSlots] = useState<{ from: string; to: string; fee: string }[]>([]);
  useEffect(() => {
    if (data) {
      setFee(String(data.consultationFeePaise / 100));
      setSlots((data.feeSlots ?? []).map((x) => ({ from: x.from, to: x.to, fee: String(x.feePaise / 100) })));
    }
  }, [data]);
  const slotsToSave = slots.filter((x) => x.from && x.to).map((x) => ({ from: x.from, to: x.to, feePaise: toPaise(Number(x.fee) || 0) }));
  const feesChanged = !!data && (toPaise(Number(fee) || 0) !== data.consultationFeePaise || JSON.stringify(slotsToSave) !== JSON.stringify(data.feeSlots ?? []));
  const setSlot = (i: number, patch: Partial<{ from: string; to: string; fee: string }>) => setSlots((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <>
    {show('fee') && (
    <Card className="h-full">
      <CardHeader title="Consultation fee" description="Each new OP visit takes the fee of the time it is made (India time). The doctor or the counter can still change it for one visit." />
      <div className="space-y-3 p-4">
        <Field required label="Standard fee (₹), the rest of the day" htmlFor="consult-fee" className="max-w-56">
          <Input id="consult-fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <div>
          <div className="mb-1.5 text-sm font-medium">By time of day</div>
          {slots.length === 0 && <p className="mb-2 text-sm text-muted">None: the standard fee all day. Example: 22:00 to 06:00 = ₹200 at night.</p>}
          {slots.map((x, i) => (
            // Two lines in the narrow card: the hours, then the fee.
            <div key={i} className="mb-2 rounded-lg border border-border p-2.5 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0 text-xs text-muted">
                  From
                  <Input type="time" aria-label={`Time slot ${i + 1}: from`} className="mt-0.5 min-w-0 px-2" value={x.from} onChange={(e) => setSlot(i, { from: e.target.value })} />
                </label>
                <label className="min-w-0 text-xs text-muted">
                  To
                  <Input type="time" aria-label={`Time slot ${i + 1}: to`} className="mt-0.5 min-w-0 px-2" value={x.to} onChange={(e) => setSlot(i, { to: e.target.value })} />
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted">Fee ₹</span>
                <Input aria-label={`Time slot ${i + 1}: fee`} inputMode="decimal" className="w-24 text-right" value={x.fee} onChange={(e) => setSlot(i, { fee: e.target.value })} />
                <Button variant="ghost" size="sm" className="ml-auto" aria-label={`Remove time slot ${i + 1}`} onClick={() => setSlots((xs) => xs.filter((_, j) => j !== i))}>
                  <X /> Remove
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" disabled={slots.length >= 6} onClick={() => setSlots((xs) => [...xs, { from: '22:00', to: '06:00', fee: '200' }])}>
            <Plus /> Add a time slot
          </Button>
        </div>
        <Button
          disabled={saving || !data || !feesChanged}
        onClick={async () => {
          setSaving(true);
          try {
            await api.put(`/b/${branch}/billing/settings`, { consultationFeePaise: toPaise(Number(fee) || 0), feeSlots: slotsToSave });
            qc.invalidateQueries({ queryKey: ['billing-settings', branch] });
            toast.success(`Consultation fee saved: ${formatRupees(toPaise(Number(fee) || 0))}${slotsToSave.map((x) => `, ${x.from}–${x.to} ${formatRupees(x.feePaise)}`).join('')}`);
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setSaving(false);
          }
        }}
      >
        Save fees
        </Button>
      </div>
    </Card>
    )}
    {show('counts') && (
    <Card className="h-full">
      <CardHeader title="Waiting numbers" description="The counts next to the pages of the side menu." />
      <label className="flex items-center gap-3 p-4 text-sm">
        <input
          type="checkbox"
          className="size-5 accent-[var(--color-primary)]"
          checked={data?.navCounts ?? true}
          disabled={!data}
          onChange={async (e) => {
            const on = e.target.checked;
            try {
              await api.put(`/b/${branch}/billing/settings`, { consultationFeePaise: data!.consultationFeePaise, navCounts: on });
              qc.invalidateQueries({ queryKey: ['billing-settings', branch] });
              qc.invalidateQueries({ queryKey: ['nav-counts', branch] });
              toast.success(on ? 'Waiting numbers switched on' : 'Waiting numbers switched off', { description: on ? undefined : 'No computer asks for them any more. Other computers stop after their next refresh.' });
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
        />
        <span>
          <span className="font-medium">Show the waiting numbers</span>
          <span className="block text-xs text-muted">Off: no numbers, and nothing is asked in the background.</span>
        </span>
      </label>
    </Card>
    )}
    {show('charges') && (
    <Card id="ready-made-charges" className="h-full scroll-mt-4">
      <CardHeader title={`Ready-made charges (${presets.length})`} description="Every charge the doctor and the counter can pick, with its price. Change a name or a price, drag a row by its handle (or use the arrows) to change the order of the dropdown, remove one, or add your own, then press Save list." />
      <div className="space-y-2 p-4">
        {presets.length === 0 && <p className="text-sm text-muted">No ready-made charges. Add one, or press “Add the usual ones”.</p>}
        {presets.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <span className="w-72 max-w-72 flex-1">Name</span>
            <span className="w-32 text-right">Price (₹)</span>
          </div>
        )}
        {presets.map((p, i) => (
          <div
            key={i}
            draggable
            onDragStart={(e) => {
              setDragFrom(i);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(i);
            }}
            onDragLeave={() => setDragOver((x) => (x === i ? null : x))}
            onDrop={(e) => {
              e.preventDefault();
              dropAt(i);
              setDragFrom(null);
              setDragOver(null);
            }}
            onDragEnd={() => {
              setDragFrom(null);
              setDragOver(null);
            }}
            className={cn('flex items-center gap-2 rounded-md', dragFrom === i && 'opacity-40', dragOver === i && dragFrom !== i && 'ring-2 ring-brand')}
          >
            <span className="cursor-grab text-muted active:cursor-grabbing" title="Drag to change the order" aria-hidden>
              <GripVertical className="size-4" />
            </span>
            <Input aria-label={`Charge ${i + 1}: name`} placeholder="Name (e.g. Dressing)" maxLength={60} className="max-w-72" value={p.name} onChange={(e) => setPreset(i, { name: e.target.value })} />
            <span className="text-muted">₹</span>
            <Input aria-label={`Charge ${i + 1}: amount`} inputMode="decimal" className="w-28 text-right" value={p.amount} onChange={(e) => setPreset(i, { amount: e.target.value })} />
            {/* The order here is the order of the dropdown the doctor and the counter pick from. */}
            <Button variant="ghost" size="icon-sm" aria-label={`Move charge ${i + 1} up`} disabled={i === 0} onClick={() => movePreset(i, -1)}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Move charge ${i + 1} down`} disabled={i === presets.length - 1} onClick={() => movePreset(i, 1)}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove charge ${i + 1}`} onClick={() => setPresets((ps) => ps.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" disabled={presets.length >= 40} onClick={() => setPresets((ps) => [...ps, { name: '', amount: '' }])}>
            <Plus /> Add a charge
          </Button>
          <Button
            variant="outline"
            onClick={() => setPresets((ps) => [...ps, ...USUAL.filter((n) => !ps.some((p) => p.name.trim().toLowerCase() === n.toLowerCase())).map((name) => ({ name, amount: '' }))].slice(0, 40))}
          >
            Add the usual ones
          </Button>
          <Button
            disabled={savingPresets || !data || !presetsChanged}
            onClick={async () => {
              setSavingPresets(true);
              try {
                const chargePresets = presets.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), amountPaise: Math.max(0, toPaise(Number(p.amount) || 0)) }));
                await api.put(`/b/${branch}/billing/settings`, { consultationFeePaise: data!.consultationFeePaise, chargePresets });
                qc.invalidateQueries({ queryKey: ['billing-settings', branch] });
                qc.invalidateQueries({ queryKey: ['visit-charges', branch] });
                toast.success(`${chargePresets.length} ready-made charge${chargePresets.length === 1 ? '' : 's'} saved`);
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setSavingPresets(false);
              }
            }}
          >
            Save list
          </Button>
          {presetsChanged && <span className="self-center text-xs font-medium text-warning">Changes not saved yet</span>}
        </div>
      </div>
    </Card>
    )}
    </>
  );
}

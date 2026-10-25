import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Clock, GripVertical, Moon, Plus, Sun, X } from 'lucide-react';
import { feeSlotAt, formatRupees, MENU_COUNTS, toPaise, type ChargePreset, type FeeSlot } from '@platform/shared';
import { Button, Card, CardHeader, cn, Field, Input, toast } from '@platform/ui';
import { api, errorMessage } from '@/core/api/client';

/** Rows shown before "Show all charges". */
const SHORT_LIST = 6;
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
  // Drag a row by its handle and drop it on another row.
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // A long list shows its first rows; "Show all charges" opens the rest (a new row always shows).
  const [showAll, setShowAll] = useState(false);
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
      <div className="space-y-5 p-4">
        {/* The whole day at a glance: which fee holds at which hour. */}
        <FeeDay standardPaise={toPaise(Number(fee) || 0)} slots={slotsToSave} />

        <div className="flex flex-wrap items-end gap-4">
          <Field required label="Standard fee" htmlFor="consult-fee" hint="Every hour not covered by a time slot below.">
            <div className="flex items-center rounded-lg border border-border bg-surface focus-within:ring-2 focus-within:ring-brand/40">
              <span className="pl-3 text-lg text-muted">₹</span>
              <Input id="consult-fee" inputMode="decimal" className="h-12 w-36 border-0 text-2xl font-semibold tabular-nums shadow-none focus-visible:ring-0" value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
          </Field>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Different fee at some hours</div>
              <div className="text-xs text-muted">A night fee, an early-morning fee… up to 6.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!slots.some((x) => x.from === '22:00' && x.to === '06:00') && (
                <Button variant="outline" size="sm" disabled={slots.length >= 6} onClick={() => setSlots((xs) => [...xs, { from: '22:00', to: '06:00', fee: String(Math.round((Number(fee) || 0) * 1.5) || 200) }])}>
                  <Moon /> Night 10 pm – 6 am
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={slots.length >= 6} onClick={() => setSlots((xs) => [...xs, { from: '06:00', to: '08:00', fee: fee || '0' }])}>
                <Plus /> Other hours
              </Button>
            </div>
          </div>
          {slots.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted">One fee all day. Press “Night 10 pm – 6 am” for a night fee.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {slots.map((x, i) => {
                const night = x.from >= '18:00' || x.from < '05:00';
                return (
                  <li key={i} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                    {night ? <Moon className="size-4 text-brand" /> : <Sun className="size-4 text-warning" />}
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      From
                      <Input type="time" aria-label={`Time slot ${i + 1}: from`} className="h-9 w-28 px-2" value={x.from} onChange={(e) => setSlot(i, { from: e.target.value })} />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      to
                      <Input type="time" aria-label={`Time slot ${i + 1}: to`} className="h-9 w-28 px-2" value={x.to} onChange={(e) => setSlot(i, { to: e.target.value })} />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      Fee ₹
                      <Input aria-label={`Time slot ${i + 1}: fee`} inputMode="decimal" className="h-9 w-24 text-right font-semibold" value={x.fee} onChange={(e) => setSlot(i, { fee: e.target.value })} />
                    </label>
                    {x.from === x.to && <span className="text-xs font-medium text-critical">From and to must differ</span>}
                    <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label={`Remove time slot ${i + 1}`} onClick={() => setSlots((xs) => xs.filter((_, j) => j !== i))}>
                      <X />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button
            disabled={saving || !data || !feesChanged || slots.some((x) => x.from === x.to)}
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
          {feesChanged && <span className="text-xs font-medium text-warning">Changes not saved yet</span>}
        </div>
      </div>
    </Card>
    )}
    {show('counts') && (
    <Card className="h-full">
      <CardHeader title="Menu counts" description="The small number next to a page of the side menu: how many are waiting there." />
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
              toast.success(on ? 'Menu counts switched on' : 'Menu counts switched off', { description: on ? undefined : 'No computer asks for them any more. Other computers stop after their next refresh.' });
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
        />
        <span>
          <span className="font-medium">Show the menu counts</span>
          <span className="block text-xs text-muted">Off: no numbers, and nothing is asked in the background.</span>
        </span>
      </label>
      <dl className="mx-4 mb-4 divide-y divide-border rounded-lg border border-border text-sm">
        {MENU_COUNTS.map((c) => (
          <div key={c.key} className="flex items-baseline justify-between gap-3 px-3 py-2">
            <dt className="font-medium">
              {c.name} <span className="font-normal text-muted">· {c.page}</span>
            </dt>
            <dd className="text-right text-xs text-muted">{c.meaning}</dd>
          </div>
        ))}
      </dl>
    </Card>
    )}
    {show('charges') && (
    <Card id="ready-made-charges" className="h-full scroll-mt-4">
      <CardHeader title={`Ready-made charges (${presets.length})`} description="What the doctor and the counter pick from, with the price. Change a name or a price, drag a row by its handle to change the order, then press Save list." />
      <div className="space-y-2 p-4">
        {presets.length === 0 && <p className="text-sm text-muted">No ready-made charges. Add one, or press “Add the usual ones”.</p>}
        {presets.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <span className="w-72 max-w-72 flex-1">Name</span>
            <span className="w-32 text-right">Price (₹)</span>
          </div>
        )}
        {presets.map((p, i) => (showAll || i < SHORT_LIST || i >= (data?.chargePresets?.length ?? 0)) && (
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
            <Button variant="ghost" size="icon-sm" aria-label={`Remove charge ${i + 1}`} onClick={() => setPresets((ps) => ps.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        ))}
        {presets.length > SHORT_LIST && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll((x) => !x)}>
            {showAll ? <ChevronUp /> : <ChevronDown />} {showAll ? 'Show fewer' : `Show all ${presets.length} charges`}
          </Button>
        )}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button variant="outline" disabled={presets.length >= 40} onClick={() => setPresets((ps) => [...ps, { name: '', amount: '' }])}>
            <Plus /> Add a charge
          </Button>
          {presets.length === 0 && (
          <Button
            variant="outline"
            onClick={() => setPresets((ps) => [...ps, ...USUAL.filter((n) => !ps.some((p) => p.name.trim().toLowerCase() === n.toLowerCase())).map((name) => ({ name, amount: '' }))].slice(0, 40))}
          >
            Add the usual ones
          </Button>
          )}
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

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const clock12 = (h: number) => (h === 0 || h === 24 ? '12 am' : h === 12 ? '12 pm' : h < 12 ? `${h} am` : `${h - 12} pm`);

/** A 24-hour bar: each hour coloured by the fee that holds then, and the fee of right now. */
function FeeDay({ standardPaise, slots }: { standardPaise: number; slots: FeeSlot[] }) {
  const hours = Array.from({ length: 24 }, (_, h) => feeSlotAt(slots, hh(h)));
  const tones = ['bg-brand', 'bg-violet-500', 'bg-warning', 'bg-positive', 'bg-critical', 'bg-sky-500'];
  const toneOf = (x: FeeSlot | null) => (x ? tones[slots.indexOf(x) % tones.length]! : 'bg-subtle');
  const nowH = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }));
  const now = hours[nowH] ?? null;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Clock className="size-4 text-muted" /> Right now: {formatRupees(now ? now.feePaise : standardPaise)}
        </span>
        <span className="text-xs text-muted">{now ? `${now.from}–${now.to} slot` : 'standard fee'}</span>
      </div>
      <div className="flex h-7 overflow-hidden rounded-md" role="img" aria-label="Fee through the day">
        {hours.map((x, h) => (
          <div key={h} title={`${clock12(h)}–${clock12(h + 1)}: ${formatRupees(x ? x.feePaise : standardPaise)}`} className={cn('relative flex-1 border-r border-surface/60 last:border-r-0', toneOf(x), h === nowH && 'ring-2 ring-ink ring-inset')} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h}>{clock12(h)}</span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-subtle ring-1 ring-border" /> Standard {formatRupees(standardPaise)}
        </span>
        {slots.map((x, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className={cn('size-3 rounded-sm', toneOf(x))} /> {x.from}–{x.to} {formatRupees(x.feePaise)}
          </span>
        ))}
      </div>
    </div>
  );
}

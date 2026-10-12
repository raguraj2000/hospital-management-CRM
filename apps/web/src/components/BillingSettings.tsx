import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { formatRupees, toPaise, type ChargePreset } from '@platform/shared';
import { Button, Card, CardHeader, Field, Input, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';

/** Names most clinics charge for; the owner fills in the prices. */
const USUAL = ['IM INJ', 'IVF', 'SV Set Inj', 'Dressing', 'Sutures', 'Venflon', 'Procedure (I & D)', 'Procedure (D & C)', 'USG', 'ECG'];

/** Per-branch default consultation fee (front desk can still change it on a bill). */
export function BillingSettings({ branch }: { branch: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['billing-settings', branch], queryFn: () => api.get<{ consultationFeePaise: number; chargePresets?: ChargePreset[] }>(`/b/${branch}/billing/settings`) });
  // The ready-made charges as typed (amount in rupees).
  const [presets, setPresets] = useState<{ name: string; amount: string }[]>([]);
  const [savingPresets, setSavingPresets] = useState(false);
  useEffect(() => {
    if (data) setPresets((data.chargePresets ?? []).map((p) => ({ name: p.name, amount: String(p.amountPaise / 100) })));
  }, [data]);
  const setPreset = (i: number, patch: Partial<{ name: string; amount: string }>) => setPresets((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setFee(String(data.consultationFeePaise / 100));
  }, [data]);
  return (
    <>
    <Card className="mb-4">
      <CardHeader title="Consultation fee" description="Put on every new OP bill. Can be changed on a bill." />
      {/* Input and button share one row; the button lines up with the input, not with a hint under it. */}
      <div className="flex items-end gap-3 p-4">
        <Field required label="Fee (₹)" htmlFor="consult-fee" className="w-40">
          <Input id="consult-fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <Button
          disabled={saving || !data || toPaise(Number(fee) || 0) === data.consultationFeePaise}
        onClick={async () => {
          setSaving(true);
          try {
            await api.put(`/b/${branch}/billing/settings`, { consultationFeePaise: toPaise(Number(fee) || 0) });
            qc.invalidateQueries({ queryKey: ['billing-settings', branch] });
            toast.success(`Consultation fee set to ${formatRupees(toPaise(Number(fee) || 0))}`);
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setSaving(false);
          }
        }}
      >
        Save fee
        </Button>
      </div>
    </Card>
    <Card className="mb-4">
      <CardHeader title="Ready-made charges" description="The usual ones (IM INJ, IVF, Dressing, ECG…) are always in the dropdown at ₹100. Set a price here to change it, or add your own." />
      <div className="space-y-2 p-4">
        {presets.length === 0 && <p className="text-sm text-muted">No ready-made charges yet.</p>}
        {presets.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input aria-label={`Charge ${i + 1}: name`} placeholder="Name (e.g. Dressing)" maxLength={60} className="max-w-72" value={p.name} onChange={(e) => setPreset(i, { name: e.target.value })} />
            <span className="text-muted">₹</span>
            <Input aria-label={`Charge ${i + 1}: amount`} inputMode="decimal" className="w-28 text-right" value={p.amount} onChange={(e) => setPreset(i, { amount: e.target.value })} />
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
            disabled={savingPresets || !data}
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
        </div>
      </div>
    </Card>
    </>
  );
}

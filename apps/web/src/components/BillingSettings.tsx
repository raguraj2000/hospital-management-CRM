import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatRupees, toPaise } from '@platform/shared';
import { Button, Card, CardHeader, Field, Input, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';

/** Per-branch default consultation fee (front desk can still change it on a bill). */
export function BillingSettings({ branch }: { branch: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['billing-settings', branch], queryFn: () => api.get<{ consultationFeePaise: number }>(`/b/${branch}/billing/settings`) });
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setFee(String(data.consultationFeePaise / 100));
  }, [data]);
  return (
    <Card className="mb-4">
      <CardHeader title="Consultation fee" description="Put on every new OP bill. Can be changed on a bill." />
      {/* Input and button share one row; the button lines up with the input, not with a hint under it. */}
      <div className="flex items-end gap-3 p-4">
        <Field label="Fee (₹)" htmlFor="consult-fee" className="w-40">
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
  );
}

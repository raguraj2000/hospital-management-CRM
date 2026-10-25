// The extra charges of a bill (dressing, injection, ...) as editable rows with an "Add charge" button.
// Used by the bill page and by the counter's checkout.
import { Plus, X } from 'lucide-react';
import { toPaise, type BillCharge } from '@platform/shared';
import { Button, cn, Input } from '@platform/ui';

/** One row as typed: the amount is in rupees. */
export interface ChargeRow {
  description: string;
  amount: string;
}

export const chargeRowsOf = (charges: BillCharge[]): ChargeRow[] => charges.map((c) => ({ description: c.description, amount: String(c.amountPaise / 100) }));

/** What is saved: rows with nothing typed are dropped; an amount without a name is called "Other charges". */
export const chargesOf = (rows: ChargeRow[]): BillCharge[] =>
  rows
    .map((r) => ({ description: r.description.trim(), amountPaise: Math.max(0, toPaise(Number(r.amount) || 0)) }))
    .filter((c) => c.description || c.amountPaise > 0)
    .map((c) => ({ ...c, description: c.description || 'Other charges' }));

/** `big`: the taller boxes of the counter's checkout. */
export function ChargeRowsEditor({ rows, onChange, big }: { rows: ChargeRow[]; onChange: (rows: ChargeRow[]) => void; big?: boolean }) {
  const set = (i: number, patch: Partial<ChargeRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const box = big ? 'h-11 text-base' : 'h-8';
  return (
    <>
      {rows.map((r, i) => (
        <div key={i} className={cn('flex items-center justify-between gap-3 px-4', big ? 'min-h-11 py-2' : 'py-2.5 text-sm')}>
          <Input aria-label={`Charge ${i + 1}: what for`} placeholder="What for (e.g. Dressing)" className={cn(box, 'max-w-64')} value={r.description} maxLength={60} onChange={(e) => set(i, { description: e.target.value })} />
          <div className="flex items-center gap-1">
            <span className="text-muted">₹</span>
            <Input aria-label={`Charge ${i + 1}: amount`} inputMode="decimal" className={cn(box, 'w-28 text-right')} value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} />
            <Button variant="ghost" size={big ? 'icon' : 'icon-sm'} aria-label={`Remove charge ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        </div>
      ))}
      <div className="px-4 py-2">
        <Button variant="outline" size={big ? 'md' : 'sm'} className={big ? 'h-11 text-base' : undefined} disabled={rows.length >= 20} onClick={() => onChange([...rows, { description: '', amount: '' }])}>
          <Plus /> Add charge
        </Button>
      </div>
    </>
  );
}

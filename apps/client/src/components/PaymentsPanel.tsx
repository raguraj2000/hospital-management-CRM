import { useEffect, useState, type FormEvent } from 'react';
import { mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { formatRupees, rupeesToCents, centsToRupees } from '../lib/money.js';
import { formatDateTime } from '../lib/datetime.js';
import { ErrorMessage } from './ErrorMessage.js';
import { PaymentBadge, type PaymentStatus } from './PaymentBadge.js';

export interface BillStatus {
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: PaymentStatus;
  paidBeforeTracking: boolean;
}

export interface PaymentRow {
  id: number;
  amount_cents: number;
  mode: 'cash' | 'upi' | 'card' | 'other';
  received_at: string;
  received_by_name: string | null;
  cancelled_at: string | null;
  cancelled_by_name: string | null;
  cancel_reason: string | null;
}

const MODES: { value: PaymentRow['mode']; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

function CancelPayment({ payment, onDone }: { payment: PaymentRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <button className="btn-text" onClick={() => setOpen(true)}>
        Cancel
      </button>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input className="input" style={{ width: 200 }} placeholder="Why? (required)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      <button
        className="btn"
        disabled={reason.trim().length < 3}
        onClick={async () => {
          try {
            await mutate(`/invoices/payments/${payment.id}/cancel`, 'POST', { reason: reason.trim() });
            onDone();
          } catch (err) {
            setError(describeError(err, 'cancel this payment'));
          }
        }}
      >
        Cancel payment
      </button>
      <button className="btn-text" onClick={() => setOpen(false)}>
        Keep
      </button>
      <ErrorMessage error={error} style={{ width: '100%', margin: 0 }} />
    </span>
  );
}

/**
 * Take payments on a saved bill (in parts or in full) and see what's been paid. Screen only.
 * `bill` follows what's on screen; `beforeReceive` (when the bill has unsaved
 * changes) saves them first, so the payment is taken on the full new total.
 */
export function PaymentsPanel({
  invoiceId,
  bill,
  payments,
  onChanged,
  beforeReceive,
}: {
  invoiceId: number;
  bill: BillStatus;
  payments: PaymentRow[];
  onChanged: () => void;
  beforeReceive?: () => Promise<void>;
}) {
  const canReceive = useHasPermission('payment.receive');
  const [amount, setAmount] = useState(centsToRupees(bill.balanceCents));
  // A fee changed on the bill: the amount to take follows the new balance.
  useEffect(() => setAmount(centsToRupees(bill.balanceCents)), [bill.balanceCents]);
  const [mode, setMode] = useState<PaymentRow['mode']>('cash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function receive(e: FormEvent) {
    e.preventDefault();
    const cents = rupeesToCents(amount);
    if (cents <= 0) return setError('Enter the amount received.');
    setSaving(true);
    setError(null);
    try {
      if (beforeReceive) await beforeReceive();
      const res = await mutate<{ bill: BillStatus }>(`/invoices/${invoiceId}/payments`, 'POST', { amountCents: cents, mode });
      setAmount(centsToRupees(res.bill.balanceCents));
      onChanged();
    } catch (err) {
      setError(describeError(err, 'record this payment'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card no-print" style={{ marginBottom: 16, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Payment</h2>
        <PaymentBadge status={bill.status} />
        <span style={{ fontSize: 14 }}>
          Total <strong>{formatRupees(bill.totalCents)}</strong> · Paid <strong>{formatRupees(bill.paidCents)}</strong> · Balance{' '}
          <strong>{formatRupees(bill.balanceCents)}</strong>
        </span>
      </div>
      {bill.paidBeforeTracking && (
        <p style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>This bill was made before payments were tracked, so it counts as paid.</p>
      )}

      {canReceive && bill.balanceCents > 0 && (
        <form onSubmit={receive} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <span>Received ₹</span>
          <input className="input" style={{ width: 110 }} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span style={{ display: 'inline-flex', gap: 4 }}>
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={mode === m.value ? 'btn btn-primary' : 'btn'}
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </span>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Record payment'}
          </button>
          {beforeReceive && (
            <span style={{ fontSize: 13, color: 'var(--color-warning)' }}>The bill's changes will be saved first.</span>
          )}
        </form>
      )}
      <ErrorMessage error={error} />

      {payments.length > 0 && (
        <table className="data-table" style={{ marginTop: 12, fontSize: 13 }}>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={p.cancelled_at ? { opacity: 0.6 } : undefined}>
                <td>{formatDateTime(p.received_at)}</td>
                <td className="num" style={p.cancelled_at ? { textDecoration: 'line-through' } : undefined}>
                  {formatRupees(p.amount_cents)}
                </td>
                <td style={{ textTransform: 'uppercase' }}>{p.mode}</td>
                <td>{p.received_by_name ?? '—'}</td>
                <td>
                  {p.cancelled_at ? (
                    <span style={{ color: 'var(--color-critical)' }}>
                      Cancelled by {p.cancelled_by_name ?? '—'}: {p.cancel_reason}
                    </span>
                  ) : (
                    canReceive && <CancelPayment payment={p} onDone={onChanged} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

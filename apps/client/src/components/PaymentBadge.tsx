import { formatRupees } from '../lib/money.js';

export type PaymentStatus = 'paid' | 'part_paid' | 'not_paid';

/** Paid / Part paid (₹ balance) / Not paid, the same everywhere a bill appears. */
export function PaymentBadge({ status, balanceCents }: { status: PaymentStatus; balanceCents?: number }) {
  if (status === 'paid') return <span className="badge badge-positive">Paid</span>;
  if (status === 'part_paid') {
    return (
      <span className="badge badge-warning">
        Part paid{balanceCents !== undefined ? ` · ${formatRupees(balanceCents)} due` : ''}
      </span>
    );
  }
  return <span className="badge badge-critical">Not paid</span>;
}

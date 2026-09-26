import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { formatRupees, rupeesToCents, centsToRupees } from '../lib/money.js';
import { formatDateTime } from '../lib/datetime.js';
import { VendorBillBadge, type PurchaseBillRow } from './Vendors.js';

interface BillDetail {
  bill: {
    id: number;
    vendor_name: string;
    vendor_phone: string | null;
    vendor_bill_number: string | null;
    bill_date: string;
    due_date: string | null;
    notes: string | null;
    created_by_name: string | null;
    created_at: string;
    cancelled_at: string | null;
    cancelled_by_name: string | null;
    cancel_reason: string | null;
  };
  lines: {
    id: number;
    medicine_name: string;
    base_unit: string;
    lot_number: string;
    expiry_date: string;
    quantity: number;
    quantity_remaining: number;
    unit_cost_cents: number;
    line_total_cents: number;
  }[];
  payments: {
    id: number;
    amount_cents: number;
    mode: string;
    reference: string | null;
    paid_at: string;
    paid_by_name: string | null;
    cancelled_at: string | null;
    cancelled_by_name: string | null;
    cancel_reason: string | null;
  }[];
  status: Pick<PurchaseBillRow, 'totalCents' | 'paidCents' | 'balanceCents' | 'status' | 'overdue'>;
}

const MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

function ReasonAction({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <button className="btn-text" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input className="input" style={{ width: 220 }} placeholder="Why? (required)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      <button
        className="btn"
        disabled={reason.trim().length < 3}
        onClick={() => onConfirm(reason.trim()).catch((err) => setError(describeError(err, 'do this')))}
      >
        {confirmLabel}
      </button>
      <button className="btn-text" onClick={() => setOpen(false)}>
        Keep
      </button>
      <ErrorMessage error={error} style={{ width: '100%', margin: 0 }} />
    </span>
  );
}

/** One vendor's bill: what came in, what we paid, what we still owe. */
export function PurchaseBill() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const canManage = useHasPermission('supplier.manage');
  const [data, setData] = useState<BillDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    get<BillDetail>(`/vendors/purchases/${billId}`)
      .then((d) => {
        setData(d);
        setAmount(centsToRupees(d.status.balanceCents));
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load this purchase bill')));
  }
  useEffect(load, [billId]);

  async function pay(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await mutate(`/vendors/purchases/${billId}/payments`, 'POST', {
        amountCents: rupeesToCents(amount),
        mode,
        reference: reference.trim() || null,
      });
      setReference('');
      load();
    } catch (err) {
      setError(describeError(err, 'record this payment'));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return error ? <ErrorMessage error={error} /> : <p>Loading…</p>;
  const { bill, lines, payments, status } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            {bill.vendor_name} — bill {bill.vendor_bill_number ?? `#${bill.id}`}
          </h1>
          <p>
            Bill date {formatDateTime(bill.bill_date)} · pay by {formatDateTime(bill.due_date)} · entered by {bill.created_by_name ?? '—'}
          </p>
        </div>
        <button className="btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {bill.cancelled_at && (
        <div className="alert alert-critical">
          Cancelled {formatDateTime(bill.cancelled_at)} by {bill.cancelled_by_name ?? '—'}: {bill.cancel_reason}. Its stock was removed.
        </div>
      )}

      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Payment</h2>
          <VendorBillBadge status={status.status} overdue={status.overdue} />
          <span>
            Total <strong>{formatRupees(status.totalCents)}</strong> · Paid <strong>{formatRupees(status.paidCents)}</strong> · Balance{' '}
            <strong>{formatRupees(status.balanceCents)}</strong>
          </span>
        </div>
        {canManage && status.balanceCents > 0 && (
          <form onSubmit={pay} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            <span>Paid ₹</span>
            <input className="input" style={{ width: 110 }} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              style={{ width: 180 }}
              placeholder="Cheque / UTR no. (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Record payment'}
            </button>
          </form>
        )}
        <ErrorMessage error={error} />
        {payments.length > 0 && (
          <table className="data-table" style={{ marginTop: 12, fontSize: 13 }}>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={p.cancelled_at ? { opacity: 0.6 } : undefined}>
                  <td>{formatDateTime(p.paid_at)}</td>
                  <td className="num" style={p.cancelled_at ? { textDecoration: 'line-through' } : undefined}>
                    {formatRupees(p.amount_cents)}
                  </td>
                  <td style={{ textTransform: 'uppercase' }}>{p.mode}</td>
                  <td>{p.reference ?? ''}</td>
                  <td>{p.paid_by_name ?? '—'}</td>
                  <td>
                    {p.cancelled_at ? (
                      <span style={{ color: 'var(--color-critical)' }}>
                        Cancelled by {p.cancelled_by_name ?? '—'}: {p.cancel_reason}
                      </span>
                    ) : (
                      canManage && (
                        <ReasonAction
                          label="Cancel"
                          confirmLabel="Cancel payment"
                          onConfirm={async (reason) => {
                            await mutate(`/vendors/purchases/payments/${p.id}/cancel`, 'POST', { reason });
                            load();
                          }}
                        />
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Medicines received</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Still in stock</th>
              <th style={{ textAlign: 'right' }}>Cost each</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{l.medicine_name}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{l.lot_number}</td>
                <td>{formatDateTime(l.expiry_date)}</td>
                <td className="num">
                  {l.quantity} {l.base_unit}
                </td>
                <td className="num">{bill.cancelled_at ? '—' : l.quantity_remaining}</td>
                <td className="num">{formatRupees(l.unit_cost_cents)}</td>
                <td className="num">{formatRupees(l.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bill.notes && <p style={{ marginBottom: 0 }}>Note: {bill.notes}</p>}
      </section>

      {canManage && !bill.cancelled_at && (
        <p style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
          Entered by mistake?{' '}
          <ReasonAction
            label="Cancel this bill"
            confirmLabel="Cancel bill and remove its stock"
            onConfirm={async (reason) => {
              await mutate(`/vendors/purchases/${billId}/cancel`, 'POST', { reason });
              load();
            }}
          />{' '}
          (only while none of its stock was used and nothing is paid)
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ConfirmDelete } from '../components/ConfirmDelete.js';
import { formatRupees } from '../lib/money.js';
import { ErrorMessage } from '../components/ErrorMessage.js';

interface SaleData {
  sale: {
    id: number;
    receipt_number: string;
    sold_at: string;
    customer_name: string | null;
    customer_phone: string | null;
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    payment_mode: string;
    amount_received_cents: number | null;
    sold_by_name: string | null;
    voided_at: string | null;
    void_reason: string | null;
  };
  lines: { medicine_id: number; medicine_name: string; unit_price_cents: number; quantity: number; line_total_cents: number; expiry_date: string | null }[];
  clinic: { name: string; addressLine: string; doctorName: string; doctorTitle: string; phone: string };
}

/**
 * A pharmacy counter receipt. Laid out for an 80 mm thermal printer (the
 * usual POS roll) and still fine on A4. Opened with ?print=1 straight after
 * a sale, it prints itself.
 */
export function SaleReceipt() {
  const { saleId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const canVoid = useHasPermission('dispense.void');
  const [data, setData] = useState<SaleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    get<SaleData>(`/pharmacy/sales/${saleId}`)
      .then(setData)
      .catch((err) => setError(describeError(err, 'open this receipt')));
  }
  useEffect(load, [saleId]);

  useEffect(() => {
    if (data && searchParams.get('print') === '1') {
      setSearchParams({}, { replace: true }); // print once, not again on refresh
      setTimeout(() => window.print(), 150);
    }
  }, [data, searchParams, setSearchParams]);

  if (error) return <ErrorMessage error={error} />;
  if (!data) return <p>Loading…</p>;
  const { sale, lines, clinic } = data;
  const change = sale.amount_received_cents != null ? sale.amount_received_cents - sale.total_cents : null;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1>Receipt {sale.receipt_number}</h1>
          <p>
            <Link to="/pharmacy?tab=history">← Sales history</Link>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/pharmacy?tab=sale" className="btn">
            New sale
          </Link>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Print
          </button>
          {canVoid && !sale.voided_at && (
            <ConfirmDelete
              what="sale (the stock goes back on the shelf)"
              triggerLabel="Cancel sale"
              triggerClassName="btn"
              align="right"
              onDelete={() => mutate(`/pharmacy/sales/${sale.id}/void`, 'POST', { reason: 'Cancelled at counter' }).then(() => undefined)}
              onDeleted={load}
            />
          )}
        </div>
      </div>

      {sale.voided_at && (
        <div className="alert alert-critical">
          This sale was cancelled on {sale.voided_at}
          {sale.void_reason ? ` (${sale.void_reason})` : ''}. The stock was returned.
        </div>
      )}

      <div className="receipt-sheet card">
        <div className="receipt-center">
          <div className="receipt-title">{clinic.name}</div>
          <div>{clinic.addressLine}</div>
          <div>
            {clinic.doctorName}
            {clinic.doctorTitle ? `, ${clinic.doctorTitle}` : ''}
          </div>
          <div>Ph: {clinic.phone}</div>
          <div className="receipt-rule" />
          <div style={{ fontWeight: 700 }}>PHARMACY BILL{sale.voided_at ? ' — CANCELLED' : ''}</div>
        </div>
        <div className="receipt-row">
          <span>{sale.receipt_number}</span>
          <span>{sale.sold_at}</span>
        </div>
        {(sale.customer_name || sale.customer_phone) && (
          <div>
            {sale.customer_name}
            {sale.customer_phone ? ` · ${sale.customer_phone}` : ''}
          </div>
        )}
        <div className="receipt-rule" />
        {lines.map((l) => (
          <div key={l.medicine_id + ':' + l.unit_price_cents} style={{ marginBottom: 4 }}>
            <div>{l.medicine_name}</div>
            <div className="receipt-row">
              <span>
                {l.quantity} × {formatRupees(l.unit_price_cents)}
                {l.expiry_date ? <span className="receipt-small"> · exp {l.expiry_date}</span> : null}
              </span>
              <span>{formatRupees(l.line_total_cents)}</span>
            </div>
          </div>
        ))}
        <div className="receipt-rule" />
        <div className="receipt-row">
          <span>Subtotal</span>
          <span>{formatRupees(sale.subtotal_cents)}</span>
        </div>
        {sale.discount_cents > 0 && (
          <div className="receipt-row">
            <span>Discount</span>
            <span>− {formatRupees(sale.discount_cents)}</span>
          </div>
        )}
        <div className="receipt-row receipt-total">
          <span>TOTAL</span>
          <span>{formatRupees(sale.total_cents)}</span>
        </div>
        <div className="receipt-row">
          <span>Paid by</span>
          <span style={{ textTransform: 'uppercase' }}>{sale.payment_mode}</span>
        </div>
        {sale.amount_received_cents != null && (
          <>
            <div className="receipt-row">
              <span>Received</span>
              <span>{formatRupees(sale.amount_received_cents)}</span>
            </div>
            {change != null && change > 0 && (
              <div className="receipt-row">
                <span>Change</span>
                <span>{formatRupees(change)}</span>
              </div>
            )}
          </>
        )}
        <div className="receipt-rule" />
        <div className="receipt-center receipt-small">
          {sale.sold_by_name ? `Served by ${sale.sold_by_name}. ` : ''}Thank you! Get well soon.
        </div>
      </div>
      <p className="no-print" style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
        <button className="btn-text" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </p>
    </div>
  );
}

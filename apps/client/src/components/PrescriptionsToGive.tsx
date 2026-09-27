import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { formatRupees } from '../lib/money.js';
import { formatDateTime } from '../lib/datetime.js';
import { formatIndianPhone } from '../lib/phone.js';
import { ErrorMessage } from './ErrorMessage.js';
import { TakePaymentButton } from './TakePaymentButton.js';

interface Cover {
  billed: boolean;
  paid: boolean;
  balanceCents: number;
  invoiceIds: number[];
}

interface WaitingVisit {
  id: number;
  visit_date: string;
  patient_id: number;
  current_name: string;
  customer_code: string;
  phone_number: string | null;
  doctor_name: string | null;
  lines: {
    id: number;
    medicine_name: string;
    quantity_prescribed: number;
    dosage_instructions: string | null;
    duration_days: number | null;
    in_stock: number;
  }[];
  cover: Cover;
}

function PayState({ visit }: { visit: WaitingVisit }) {
  const { cover } = visit;
  if (cover.paid) return <span className="badge badge-positive">Paid</span>;
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span className="badge badge-critical">{cover.billed ? `Not paid · ${formatRupees(cover.balanceCents)} due` : 'Not paid'}</span>
      <TakePaymentButton patientId={visit.patient_id} />
    </span>
  );
}

function GiveButtons({ visit, onGiven }: { visit: WaitingVisit; onGiven: () => void }) {
  const canOverride = useHasPermission('payment.override');
  const [overriding, setOverriding] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const short = visit.lines.filter((l) => l.in_stock < l.quantity_prescribed);

  async function give(overrideReason?: string) {
    setBusy(true);
    setError(null);
    try {
      await mutate(`/pharmacy/visits/${visit.id}/give`, 'POST', overrideReason ? { overrideReason } : {});
      onGiven();
    } catch (err) {
      setError(describeError(err, 'give these medicines'));
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      {short.length > 0 && (
        <p className="error-message" style={{ marginTop: 0 }}>
          Not enough stock: {short.map((l) => `${l.medicine_name} (${l.in_stock} left)`).join(', ')}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => give()} disabled={busy || !visit.cover.paid || short.length > 0}>
          {busy ? 'Giving…' : 'Give medicines'}
        </button>
        {!visit.cover.paid && canOverride && !overriding && (
          <button className="btn-text" onClick={() => setOverriding(true)}>
            Emergency: give before payment
          </button>
        )}
        {overriding && (
          <>
            <input
              className="input"
              style={{ minWidth: 260 }}
              placeholder="Why give before payment? (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            <button className="btn" disabled={busy || reason.trim().length < 3 || short.length > 0} onClick={() => give(reason.trim())}>
              Give without payment
            </button>
            <button className="btn-text" onClick={() => setOverriding(false)}>
              Cancel
            </button>
          </>
        )}
      </div>
      <ErrorMessage error={error} />
    </div>
  );
}

/** Pharmacy tab: doctors' prescriptions waiting to be given (after the bill is paid). */
export function PrescriptionsToGive() {
  const [visits, setVisits] = useState<WaitingVisit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    get<{ visits: WaitingVisit[] }>('/pharmacy/prescriptions')
      .then((d) => {
        setVisits(d.visits);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load prescriptions')));
  }
  useEffect(load, []);

  if (error) return <ErrorMessage error={error} />;
  if (!visits) return <p>Loading…</p>;
  if (visits.length === 0) return <p style={{ color: 'var(--color-ink-soft)' }}>No prescriptions waiting.</p>;

  return (
    <div>
      <button className="btn" onClick={load} style={{ marginBottom: 12 }}>
        Refresh
      </button>
      {visits.map((v) => (
        <section key={v.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link to={`/patients/${v.patient_id}`}>
              <strong>{v.current_name}</strong>
            </Link>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>{v.customer_code}</span>
            <span style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>
              {formatIndianPhone(v.phone_number)} · {formatDateTime(v.visit_date)}
              {v.doctor_name ? ` · ${v.doctor_name}` : ''}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              <PayState visit={v} />
            </span>
          </div>
          <table className="data-table" style={{ marginTop: 8, fontSize: 13 }}>
            <thead>
              <tr>
                <th>Medicine</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Dosage</th>
                <th style={{ textAlign: 'right' }}>In stock</th>
              </tr>
            </thead>
            <tbody>
              {v.lines.map((l) => (
                <tr key={l.id} className={l.in_stock < l.quantity_prescribed ? 'row-critical' : undefined}>
                  <td>{l.medicine_name}</td>
                  <td className="num">{l.quantity_prescribed}</td>
                  <td>
                    {l.dosage_instructions ?? '—'}
                    {l.duration_days ? ` · ${l.duration_days}d` : ''}
                  </td>
                  <td className="num">{l.in_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <GiveButtons visit={v} onGiven={load} />
        </section>
      ))}
    </div>
  );
}

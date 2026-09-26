import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, describeError } from '../api/client.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { TakePaymentButton } from '../components/TakePaymentButton.js';
import { formatRupees } from '../lib/money.js';
import { formatIndianPhone } from '../lib/phone.js';
import { formatDateTime } from '../lib/datetime.js';

interface PendingPatient {
  id: number;
  customer_code: string;
  current_name: string;
  phone_number: string | null;
  unbilledCount: number;
  unbilledCents: number;
  unpaidBills: number;
  unpaidCents: number;
  totalDueCents: number;
  since: string | null;
}

/** Front desk: every patient with money still to collect, oldest first. */
export function Billing() {
  const [patients, setPatients] = useState<PendingPatient[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    get<{ patients: PendingPatient[] }>('/billing/pending')
      .then((d) => {
        setPatients(d.patients);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load payments due')));
  }
  useEffect(load, []);

  const q = query.trim().toLowerCase();
  const shown = (patients ?? []).filter(
    (p) => !q || p.current_name.toLowerCase().includes(q) || p.customer_code.toLowerCase().includes(q) || (p.phone_number ?? '').includes(q),
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Billing</h1>
          <p>Patients with money to collect — lab tests, medicines and bills not fully paid.</p>
        </div>
        <button className="btn" onClick={load}>
          Refresh
        </button>
      </div>

      <input
        className="input"
        style={{ width: '100%', maxWidth: 360, marginBottom: 16 }}
        placeholder="Search by name, Customer ID or phone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ErrorMessage error={error} />
      {patients && shown.length === 0 && (
        <p style={{ color: 'var(--color-ink-soft)' }}>{q ? `No one matching "${query}" owes anything.` : 'Nothing to collect. Everyone has paid.'}</p>
      )}
      {shown.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Phone</th>
              <th>Not billed yet</th>
              <th>Unpaid bills</th>
              <th style={{ textAlign: 'right' }}>To collect</th>
              <th>Since</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/patients/${p.id}`}>{p.current_name}</Link>{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-soft)' }}>{p.customer_code}</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatIndianPhone(p.phone_number)}</td>
                <td>{p.unbilledCount ? `${p.unbilledCount} item${p.unbilledCount === 1 ? '' : 's'} · ${formatRupees(p.unbilledCents)}` : '—'}</td>
                <td>{p.unpaidBills ? `${p.unpaidBills} · ${formatRupees(p.unpaidCents)} due` : '—'}</td>
                <td className="num">
                  <strong>{formatRupees(p.totalDueCents)}</strong>
                </td>
                <td>{formatDateTime(p.since)}</td>
                <td>
                  <TakePaymentButton patientId={p.id} primary />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { get, describeError } from '../api/client.js';
import { formatIndianPhone } from '../lib/phone.js';
import { ErrorMessage } from './ErrorMessage.js';

export interface PickedPatient {
  id: number;
  customer_code: string;
  current_name: string;
  age: number | null;
  phone_number: string | null;
}

/** Search box that finds a patient by name, Customer ID or phone number and hands the chosen one back. */
export function PatientPicker({
  value,
  onChange,
  autoFocus,
}: {
  value: PickedPatient | null;
  onChange: (patient: PickedPatient | null) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedPatient[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    // Small delay so each keystroke doesn't fire its own search.
    const timer = setTimeout(() => {
      get<{ results: PickedPatient[] }>(`/patients/search?${new URLSearchParams({ q, pageSize: '8' })}`)
        .then((d) => {
          if (cancelled) return;
          setResults(d.results);
          setError(null);
        })
        .catch((err) => !cancelled && setError(describeError(err, 'search patients')));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (value) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
        <div>
          <strong>{value.current_name}</strong>{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>{value.customer_code}</span>
          <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
            {value.age !== null ? `${value.age} yrs · ` : ''}
            {formatIndianPhone(value.phone_number)}
          </div>
        </div>
        <button type="button" className="btn-text" style={{ marginLeft: 'auto' }} onClick={() => onChange(null)}>
          Change patient
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        className="input"
        style={{ width: '100%', maxWidth: 420 }}
        placeholder="Search by name, Customer ID, or phone number"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
      />
      <ErrorMessage error={error} />
      {query.trim() && results.length === 0 && !error && (
        <p style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>No patients match "{query.trim()}".</p>
      )}
      {results.length > 0 && (
        <table className="data-table" style={{ marginTop: 8, maxWidth: 640 }}>
          <tbody>
            {results.map((p) => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{p.customer_code}</td>
                <td>{p.current_name}</td>
                <td className="num">{p.age ?? '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatIndianPhone(p.phone_number)}</td>
                <td>
                  <button type="button" className="btn" onClick={() => onChange(p)}>
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

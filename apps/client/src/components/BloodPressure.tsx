import { useEffect, useState, type FormEvent } from 'react';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { formatDateTime } from '../lib/datetime.js';
import { ErrorMessage } from './ErrorMessage.js';

interface Reading {
  id: number;
  blood_pressure: string;
  recorded_at: string;
  recorded_by_name: string | null;
}

/**
 * Latest blood pressure with when and who took it, an "Update BP" button
 * (front desk and doctors), and the full history on demand. Every update
 * is kept -- nothing is overwritten.
 */
export function BloodPressure({ patientId, onChanged }: { patientId: string; onChanged?: () => void }) {
  const canRecord = useHasPermission('patient.edit') || useHasPermission('patient.editMedicalInstructions');
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    get<{ readings: Reading[] }>(`/patients/${patientId}/bp`)
      .then((d) => setReadings(d.readings))
      .catch(() => setReadings([]));
  }

  useEffect(load, [patientId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!/^\s*\d{2,3}\s*\/\s*\d{2,3}\s*$/.test(value)) {
      setError('Write it like 120/80.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await mutate(`/patients/${patientId}/bp`, 'POST', { bloodPressure: value });
      setValue('');
      setAdding(false);
      load();
      onChanged?.();
    } catch (err) {
      setError(describeError(err, 'save the blood pressure'));
    } finally {
      setSaving(false);
    }
  }

  const latest = readings?.[0];

  return (
    <div className="meta-item">
      <span className="meta-label">Blood pressure</span>
      <span className="meta-value">
        {latest ? latest.blood_pressure : readings ? '—' : '…'}
        {latest && (
          <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--color-ink-soft)' }}>
            {formatDateTime(latest.recorded_at)}
            {latest.recorded_by_name ? ` · by ${latest.recorded_by_name}` : ''}
          </span>
        )}
      </span>

      <span style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {canRecord && !adding && (
          <button type="button" className="btn-text" onClick={() => setAdding(true)}>
            Update BP
          </button>
        )}
        {readings && readings.length > 1 && (
          <button type="button" className="btn-text" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide history' : `History (${readings.length})`}
          </button>
        )}
      </span>

      {adding && (
        <form onSubmit={save} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <input
            className="input"
            style={{ width: 100 }}
            placeholder="120/80"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
          >
            Cancel
          </button>
        </form>
      )}
      <ErrorMessage error={error} style={{ marginTop: 6 }} />

      {showHistory && readings && (
        <table className="data-table" style={{ marginTop: 6, fontSize: 13 }}>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.blood_pressure}</td>
                <td>{formatDateTime(r.recorded_at)}</td>
                <td>{r.recorded_by_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

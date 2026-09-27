import { useEffect, useState } from 'react';
import { get, mutate, describeError } from '../api/client.js';
import { ErrorMessage } from './ErrorMessage.js';
import { shrinkImage } from '../lib/image.js';

// Signatures print about 60 x 22 mm; this is plenty sharp for that.
const SIGNATURE_SIZE = { maxWidth: 600, maxHeight: 240, type: 'image/png' as const };

function SignaturePicker({ value, onChange }: { value: string | null; onChange: (image: string | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div
        style={{
          width: 180,
          height: 60,
          border: '1px dashed var(--color-border)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
        }}
      >
        {value ? (
          <img src={value} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        ) : (
          <span style={{ fontSize: 12, color: '#777' }}>No signature</span>
        )}
      </div>
      <label className="btn" style={{ cursor: 'pointer' }}>
        {value ? 'Change picture' : 'Add picture'}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              setError(null);
              onChange(await shrinkImage(file, SIGNATURE_SIZE));
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        />
      </label>
      {value && (
        <button type="button" className="btn-text" onClick={() => onChange(null)}>
          Remove
        </button>
      )}
      <ErrorMessage error={error} style={{ width: '100%', margin: 0 }} />
    </div>
  );
}

interface ReportSettings {
  signerName: string;
  signerDegree: string;
  signerImage: string | null;
  technicians: { id: number; full_name: string; signature: string | null }[];
}

/** Settings > Lab report: who signs, and their signature pictures. */
export function LabReportSettings() {
  const [s, setS] = useState<ReportSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    get<ReportSettings>('/lab/report-settings')
      .then(setS)
      .catch((err) => setError(describeError(err, 'load lab report settings')));
  }
  useEffect(load, []);

  async function saveSigner() {
    if (!s) return;
    setError(null);
    setStatus(null);
    try {
      await mutate('/lab/report-settings', 'POST', {
        signerName: s.signerName,
        signerDegree: s.signerDegree,
        signerImage: s.signerImage,
      });
      setStatus('Saved.');
    } catch (err) {
      setError(describeError(err, 'save the lab report settings'));
    }
  }

  async function saveTechSignature(userId: number, image: string | null) {
    setError(null);
    try {
      await mutate(`/lab/signatures/${userId}`, 'POST', { image });
      load();
    } catch (err) {
      setError(describeError(err, 'save the signature'));
    }
  }

  if (!s) return error ? <ErrorMessage error={error} /> : null;

  return (
    <section className="card" style={{ marginBottom: 40, maxWidth: 760 }}>
      <h2 style={{ marginTop: 0 }}>Lab report signatures</h2>
      <p style={{ color: 'var(--color-ink-soft)', marginTop: 0 }}>
        Left side of the report: the technician who saved the results. Right side: the doctor below.
      </p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="ls-name">Doctor (right side)</label>
          <input id="ls-name" value={s.signerName} onChange={(e) => setS({ ...s, signerName: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="ls-degree">Degree</label>
          <input id="ls-degree" value={s.signerDegree} onChange={(e) => setS({ ...s, signerDegree: e.target.value })} />
        </div>
      </div>
      <SignaturePicker value={s.signerImage} onChange={(img) => setS({ ...s, signerImage: img })} />
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={saveSigner}>
        Save doctor signature
      </button>
      {status && <span style={{ marginLeft: 10, color: 'var(--color-positive)' }}>{status}</span>}

      <h3>Technician signatures</h3>
      {s.technicians.length === 0 && <p style={{ color: 'var(--color-ink-soft)' }}>No lab technician accounts yet.</p>}
      {s.technicians.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <strong style={{ width: 160 }}>{t.full_name}</strong>
          <SignaturePicker value={t.signature} onChange={(img) => saveTechSignature(t.id, img)} />
        </div>
      ))}
      <ErrorMessage error={error} />
    </section>
  );
}

const HEADER_FIELDS: { key: string; label: string }[] = [
  { key: 'print.name', label: 'Hospital name (printed)' },
  { key: 'print.address', label: 'Address' },
  { key: 'print.phone', label: 'Phone (optional)' },
  { key: 'print.doc1.name', label: 'Doctor 1 name' },
  { key: 'print.doc1.degree', label: 'Doctor 1 degree' },
  { key: 'print.doc1.role', label: 'Doctor 1 role' },
  { key: 'print.doc2.name', label: 'Doctor 2 name' },
  { key: 'print.doc2.degree', label: 'Doctor 2 degree' },
  { key: 'print.doc2.role', label: 'Doctor 2 role' },
];

/** Settings > Print header: the letterhead on the lab report, bill and receipt. */
export function PrintHeaderSettings() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<{ values: Record<string, string>; clinicName: string }>('/admin/print-header')
      .then((d) => {
        setValues(d.values);
        setClinicName(d.clinicName);
      })
      .catch((err) => setError(describeError(err, 'load the print header')));
  }, []);

  async function save() {
    setError(null);
    setStatus(null);
    try {
      await mutate('/admin/print-header', 'POST', { values, clinicName });
      setStatus('Saved. New prints use it straight away.');
    } catch (err) {
      setError(describeError(err, 'save the print header'));
    }
  }

  if (!values) return error ? <ErrorMessage error={error} /> : null;

  return (
    <section className="card" style={{ marginBottom: 40, maxWidth: 760 }}>
      <h2 style={{ marginTop: 0 }}>Print header</h2>
      <p style={{ color: 'var(--color-ink-soft)', marginTop: 0 }}>
        The letterhead at the top of lab reports, bills and pharmacy receipts. Leave a doctor's name empty to leave them off.
      </p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="ph-clinic">Hospital name (English, on bills)</label>
          <input id="ph-clinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
        </div>
        {HEADER_FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`ph-${f.key}`}>{f.label}</label>
            <input
              id={`ph-${f.key}`}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <ErrorMessage error={error} />
      <button className="btn btn-primary" onClick={save}>
        Save print header
      </button>
      {status && <span style={{ marginLeft: 10, color: 'var(--color-positive)' }}>{status}</span>}
    </section>
  );
}

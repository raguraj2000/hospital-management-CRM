import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { Pagination } from '../components/Pagination.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { PatientPicker, type PickedPatient } from '../components/PatientPicker.js';
import { formatRupees } from '../lib/money.js';
import { formatIndianPhone } from '../lib/phone.js';

const PAGE_SIZE = 20;

interface LabOrderRow {
  id: number;
  order_number: string;
  created_at: string;
  patient_id: number;
  customer_code: string;
  current_name: string;
  phone_number: string | null;
  tests: string | null;
  pending_count: number;
  last_completed_at: string | null;
  referring_doctor_name: string | null;
}

export interface LabTestOption {
  id: number;
  name: string;
  sample_type: string | null;
  department: string | null;
  price_cents: number;
  is_active: number;
  print_new_page: number;
  parameters: {
    id: number;
    name: string;
    method: string | null;
    unit: string | null;
    ref_low: number | null;
    ref_high: number | null;
    ref_low_female: number | null;
    ref_high_female: number | null;
    ref_text: string | null;
    ref_display: string | null;
    options: string | null;
    no_flag: number;
  }[];
}

function OrderList({ status }: { status: 'pending' | 'completed' }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<LabOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(q: string, targetPage: number) {
    setLoading(true);
    const params = new URLSearchParams({ status, page: String(targetPage), pageSize: String(PAGE_SIZE) });
    if (q.trim()) params.set('q', q.trim());
    get<{ orders: LabOrderRow[]; total: number }>(`/lab/orders?${params}`)
      .then((d) => {
        setRows(d.orders);
        setTotal(d.total);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load lab tests')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => load(query, 1), query ? 250 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          style={{ width: '100%', maxWidth: 360 }}
          placeholder="Search by patient name, Customer ID, phone, or lab number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" onClick={() => load(query, page)} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        {!loading && total > 0 && (
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 13, marginLeft: 'auto' }}>
            {total} order{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <ErrorMessage error={error} />

      {!loading && rows.length === 0 && !error && (
        <p style={{ color: 'var(--color-ink-soft)' }}>
          {query ? `No lab orders match "${query}".` : status === 'pending' ? 'No tests waiting. 🎉' : 'No completed tests yet.'}
        </p>
      )}

      {rows.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Lab no.</th>
              <th>{status === 'pending' ? 'Ordered' : 'Completed'}</th>
              <th>Patient</th>
              <th>Phone</th>
              <th>Tests</th>
              <th>Doctor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{o.order_number}</td>
                <td>{(status === 'pending' ? o.created_at : o.last_completed_at)?.slice(0, 16) ?? '—'}</td>
                <td>
                  <Link to={`/patients/${o.patient_id}`}>{o.current_name}</Link>{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)', fontSize: 12 }}>
                    {o.customer_code}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatIndianPhone(o.phone_number)}</td>
                <td>
                  {o.tests ?? '—'}
                  {status === 'pending' && o.pending_count > 0 && (
                    <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                      {o.pending_count} waiting
                    </span>
                  )}
                </td>
                <td>{o.referring_doctor_name ?? '—'}</td>
                <td>
                  <Link to={`/lab/orders/${o.id}`} className="btn">
                    {status === 'pending' ? 'Enter results' : 'Open'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(p) => {
          setPage(p);
          load(query, p);
        }}
      />
    </div>
  );
}

export function Lab() {
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const canOrder = useHasPermission('lab.order');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lab</h1>
          <p>Tests waiting for results, and finished reports.</p>
        </div>
        {canOrder && (
          <Link to="/lab/new" className="btn btn-primary">
            New lab order
          </Link>
        )}
      </div>

      <div className="tabs">
        <button className={tab === 'pending' ? 'tab active' : 'tab'} onClick={() => setTab('pending')}>
          Waiting for results
        </button>
        <button className={tab === 'completed' ? 'tab active' : 'tab'} onClick={() => setTab('completed')}>
          Completed
        </button>
      </div>

      <OrderList status={tab} />
    </div>
  );
}

interface StaffOption {
  id: number;
  full_name: string;
  role_name: string;
}

function ageFrom(p: { dob: string | null; age_years_at_registration: number | null }): number | null {
  if (p.dob) return Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return p.age_years_at_registration;
}

export function LabNewOrder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [tests, setTests] = useState<LabTestOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [doctors, setDoctors] = useState<StaffOption[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get<{ tests: LabTestOption[] }>('/lab/tests')
      .then((d) => setTests(d.tests))
      .catch((err) => setError(describeError(err, 'load the test list')));
    get<{ staff: StaffOption[] }>('/staff')
      .then((d) => setDoctors(d.staff.filter((s) => s.role_name === 'doctor')))
      .catch(() => {});

    // Opened from a patient's page: start with that patient picked.
    const pid = searchParams.get('patientId');
    if (pid) {
      get<{ patient: any }>(`/patients/${pid}`)
        .then(({ patient: p }) =>
          setPatient({
            id: p.id,
            customer_code: p.customer_code,
            current_name: p.current_name,
            phone_number: p.phone_number,
            age: ageFrom(p),
          }),
        )
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalCents = tests.filter((t) => selected.has(t.id)).reduce((sum, t) => sum + t.price_cents, 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!patient) return setError('Pick the patient first.');
    if (selected.size === 0) return setError('Tick at least one test.');
    setSaving(true);
    setError(null);
    try {
      const { id } = await mutate<{ id: number }>('/lab/orders', 'POST', {
        patientId: patient.id,
        testIds: [...selected],
        referringDoctorId: doctorId ? Number(doctorId) : null,
        notes: notes.trim() || null,
      });
      navigate(`/lab/orders/${id}`);
    } catch (err) {
      setError(describeError(err, 'create the lab order'));
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New lab order</h1>
          <p>Pick the patient and tick the tests to do.</p>
        </div>
        <button className="btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <form onSubmit={submit} style={{ maxWidth: 760 }}>
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Patient</h2>
          <PatientPicker value={patient} onChange={setPatient} autoFocus={!searchParams.get('patientId')} />
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Tests</h2>
          {tests.length === 0 && <p style={{ color: 'var(--color-ink-soft)' }}>Loading tests…</p>}
          {[...new Set(tests.map((t) => t.department ?? ''))].map((dept) => (
            <div key={dept} style={{ marginBottom: 10 }}>
              {dept && (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink-soft)', margin: '6px 0 2px' }}>{dept}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                {tests
                  .filter((t) => (t.department ?? '') === dept)
                  .map((t) => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                      <span style={{ flex: 1 }}>{t.name}</span>
                      <span style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>{formatRupees(t.price_cents)}</span>
                    </label>
                  ))}
              </div>
            </div>
          ))}
          {selected.size > 0 && (
            <p style={{ marginBottom: 0 }}>
              <strong>
                {selected.size} test{selected.size === 1 ? '' : 's'} · {formatRupees(totalCents)}
              </strong>
            </p>
          )}
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="lab-doctor">Referring doctor</label>
              <select id="lab-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">— none —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="lab-notes">Notes for the lab (optional)</label>
              <input id="lab-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. fasting since 10 PM" />
            </div>
          </div>
        </section>

        <ErrorMessage error={error} />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Create lab order'}
        </button>
      </form>
    </div>
  );
}

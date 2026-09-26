import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { formatIndianPhone } from '../lib/phone.js';
import { flagLabValue, type LabFlag } from '@clinic/shared';
import { TakePaymentButton } from '../components/TakePaymentButton.js';

interface PendingParameter {
  id: number;
  name: string;
  method: string | null;
  unit: string | null;
  low: number | null;
  high: number | null;
  range: string | null;
  normalText: string | null;
  noFlag: boolean;
  options: string[];
}

interface ResultRow {
  id: number;
  parameter_name: string;
  method: string | null;
  unit: string | null;
  reference_range: string | null;
  value: string;
  flag: LabFlag;
}

interface LabItem {
  id: number;
  lab_test_id: number;
  test_name: string;
  sample_type: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  completed_at: string | null;
  completed_by_name: string | null;
  cancelled_at: string | null;
  cancelled_by_name: string | null;
  cancel_reason: string | null;
  replaces_item_id: number | null;
  parameters: PendingParameter[];
  results: ResultRow[];
}

interface LabOrderDetail {
  order: {
    id: number;
    order_number: string;
    created_at: string;
    sample_collected_at: string | null;
    notes: string | null;
    referring_doctor_name: string | null;
    ordered_by_name: string | null;
  };
  patient: {
    id: number;
    customer_code: string;
    current_name: string;
    gender: string | null;
    phone_number: string | null;
    age: number | null;
  };
  items: LabItem[];
}

function FlagBadge({ flag }: { flag: LabFlag }) {
  if (!flag) return null;
  const label = flag === 'H' ? 'H — high' : flag === 'L' ? 'L — low' : 'Not normal';
  return (
    <span className="badge badge-critical" style={{ marginLeft: 6 }}>
      {label}
    </span>
  );
}

function ResultsTable({ results, struck }: { results: ResultRow[]; struck?: boolean }) {
  return (
    <table className="data-table" style={struck ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
      <thead>
        <tr>
          <th>Test</th>
          <th>Methodology</th>
          <th>Result</th>
          <th>Unit</th>
          <th>Normal range</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.id} className={r.flag && !struck ? 'row-critical' : undefined}>
            <td>{r.parameter_name}</td>
            <td style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>{r.method ?? ''}</td>
            <td style={{ fontWeight: r.flag ? 700 : undefined }}>
              {r.value}
              <FlagBadge flag={struck ? null : r.flag} />
            </td>
            <td>{r.unit ?? ''}</td>
            <td>{r.reference_range ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EnterResults({ item, onSaved }: { item: LabItem; onSaved: () => void }) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filledCount = item.parameters.filter((p) => (values[p.id] ?? '').trim()).length;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await mutate(`/lab/items/${item.id}/results`, 'POST', {
        values: item.parameters
          .filter((p) => (values[p.id] ?? '').trim())
          .map((p) => ({ parameterId: p.id, value: values[p.id].trim() })),
      });
      onSaved();
    } catch (err) {
      setError(describeError(err, 'save the results'));
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Methodology</th>
            <th style={{ width: 320 }}>Result</th>
            <th>Unit</th>
            <th>Normal range</th>
          </tr>
        </thead>
        <tbody>
          {item.parameters.map((p, index) => {
            const v = values[p.id] ?? '';
            const flag = flagLabValue(v, { low: p.low, high: p.high, normalText: p.normalText, noFlag: p.noFlag });
            const setValue = (value: string) => setValues((prev) => ({ ...prev, [p.id]: value }));
            return (
              <tr key={p.id} className={flag ? 'row-critical' : undefined}>
                <td>{p.name}</td>
                <td style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>{p.method ?? ''}</td>
                <td>
                  <input
                    className="input"
                    style={{ width: 120, fontWeight: flag ? 700 : undefined }}
                    value={v}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={saving || confirming}
                    autoFocus={index === 0}
                  />
                  <FlagBadge flag={flag} />
                  {p.options.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {p.options.map((o) => (
                        <button
                          key={o}
                          type="button"
                          className="btn"
                          style={{ padding: '1px 8px', fontSize: 12, fontWeight: v === o ? 700 : undefined }}
                          onClick={() => setValue(o)}
                          disabled={saving || confirming}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td>{p.unit ?? ''}</td>
                <td>{p.range ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ErrorMessage error={error} />

      {!confirming ? (
        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          disabled={filledCount === 0}
          onClick={() => setConfirming(true)}
        >
          Save results
        </button>
      ) : (
        <div className="alert alert-critical" style={{ marginTop: 12 }}>
          <strong>Results can't be changed after saving.</strong> Check every value
          {filledCount < item.parameters.length && ` (${item.parameters.length - filledCount} left blank)`}.
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Yes, save — they are correct'}
            </button>
            <button className="btn" onClick={() => setConfirming(false)} disabled={saving}>
              Go back and check
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// One tap for the usual reasons a waiting test is removed.
const QUICK_REASONS = ['Ordered by mistake', 'Wrong test', 'Patient left', 'Sample not collected'];

function CancelItem({ item, onDone }: { item: LabItem; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCompleted = item.status === 'completed';

  async function submit(text: string) {
    setBusy(true);
    setError(null);
    try {
      await mutate(`/lab/items/${item.id}/cancel`, 'POST', { reason: text.trim() });
      onDone();
    } catch (err) {
      setError(describeError(err, isCompleted ? 'cancel this result' : 'remove this test'));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-text" onClick={() => setOpen(true)}>
        {isCompleted ? 'Wrong result? Cancel and re-enter' : 'Remove this test'}
      </button>
    );
  }

  // A saved result is only ever cancelled with a written reason.
  const showText = isCompleted || typing;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
      {!showText && (
        <>
          <span style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>Why?</span>
          {QUICK_REASONS.map((r) => (
            <button key={r} className="btn" onClick={() => submit(r)} disabled={busy}>
              {r}
            </button>
          ))}
          <button className="btn" onClick={() => setTyping(true)} disabled={busy}>
            Other…
          </button>
        </>
      )}
      {showText && (
        <>
          <input
            className="input"
            style={{ flex: 1, minWidth: 240 }}
            placeholder={isCompleted ? 'Why is the result wrong? (required)' : 'Reason'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" onClick={() => submit(reason)} disabled={busy || reason.trim().length < 3}>
            {busy ? 'Saving…' : isCompleted ? 'Cancel result' : 'Remove test'}
          </button>
        </>
      )}
      <button
        className="btn-text"
        onClick={() => {
          setOpen(false);
          setTyping(false);
        }}
        disabled={busy}
      >
        Keep it
      </button>
      <ErrorMessage error={error} style={{ width: '100%', margin: 0 }} />
    </div>
  );
}

/** Adds more tests to an order before any result is saved (instead of cancelling and re-ordering). */
function AddTests({ orderId, existing, onDone }: { orderId: number; existing: Set<number>; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [tests, setTests] = useState<{ id: number; name: string; department: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    get<{ tests: { id: number; name: string; department: string | null }[] }>('/lab/tests')
      .then((d) => setTests(d.tests.filter((t) => !existing.has(t.id))))
      .catch((err) => setError(describeError(err, 'load the test list')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await mutate(`/lab/orders/${orderId}/items`, 'POST', { testIds: [...selected] });
      setOpen(false);
      setSelected(new Set());
      onDone();
    } catch (err) {
      setError(describeError(err, 'add the tests'));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Add tests
      </button>
    );
  }
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>Add tests to this order</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {tests.map((t) => (
          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.has(t.id)}
              onChange={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(t.id)) next.delete(t.id);
                  else next.add(t.id);
                  return next;
                })
              }
            />
            {t.name}
          </label>
        ))}
      </div>
      <ErrorMessage error={error} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary" onClick={add} disabled={busy || selected.size === 0}>
          {busy ? 'Adding…' : `Add ${selected.size || ''} test${selected.size === 1 ? '' : 's'}`}
        </button>
        <button className="btn" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function statusBadge(item: LabItem) {
  if (item.status === 'pending') return <span className="badge badge-warning">Waiting for results</span>;
  if (item.status === 'completed') return <span className="badge badge-positive">Completed</span>;
  return <span className="badge badge-neutral">Cancelled</span>;
}

export function LabOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<LabOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canEnter = useHasPermission('lab.enterResults');
  const canOrder = useHasPermission('lab.order');

  function load() {
    get<LabOrderDetail>(`/lab/orders/${orderId}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load the lab order')));
  }

  useEffect(load, [orderId]);

  if (!data) return error ? <ErrorMessage error={error} /> : <p>Loading…</p>;
  const { order, patient, items } = data;
  const noResultsYet = !items.some((i) => i.status === 'completed');
  // Waiting tests removed before any result are shown as one short line, not a card.
  const removed = items.filter((i) => i.status === 'cancelled' && i.results.length === 0);
  const shown = items.filter((i) => !(i.status === 'cancelled' && i.results.length === 0));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lab order {order.order_number}</h1>
          <p>
            Ordered {order.created_at.slice(0, 16)}
            {order.ordered_by_name ? ` by ${order.ordered_by_name}` : ''}
            {order.referring_doctor_name ? ` · Doctor: ${order.referring_doctor_name}` : ''}
            {order.sample_collected_at ? ` · Sample collected ${order.sample_collected_at.slice(0, 16)}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <TakePaymentButton patientId={patient.id} />
          {items.some((i) => i.status === 'completed') && (
            <Link to={`/lab/orders/${order.id}/report`} className="btn btn-primary">
              Print report
            </Link>
          )}
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <Link to={`/patients/${patient.id}`}>
          <strong>{patient.current_name}</strong>
        </Link>{' '}
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>{patient.customer_code}</span>
        <div style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>
          {patient.age !== null ? `${patient.age} yrs` : 'Age not recorded'} ·{' '}
          {patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : 'Gender not recorded'} ·{' '}
          {formatIndianPhone(patient.phone_number)}
        </div>
        {order.notes && <p style={{ marginBottom: 0 }}>Note: {order.notes}</p>}
      </section>

      <ErrorMessage error={error} />

      {canOrder && noResultsYet && (
        <div style={{ marginBottom: 16 }}>
          <AddTests
            orderId={order.id}
            existing={new Set(items.filter((i) => i.status === 'pending').map((i) => i.lab_test_id))}
            onDone={load}
          />
        </div>
      )}

      {shown.map((item) => (
        <section key={item.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, textDecoration: item.status === 'cancelled' ? 'line-through' : undefined }}>
              {item.test_name}
            </h2>
            {statusBadge(item)}
            {item.sample_type && <span style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>{item.sample_type}</span>}
            {item.replaces_item_id && (
              <span style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>(re-entry of a cancelled result)</span>
            )}
          </div>

          {item.status === 'pending' &&
            (canEnter ? (
              <EnterResults item={item} onSaved={load} />
            ) : (
              <p style={{ color: 'var(--color-ink-soft)' }}>Waiting for the lab to enter results.</p>
            ))}

          {item.status !== 'pending' && item.results.length > 0 && (
            <ResultsTable results={item.results} struck={item.status === 'cancelled'} />
          )}

          {item.status === 'completed' && (
            <p style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>
              Saved {item.completed_at?.slice(0, 16)}
              {item.completed_by_name ? ` by ${item.completed_by_name}` : ''}. Results can't be edited.
            </p>
          )}

          {item.status === 'cancelled' && (
            <p style={{ color: 'var(--color-critical)', fontSize: 13 }}>
              Cancelled {item.cancelled_at?.slice(0, 16)}
              {item.cancelled_by_name ? ` by ${item.cancelled_by_name}` : ''} — reason: {item.cancel_reason}
            </p>
          )}

          {(item.status === 'completed' ? canEnter : item.status === 'pending' && (canEnter || canOrder)) && (
            <div style={{ marginTop: 12 }}>
              <CancelItem item={item} onDone={load} />
            </div>
          )}
        </section>
      ))}

      {removed.length > 0 && (
        <div style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>
          {removed.map((i) => (
            <div key={i.id}>
              Removed: <s>{i.test_name}</s> — {i.cancel_reason}
              {i.cancelled_by_name ? ` (${i.cancelled_by_name}, ${i.cancelled_at?.slice(0, 16)})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

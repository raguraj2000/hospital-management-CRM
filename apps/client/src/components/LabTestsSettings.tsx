import { useEffect, useState } from 'react';
import { get, mutate, describeError } from '../api/client.js';
import { ErrorMessage } from './ErrorMessage.js';
import { formatRupees, rupeesToCents, centsToRupees } from '../lib/money.js';
import type { LabTestOption } from '../pages/Lab.js';

interface ParamDraft {
  id?: number;
  name: string;
  method: string;
  unit: string;
  refLow: string;
  refHigh: string;
  refLowFemale: string;
  refHighFemale: string;
  refText: string;
  refDisplay: string;
  options: string;
  noFlag: boolean;
}

interface TestDraft {
  id?: number;
  name: string;
  department: string;
  sampleType: string;
  price: string;
  isActive: boolean;
  printNewPage: boolean;
  parameters: ParamDraft[];
}

const EMPTY_PARAM: ParamDraft = {
  name: '',
  method: '',
  unit: '',
  refLow: '',
  refHigh: '',
  refLowFemale: '',
  refHighFemale: '',
  refText: '',
  refDisplay: '',
  options: '',
  noFlag: false,
};

function numOrEmpty(n: number | null): string {
  return n === null ? '' : String(n);
}

function toNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function draftFrom(t: LabTestOption): TestDraft {
  return {
    id: t.id,
    name: t.name,
    department: t.department ?? '',
    sampleType: t.sample_type ?? '',
    price: centsToRupees(t.price_cents),
    isActive: t.is_active === 1,
    printNewPage: t.print_new_page === 1,
    parameters: t.parameters.map((p) => ({
      id: p.id,
      name: p.name,
      method: p.method ?? '',
      unit: p.unit ?? '',
      refLow: numOrEmpty(p.ref_low),
      refHigh: numOrEmpty(p.ref_high),
      refLowFemale: numOrEmpty(p.ref_low_female),
      refHighFemale: numOrEmpty(p.ref_high_female),
      refText: p.ref_text ?? '',
      refDisplay: p.ref_display ?? '',
      options: p.options ? (JSON.parse(p.options) as string[]).join(', ') : '',
      noFlag: p.no_flag === 1,
    })),
  };
}

function TestEditor({ draft, onClose }: { draft: TestDraft; onClose: (saved: boolean) => void }) {
  const [d, setD] = useState<TestDraft>(draft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setParam(index: number, patch: Partial<ParamDraft>) {
    setD((prev) => ({ ...prev, parameters: prev.parameters.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));
  }

  async function save() {
    const params = d.parameters.filter((p) => p.name.trim());
    if (!d.name.trim()) return setError('Enter the test name.');
    if (params.length === 0) return setError('Add at least one value this test measures.');
    const bad = params.find((p) =>
      [p.refLow, p.refHigh, p.refLowFemale, p.refHighFemale].some((s) => s.trim() && toNumber(s) === null),
    );
    if (bad) return setError(`"${bad.name}": normal range limits must be numbers.`);

    setSaving(true);
    setError(null);
    const body = {
      name: d.name.trim(),
      department: d.department.trim() || null,
      sampleType: d.sampleType.trim() || null,
      priceCents: rupeesToCents(d.price || '0'),
      isActive: d.isActive,
      printNewPage: d.printNewPage,
      parameters: params.map((p) => ({
        id: p.id,
        name: p.name.trim(),
        method: p.method.trim() || null,
        unit: p.unit.trim() || null,
        refLow: toNumber(p.refLow),
        refHigh: toNumber(p.refHigh),
        refLowFemale: toNumber(p.refLowFemale),
        refHighFemale: toNumber(p.refHighFemale),
        refText: p.refText.trim() || null,
        refDisplay: p.refDisplay.trim() || null,
        options: p.options
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
        noFlag: p.noFlag,
      })),
    };
    try {
      if (d.id) await mutate(`/lab/tests/${d.id}`, 'PATCH', body);
      else await mutate('/lab/tests', 'POST', body);
      onClose(true);
    } catch (err) {
      setError(describeError(err, 'save the test'));
      setSaving(false);
    }
  }

  const cell = { width: '100%', minWidth: 60 };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>{d.id ? `Edit: ${draft.name}` : 'New lab test'}</h3>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="lt-name">Test name</label>
          <input id="lt-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="lt-dept">Department (heading on the report)</label>
          <input
            id="lt-dept"
            value={d.department}
            placeholder="e.g. DEPARTMENT OF HEMATOLOGY"
            onChange={(e) => setD({ ...d, department: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="lt-sample">Sample</label>
          <input id="lt-sample" value={d.sampleType} placeholder="e.g. Blood (EDTA)" onChange={(e) => setD({ ...d, sampleType: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="lt-price">Price (₹)</label>
          <input id="lt-price" inputMode="decimal" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />
        </div>
        <div className="field">
          <label>
            <input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} /> Offered (can be
            ordered)
          </label>
          <label>
            <input type="checkbox" checked={d.printNewPage} onChange={(e) => setD({ ...d, printNewPage: e.target.checked })} /> Always
            start on a new page when printed
          </label>
        </div>
      </div>

      <p style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>
        Normal range: fill "Low" and/or "High". Fill the female columns only if women have a different range. For text results
        (e.g. Nil, Negative), leave the numbers empty and write the normal answer. "Printed range" replaces the range text on the
        report (e.g. Non-pregnant: &lt; 5). Quick picks are buttons for common answers, separated by commas. Changes never affect
        results already saved.
      </p>
      <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Value measured</th>
            <th>Methodology</th>
            <th>Unit</th>
            <th>Low</th>
            <th>High</th>
            <th>Female low</th>
            <th>Female high</th>
            <th>Normal (text)</th>
            <th>Printed range</th>
            <th>Quick picks</th>
            <th>No flag</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {d.parameters.map((p, i) => (
            <tr key={p.id ?? `new-${i}`}>
              <td><input className="input" style={{ ...cell, minWidth: 200 }} value={p.name} onChange={(e) => setParam(i, { name: e.target.value })} /></td>
              <td><input className="input" style={{ ...cell, minWidth: 150 }} value={p.method} onChange={(e) => setParam(i, { method: e.target.value })} /></td>
              <td><input className="input" style={cell} value={p.unit} onChange={(e) => setParam(i, { unit: e.target.value })} /></td>
              <td><input className="input" style={cell} inputMode="decimal" value={p.refLow} onChange={(e) => setParam(i, { refLow: e.target.value })} /></td>
              <td><input className="input" style={cell} inputMode="decimal" value={p.refHigh} onChange={(e) => setParam(i, { refHigh: e.target.value })} /></td>
              <td><input className="input" style={cell} inputMode="decimal" value={p.refLowFemale} onChange={(e) => setParam(i, { refLowFemale: e.target.value })} /></td>
              <td><input className="input" style={cell} inputMode="decimal" value={p.refHighFemale} onChange={(e) => setParam(i, { refHighFemale: e.target.value })} /></td>
              <td><input className="input" style={cell} value={p.refText} onChange={(e) => setParam(i, { refText: e.target.value })} /></td>
              <td><input className="input" style={{ ...cell, minWidth: 120 }} value={p.refDisplay} onChange={(e) => setParam(i, { refDisplay: e.target.value })} /></td>
              <td><input className="input" style={{ ...cell, minWidth: 150 }} value={p.options} placeholder="Nil, Trace, +" onChange={(e) => setParam(i, { options: e.target.value })} /></td>
              <td style={{ textAlign: 'center' }}><input type="checkbox" checked={p.noFlag} onChange={(e) => setParam(i, { noFlag: e.target.checked })} title="Never mark this value high/low/not normal" /></td>
              <td>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => setD((prev) => ({ ...prev, parameters: prev.parameters.filter((_, j) => j !== i) }))}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button type="button" className="btn-text" onClick={() => setD((prev) => ({ ...prev, parameters: [...prev.parameters, { ...EMPTY_PARAM }] }))}>
        + Add value
      </button>

      <ErrorMessage error={error} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save test'}
        </button>
        <button className="btn" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function LabTestsSettings() {
  const [tests, setTests] = useState<LabTestOption[]>([]);
  const [editing, setEditing] = useState<TestDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    get<{ tests: LabTestOption[] }>('/lab/tests?all=1')
      .then((d) => {
        setTests(d.tests);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load lab tests')));
  }

  useEffect(load, []);

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Lab tests</h2>
        {!editing && (
          <button
            className="btn"
            onClick={() =>
              setEditing({
                name: '',
                department: '',
                sampleType: '',
                price: '0',
                isActive: true,
                printNewPage: false,
                parameters: [{ ...EMPTY_PARAM }],
              })
            }
          >
            Add test
          </button>
        )}
      </div>
      <p style={{ color: 'var(--color-ink-soft)', marginTop: 0 }}>
        The starter list comes from the hospital's own report template. Prices start at ₹0 — set them before use.
      </p>
      <ErrorMessage error={error} />

      {editing && (
        <TestEditor
          key={editing.id ?? 'new'}
          draft={editing}
          onClose={(saved) => {
            setEditing(null);
            if (saved) load();
          }}
        />
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Department</th>
            <th>Sample</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Values</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => (
            <tr key={t.id} style={t.is_active ? undefined : { opacity: 0.55 }}>
              <td>{t.name}</td>
              <td style={{ fontSize: 12 }}>{t.department ?? '—'}</td>
              <td>{t.sample_type ?? '—'}</td>
              <td className="num">{formatRupees(t.price_cents)}</td>
              <td className="num">{t.parameters.length}</td>
              <td>{t.is_active ? 'Offered' : 'Not offered'}</td>
              <td>
                <button className="btn-text" onClick={() => setEditing(draftFrom(t))} disabled={!!editing}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

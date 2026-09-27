import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { MedicineCombobox, type MedicineComboboxOption } from '../components/MedicineCombobox.js';
import { formatRupees, rupeesToCents, centsToRupees } from '../lib/money.js';
import type { VendorRow } from './Vendors.js';

interface Medicine extends MedicineComboboxOption {
  price_cents: number;
}

interface Line {
  medicineId: string;
  lotNumber: string;
  expiryDate: string;
  quantity: string;
  cost: string;
  /** Blank = keep the current selling price. */
  sellingPrice: string;
}

const BLANK: Line = { medicineId: '', lotNumber: '', expiryDate: '', quantity: '', cost: '', sellingPrice: '' };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One vendor bill, many medicines: saving adds all the stock and records what is owed. */
export function PurchaseNew() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [dueTouched, setDueTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ ...BLANK }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get<{ vendors: VendorRow[] }>('/vendors')
      .then((d) => setVendors(d.vendors.filter((v) => v.is_active)))
      .catch((err) => setError(describeError(err, 'load vendors')));
    get<{ medicines: Medicine[] }>('/medicines')
      .then((d) => setMedicines(d.medicines))
      .catch((err) => setError(describeError(err, 'load medicines')));
  }, []);

  // Due date follows the vendor's credit days until someone changes it by hand.
  useEffect(() => {
    if (dueTouched) return;
    const v = vendors.find((x) => String(x.id) === vendorId);
    setDueDate(v ? addDays(billDate, v.credit_days) : '');
  }, [vendorId, billDate, vendors, dueTouched]);

  function update(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  const filled = lines.filter((l) => l.medicineId);
  const totalCents = filled.reduce((s, l) => s + (Number(l.quantity) || 0) * rupeesToCents(l.cost), 0);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!vendorId) return setError('Pick the vendor.');
    if (filled.length === 0) return setError('Add at least one medicine.');
    const bad = filled.find((l) => !l.lotNumber.trim() || !l.expiryDate || !(Number(l.quantity) > 0));
    if (bad) return setError('Every medicine needs a batch number, expiry date and quantity.');
    setSaving(true);
    setError(null);
    try {
      const { id } = await mutate<{ id: number }>('/vendors/purchases', 'POST', {
        supplierId: Number(vendorId),
        vendorBillNumber: billNo.trim() || null,
        billDate,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
        lines: filled.map((l) => ({
          medicineId: Number(l.medicineId),
          lotNumber: l.lotNumber.trim(),
          expiryDate: l.expiryDate,
          quantity: Number(l.quantity),
          unitCostCents: rupeesToCents(l.cost || '0'),
          newSellingPriceCents: l.sellingPrice.trim() ? rupeesToCents(l.sellingPrice) : null,
        })),
      });
      navigate(`/vendors/purchases/${id}`, { replace: true });
    } catch (err) {
      setError(describeError(err, 'save this purchase bill'));
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Receive stock from vendor</h1>
          <p>Enter the vendor's bill. Saving adds every medicine to stock and records what we owe.</p>
        </div>
        <button className="btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <form onSubmit={save}>
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-vendor">Vendor</label>
              <select id="p-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="">— pick vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-billno">Vendor's bill number</label>
              <input id="p-billno" value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="as printed on their bill" />
            </div>
            <div className="field">
              <label htmlFor="p-date">Bill date</label>
              <input id="p-date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="p-due">Pay by (due date)</label>
              <input
                id="p-due"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueTouched(true);
                  setDueDate(e.target.value);
                }}
              />
            </div>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Medicines on this bill</h2>
          {/* No scroll box around this table: it would clip the medicine search list. */}
          <div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 240 }}>Medicine</th>
                  <th>Batch no.</th>
                  <th>Expiry</th>
                  <th>Qty</th>
                  <th>Cost price ₹ (each)</th>
                  <th>New selling price ₹</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const med = medicines.find((m) => String(m.id) === l.medicineId);
                  return (
                    <tr key={i}>
                      <td>
                        <MedicineCombobox medicines={medicines} value={l.medicineId} onChange={(id) => update(i, { medicineId: id })} />
                      </td>
                      <td>
                        <input className="input" style={{ width: 110 }} value={l.lotNumber} onChange={(e) => update(i, { lotNumber: e.target.value })} />
                      </td>
                      <td>
                        <input className="input" type="date" value={l.expiryDate} onChange={(e) => update(i, { expiryDate: e.target.value })} />
                      </td>
                      <td>
                        <input className="input" style={{ width: 80 }} type="number" min="1" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
                      </td>
                      <td>
                        <input className="input" style={{ width: 100 }} inputMode="decimal" value={l.cost} onChange={(e) => update(i, { cost: e.target.value })} />
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ width: 100 }}
                          inputMode="decimal"
                          value={l.sellingPrice}
                          placeholder={med ? centsToRupees(med.price_cents) : ''}
                          title="Leave empty to keep the current selling price"
                          onChange={(e) => update(i, { sellingPrice: e.target.value })}
                        />
                      </td>
                      <td className="num">{formatRupees((Number(l.quantity) || 0) * rupeesToCents(l.cost || '0'))}</td>
                      <td>
                        {lines.length > 1 && (
                          <button type="button" className="btn-text" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => setLines((ls) => [...ls, { ...BLANK }])}>
            + Add medicine
          </button>
          <p style={{ fontSize: 16, marginBottom: 0 }}>
            Bill total: <strong>{formatRupees(totalCents)}</strong>
          </p>
        </section>

        <div className="field" style={{ maxWidth: 760 }}>
          <label htmlFor="p-notes">Notes (optional)</label>
          <input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <ErrorMessage error={error} />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save bill and add stock'}
        </button>
      </form>
    </div>
  );
}

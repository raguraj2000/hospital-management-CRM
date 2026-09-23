import { useEffect, useState, type FormEvent } from 'react';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { MedicineCombobox } from '../components/MedicineCombobox.js';
import { Pagination } from '../components/Pagination.js';
import { ConfirmDelete } from '../components/ConfirmDelete.js';
import { ErrorMessage } from '../components/ErrorMessage.js';

interface MedicineRow {
  id: number;
  name: string;
  medical_code: string;
  base_unit: string;
  price_cents: number;
  minimum_stock: number;
  reorder_point: number;
  total_remaining: number;
  nearest_expiry: string | null;
  category_id: number | null;
  category_name: string | null;
}

interface Category {
  id: number;
  name: string;
}

// How many days ahead of the actual expiry date to start warning in red,
// so staff notice stock that's about to go out of date, not just stock
// that already has.
const EXPIRY_WARNING_DAYS = 30;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayIso(): string {
  return isoDate(new Date());
}

function expiryWarnIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + EXPIRY_WARNING_DAYS);
  return isoDate(d);
}

// Already expired: red + bold. Expiring within EXPIRY_WARNING_DAYS: red.
// Anything further out: default text color.
function expiryStyle(dateStr: string | null): React.CSSProperties | undefined {
  if (!dateStr) return undefined;
  if (dateStr < todayIso()) return { color: 'var(--color-critical)', fontWeight: 700 };
  if (dateStr <= expiryWarnIso()) return { color: 'var(--color-critical)' };
  return undefined;
}

const PAGE_SIZE = 20;

const UNIT_OPTIONS = ['Nos', 'Litre', 'Kg'];

const NEW_CATEGORY_VALUE = '__new__';

function statusOf(m: MedicineRow): 'critical' | 'warning' | 'ok' {
  if (m.total_remaining <= m.minimum_stock) return 'critical';
  if (m.total_remaining <= m.reorder_point) return 'warning';
  return 'ok';
}

function formatRupees(cents: number): string {
  return `₹${(cents / 100).toFixed(2)}`;
}

const EMPTY_MEDICINE = {
  name: '',
  categoryId: '',
  baseUnit: 'Nos',
  packSize: '1',
  conversionFactor: '1',
  priceRupees: '',
  minimumStock: '0',
  reorderPoint: '0',
  initialLotNumber: '',
  initialExpiryDate: '',
  initialQuantity: '',
};

export function Inventory() {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManageMedicine = useHasPermission('medicine.manage');
  const canAdjustStock = useHasPermission('inventory.adjust');

  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBatchCode, setEditingBatchCode] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<{ total_remaining: number; base_unit: string } | null>(null);
  const [medicineForm, setMedicineForm] = useState(EMPTY_MEDICINE);
  const [formStatus, setFormStatus] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryStatus, setCategoryStatus] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const [showReceive, setShowReceive] = useState(false);
  const [receiveMedicineId, setReceiveMedicineId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantityReceived, setQuantityReceived] = useState('');
  const [receiveStatus, setReceiveStatus] = useState<string | null>(null);

  const [rowStatus, setRowStatus] = useState<string | null>(null);

  // A full, unpaginated copy for the Receive stock / lookups that need every
  // medicine to search across, independent of which page the table below is
  // showing.
  const [allMedicines, setAllMedicines] = useState<MedicineRow[]>([]);

  function loadMedicines(targetPage = page, q = query) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
    if (q) params.set('q', q);
    get<{ medicines: MedicineRow[]; total: number }>(`/medicines?${params}`)
      .then((d) => {
        setMedicines(d.medicines);
        setTotal(d.total);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load inventory')))
      .finally(() => setLoading(false));
  }

  function loadAllMedicines() {
    get<{ medicines: MedicineRow[] }>('/medicines')
      .then((d) => setAllMedicines(d.medicines))
      .catch(() => {});
  }

  function loadCategories() {
    get<{ categories: Category[] }>('/medicine-categories')
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }

  useEffect(() => {
    loadMedicines(1, query);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(loadAllMedicines, []);
  useEffect(loadCategories, []);

  function goToPage(nextPage: number) {
    setPage(nextPage);
    loadMedicines(nextPage, query);
  }

  function refreshAfterChange() {
    loadMedicines(page, query);
    loadAllMedicines();
  }

  function closeCategoryPicker() {
    setAddingCategory(false);
    setNewCategoryName('');
    setCategoryStatus(null);
  }

  function startAdd() {
    setEditingId(null);
    setEditingBatchCode(null);
    setEditingStock(null);
    setMedicineForm(EMPTY_MEDICINE);
    setFormStatus(null);
    closeCategoryPicker();
    setShowMedicineForm(true);
  }

  function startEdit(m: MedicineRow) {
    setEditingId(m.id);
    setEditingBatchCode(m.medical_code);
    setEditingStock({ total_remaining: m.total_remaining, base_unit: m.base_unit });
    setMedicineForm({
      ...EMPTY_MEDICINE,
      name: m.name,
      categoryId: m.category_id != null ? String(m.category_id) : '',
      baseUnit: m.base_unit,
      priceRupees: (m.price_cents / 100).toFixed(2),
      minimumStock: String(m.minimum_stock),
      reorderPoint: String(m.reorder_point),
    });
    setFormStatus(null);
    closeCategoryPicker();
    setShowMedicineForm(true);
  }

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY_VALUE) {
      setAddingCategory(true);
      setNewCategoryName('');
      setCategoryStatus(null);
      return;
    }
    setMedicineForm((f) => ({ ...f, categoryId: value }));
  }

  // Not a nested <form> (it lives inside the medicine form) -- called from
  // the Add button's click and from Enter in the text field.
  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    setCategoryStatus(null);
    try {
      const res = await mutate<{ category: Category }>('/medicine-categories', 'POST', { name });
      setCategories((prev) =>
        prev.some((c) => c.id === res.category.id) ? prev : [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setMedicineForm((f) => ({ ...f, categoryId: String(res.category.id) }));
      closeCategoryPicker();
    } catch (err) {
      setCategoryStatus(describeError(err, 'add this category'));
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleMedicineSubmit(e: FormEvent) {
    e.preventDefault();
    setFormStatus(null);
    const payload = {
      name: medicineForm.name,
      categoryId: medicineForm.categoryId ? Number(medicineForm.categoryId) : null,
      baseUnit: medicineForm.baseUnit,
      packSize: Number(medicineForm.packSize) || 1,
      conversionFactor: Number(medicineForm.conversionFactor) || 1,
      priceCents: Math.round(Number(medicineForm.priceRupees) * 100),
      minimumStock: Number(medicineForm.minimumStock) || 0,
      reorderPoint: Number(medicineForm.reorderPoint) || 0,
    };
    try {
      if (editingId) {
        await mutate(`/medicines/${editingId}`, 'PATCH', payload);
      } else {
        const created = await mutate<{ id: number }>('/medicines', 'POST', payload);
        // Optional: give it starting stock in the same step, so a newly
        // added medicine doesn't sit at 0 until a separate "Receive stock" visit.
        if (medicineForm.initialLotNumber && medicineForm.initialExpiryDate && medicineForm.initialQuantity) {
          await mutate(`/medicines/${created.id}/batches`, 'POST', {
            lotNumber: medicineForm.initialLotNumber,
            expiryDate: medicineForm.initialExpiryDate,
            quantityReceived: Number(medicineForm.initialQuantity),
          });
        }
      }
      setShowMedicineForm(false);
      setEditingId(null);
      refreshAfterChange();
    } catch (err) {
      setFormStatus(describeError(err, editingId ? 'save changes' : 'add this medicine'));
    }
  }

  // Throws on failure so ConfirmDelete shows why and keeps its panel open.
  async function deleteMedicine(id: number) {
    setRowStatus(null);
    await mutate(`/medicines/${id}/delete`, 'POST');
    if (editingId === id) setShowMedicineForm(false);
    refreshAfterChange();
  }

  function cancelReceive() {
    setShowReceive(false);
    setReceiveMedicineId('');
    setLotNumber('');
    setExpiryDate('');
    setQuantityReceived('');
    setReceiveStatus(null);
  }

  async function handleReceiveStock(e: FormEvent) {
    e.preventDefault();
    setReceiveStatus(null);
    if (!receiveMedicineId) {
      setReceiveStatus('Select a medicine first.');
      return;
    }
    try {
      await mutate(`/medicines/${receiveMedicineId}/batches`, 'POST', {
        lotNumber,
        expiryDate,
        quantityReceived: Number(quantityReceived),
      });
      cancelReceive();
      refreshAfterChange();
    } catch (err) {
      setReceiveStatus(describeError(err, 'receive stock'));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Medicine inventory</h1>
          <p>Stock is pulled first from whichever batch expires soonest.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canAdjustStock && (
            <button className="btn" onClick={() => (showReceive ? cancelReceive() : setShowReceive(true))}>
              Receive stock
            </button>
          )}
          {canManageMedicine && (
            <button className="btn btn-primary" onClick={startAdd}>
              Add medicine
            </button>
          )}
        </div>
      </div>

      {showMedicineForm && (
        <form onSubmit={handleMedicineSubmit} className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit medicine' : 'Add medicine'}</h3>
          {editingStock && (
            <p style={{ marginTop: -8, marginBottom: 16, color: 'var(--color-ink-soft)', fontSize: 13 }}>
              Current stock: <strong>{editingStock.total_remaining} {editingStock.base_unit}</strong> — use "Receive
              stock" to add more.
            </p>
          )}
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Name</label>
              <input
                value={medicineForm.name}
                onChange={(e) => setMedicineForm((f) => ({ ...f, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            {editingId && (
              <div className="field">
                <label>Batch code</label>
                <input value={editingBatchCode ?? ''} disabled style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
            )}
            <div className="field">
              <label>Category</label>
              <select
                value={addingCategory ? NEW_CATEGORY_VALUE : medicineForm.categoryId}
                onChange={(e) => handleCategorySelect(e.target.value)}
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>+ Add new category…</option>
              </select>
              {addingCategory && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Ointment"
                    autoFocus
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addCategory}
                    disabled={savingCategory || !newCategoryName.trim()}
                  >
                    {savingCategory ? 'Adding…' : 'Add'}
                  </button>
                  <button type="button" className="btn" onClick={closeCategoryPicker}>
                    Cancel
                  </button>
                </div>
              )}
              <ErrorMessage error={categoryStatus} style={{ marginTop: 6, marginBottom: 0 }} />
            </div>
            <div className="field">
              <label>Unit</label>
              <select
                value={medicineForm.baseUnit}
                onChange={(e) => setMedicineForm((f) => ({ ...f, baseUnit: e.target.value }))}
                required
              >
                {(UNIT_OPTIONS.includes(medicineForm.baseUnit) ? UNIT_OPTIONS : [medicineForm.baseUnit, ...UNIT_OPTIONS]).map(
                  (u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="field">
              <label>Price per unit (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={medicineForm.priceRupees}
                onChange={(e) => setMedicineForm((f) => ({ ...f, priceRupees: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label>Minimum stock</label>
              <input
                type="number"
                min="0"
                value={medicineForm.minimumStock}
                onChange={(e) => setMedicineForm((f) => ({ ...f, minimumStock: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Reorder point</label>
              <input
                type="number"
                min="0"
                value={medicineForm.reorderPoint}
                onChange={(e) => setMedicineForm((f) => ({ ...f, reorderPoint: e.target.value }))}
              />
            </div>

            {!editingId && (
              <>
                <div className="form-section-title">Starting stock</div>
                <div className="field">
                  <label>Lot number</label>
                  <input
                    value={medicineForm.initialLotNumber}
                    onChange={(e) => setMedicineForm((f) => ({ ...f, initialLotNumber: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Expiry date</label>
                  <input
                    type="date"
                    value={medicineForm.initialExpiryDate}
                    onChange={(e) => setMedicineForm((f) => ({ ...f, initialExpiryDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={medicineForm.initialQuantity}
                    onChange={(e) => setMedicineForm((f) => ({ ...f, initialQuantity: e.target.value }))}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <ErrorMessage error={formStatus} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Save medicine'}
            </button>
            <button type="button" className="btn" onClick={() => setShowMedicineForm(false)}>
              Cancel
            </button>
            {editingId && (
              <span style={{ marginLeft: 'auto' }}>
                <ConfirmDelete
                  what="medicine"
                  triggerLabel="Delete medicine"
                  onDelete={() => deleteMedicine(editingId)}
                  align="right"
                />
              </span>
            )}
          </div>
        </form>
      )}

      {showReceive && (
        <form onSubmit={handleReceiveStock} className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
          <h3 style={{ marginTop: 0 }}>Receive stock</h3>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Medicine</label>
              <MedicineCombobox medicines={allMedicines} value={receiveMedicineId} onChange={setReceiveMedicineId} />
            </div>
            <div className="field">
              <label>Lot number</label>
              <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} required />
            </div>
            <div className="field">
              <label>Expiry date</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
            </div>
            <div className="field">
              <label>Quantity received</label>
              <input
                type="number"
                min="1"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                required
              />
            </div>
          </div>
          <ErrorMessage error={receiveStatus} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary">
              Add to stock
            </button>
            <button type="button" className="btn" onClick={cancelReceive}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          style={{ width: '100%', maxWidth: 360 }}
          placeholder="Search by name or batch code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="btn" onClick={() => setQuery('')}>
            Clear
          </button>
        )}
        {!loading && (
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 13, marginLeft: 'auto' }}>
            {total} medicine{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <ErrorMessage error={error} />
      <ErrorMessage error={rowStatus} />

      <table className="data-table">
        <thead>
          <tr>
            <th>Batch code</th>
            <th>Medicine</th>
            <th>Category</th>
            <th>Price</th>
            <th style={{ textAlign: 'right' }}>Stock</th>
            <th>Unit</th>
            <th style={{ textAlign: 'right' }}>Reorder at</th>
            <th style={{ textAlign: 'right' }}>Minimum</th>
            <th>Expiry</th>
            {canManageMedicine && <th></th>}
          </tr>
        </thead>
        <tbody>
          {medicines.map((m) => {
            const status = statusOf(m);
            return (
              <tr key={m.id} className={status === 'critical' ? 'row-critical' : status === 'warning' ? 'row-warning' : ''}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{m.medical_code}</td>
                <td>{m.name}</td>
                <td>{m.category_name ?? '—'}</td>
                <td className="num">{formatRupees(m.price_cents)}</td>
                <td className="num">{m.total_remaining}</td>
                <td>{m.base_unit}</td>
                <td className="num">{m.reorder_point}</td>
                <td className="num">{m.minimum_stock}</td>
                <td style={expiryStyle(m.nearest_expiry)}>{m.nearest_expiry ?? '—'}</td>
                {canManageMedicine && (
                  <td>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="btn-text" onClick={() => startEdit(m)}>
                        Edit
                      </button>
                      <ConfirmDelete what="medicine" onDelete={() => deleteMedicine(m.id)} align="right" />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {!loading && medicines.length === 0 && (
            <tr>
              <td colSpan={canManageMedicine ? 10 : 9} style={{ color: 'var(--color-ink-soft)', textAlign: 'center' }}>
                {query ? `No medicines match "${query}".` : 'No medicines yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={goToPage} />
    </div>
  );
}

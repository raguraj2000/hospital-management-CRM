import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { Pagination } from '../components/Pagination.js';
import { formatRupees, rupeesToCents } from '../lib/money.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { PrescriptionsToGive } from '../components/PrescriptionsToGive.js';

interface Medicine {
  id: number;
  name: string;
  medical_code: string | null;
  base_unit: string;
  price_cents: number;
  total_remaining: number;
  nearest_expiry: string | null;
  category_name: string | null;
}

interface CartLine {
  medicine: Medicine;
  quantity: number;
}

interface Summary {
  today: { count: number; totalCents: number; byMode: { payment_mode: string; count: number; total_cents: number }[] };
  expiringCount: number;
  expiredCount: number;
  days: number;
}

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const PRINT_AFTER_KEY = 'clinic.pharmacy.printAfterSale';

type Tab = 'prescriptions' | 'sale' | 'history' | 'expiring';

function isoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysFromToday(date: string): number {
  return Math.round((new Date(date + 'T00:00:00').getTime() - new Date(isoDate() + 'T00:00:00').getTime()) / 86_400_000);
}

export function Pharmacy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canSell = useHasPermission('dispense.create');
  const tab: Tab = (searchParams.get('tab') as Tab) || (canSell ? 'prescriptions' : 'expiring');
  const [summary, setSummary] = useState<Summary | null>(null);

  function loadSummary() {
    get<Summary>('/pharmacy/summary')
      .then(setSummary)
      .catch(() => {});
  }
  useEffect(loadSummary, []);

  function setTab(next: Tab) {
    setSearchParams({ tab: next });
  }

  const byMode = (mode: string) => summary?.today.byMode.find((m) => m.payment_mode === mode)?.total_cents ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pharmacy</h1>
          <p>Doctors' prescriptions to give, counter sales, receipts and expiring stock.</p>
        </div>
      </div>

      {summary && (summary.expiringCount > 0 || summary.expiredCount > 0) && (
        <div className="alert alert-critical" style={{ marginBottom: 16 }}>
          <strong>Expiry alert:</strong>{' '}
          {summary.expiredCount > 0 && `${summary.expiredCount} batch${summary.expiredCount === 1 ? '' : 'es'} already expired`}
          {summary.expiredCount > 0 && summary.expiringCount > 0 && ', '}
          {summary.expiringCount > 0 &&
            `${summary.expiringCount} batch${summary.expiringCount === 1 ? '' : 'es'} expiring within ${summary.days} days`}
          .{' '}
          <button className="btn-text" onClick={() => setTab('expiring')}>
            See them
          </button>
        </div>
      )}

      {canSell && summary && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile positive">
            <div className="stat-value">{formatRupees(summary.today.totalCents)}</div>
            <div className="stat-label">Sales today ({summary.today.count} bill{summary.today.count === 1 ? '' : 's'})</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{formatRupees(byMode('cash'))}</div>
            <div className="stat-label">Cash</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{formatRupees(byMode('upi') + byMode('card') + byMode('other'))}</div>
            <div className="stat-label">UPI / Card / Other</div>
          </div>
        </div>
      )}

      <div className="tabs">
        {canSell && (
          <button className={tab === 'prescriptions' ? 'tab active' : 'tab'} onClick={() => setTab('prescriptions')}>
            Prescriptions to give
          </button>
        )}
        {canSell && (
          <button className={tab === 'sale' ? 'tab active' : 'tab'} onClick={() => setTab('sale')}>
            New sale
          </button>
        )}
        {canSell && (
          <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>
            Sales history
          </button>
        )}
        <button className={tab === 'expiring' ? 'tab active' : 'tab'} onClick={() => setTab('expiring')}>
          Expiring soon
          {summary && summary.expiringCount + summary.expiredCount > 0 && (
            <span className="count-badge">{summary.expiringCount + summary.expiredCount}</span>
          )}
        </button>
      </div>

      {tab === 'prescriptions' && canSell && <PrescriptionsToGive />}
      {tab === 'sale' && canSell && <NewSale onSold={loadSummary} />}
      {tab === 'history' && canSell && <SalesHistory />}
      {tab === 'expiring' && <ExpiringStock />}
    </div>
  );
}

// --- New sale (POS) ----------------------------------------------------------

function NewSale({ onSold }: { onSold: () => void }) {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [received, setReceived] = useState('');
  const [printAfter, setPrintAfter] = useState(() => {
    try {
      return localStorage.getItem(PRINT_AFTER_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get<{ medicines: Medicine[] }>('/medicines')
      .then((d) => setMedicines(d.medicines))
      .catch((err) => setError(describeError(err, 'load medicines')));
  }, []);

  const categories = useMemo(
    () => [...new Set(medicines.map((m) => m.category_name).filter(Boolean) as string[])].sort(),
    [medicines],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return medicines
      .filter((m) => !category || m.category_name === category)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.medical_code ?? '').toLowerCase().includes(q))
      .slice(0, 12);
  }, [medicines, query, category]);

  function addToCart(m: Medicine) {
    setError(null);
    if (m.total_remaining <= 0) {
      setError(`${m.name} is out of stock.`);
      return;
    }
    setCart((c) => {
      const existing = c.find((l) => l.medicine.id === m.id);
      if (existing) {
        return c.map((l) => (l.medicine.id === m.id ? { ...l, quantity: Math.min(l.quantity + 1, m.total_remaining) } : l));
      }
      return [...c, { medicine: m, quantity: 1 }];
    });
    setQuery('');
    searchRef.current?.focus();
  }

  // A barcode scanner types the code and presses Enter: an exact batch-code
  // match wins, otherwise the single remaining match is added.
  function onSearchEnter() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = medicines.find((m) => (m.medical_code ?? '').toLowerCase() === q);
    if (exact) return addToCart(exact);
    if (matches.length === 1) return addToCart(matches[0]);
    if (matches.length === 0) setError(`No medicine matches "${query}".`);
  }

  function setQty(id: number, quantity: number) {
    setCart((c) =>
      c.map((l) => (l.medicine.id === id ? { ...l, quantity: Math.max(1, Math.min(quantity, l.medicine.total_remaining)) } : l)),
    );
  }

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.medicine.price_cents, 0);
  const discountCents = Math.min(rupeesToCents(discount), subtotal);
  const total = subtotal - discountCents;
  const receivedCents = rupeesToCents(received);
  const change = received ? receivedCents - total : 0;

  async function completeSale() {
    if (cart.length === 0) return;
    if (paymentMode === 'cash' && received && receivedCents < total) {
      setError(`Amount received (${formatRupees(receivedCents)}) is less than the total (${formatRupees(total)}).`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await mutate<{ id: number; receiptNumber: string }>('/pharmacy/sales', 'POST', {
        items: cart.map((l) => ({ medicineId: l.medicine.id, quantity: l.quantity })),
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        discountCents,
        paymentMode,
        amountReceivedCents: received ? receivedCents : null,
      });
      onSold();
      navigate(`/pharmacy/sales/${res.id}${printAfter ? '?print=1' : ''}`);
    } catch (err) {
      setError(describeError(err, 'complete this sale'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pos-layout">
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            ref={searchRef}
            className="input"
            style={{ flex: 1 }}
            placeholder="Search medicine or scan batch code, then Enter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchEnter();
              }
            }}
            autoFocus
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input" style={{ width: 170 }}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Code</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const days = m.nearest_expiry ? daysFromToday(m.nearest_expiry) : null;
              return (
                <tr key={m.id}>
                  <td>
                    {m.name}
                    {m.category_name && <span style={{ color: 'var(--color-ink-soft)', fontSize: 12 }}> · {m.category_name}</span>}
                    {days !== null && days <= 30 && (
                      <div style={{ color: 'var(--color-critical)', fontSize: 12 }}>
                        {days < 0 ? 'Has expired stock' : `Expires in ${days} day${days === 1 ? '' : 's'}`}
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.medical_code}</td>
                  <td className="num">{formatRupees(m.price_cents)}</td>
                  <td className="num" style={{ color: m.total_remaining <= 0 ? 'var(--color-critical)' : undefined }}>
                    {m.total_remaining} {m.base_unit}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn" onClick={() => addToCart(m)} disabled={m.total_remaining <= 0}>
                      Add
                    </button>
                  </td>
                </tr>
              );
            })}
            {matches.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-ink-soft)' }}>
                  No medicines match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card pos-cart">
        <h3 style={{ marginTop: 0 }}>Bill</h3>
        {cart.length === 0 ? (
          <p style={{ color: 'var(--color-ink-soft)' }}>Add medicines from the list.</p>
        ) : (
          <table className="data-table" style={{ marginBottom: 12 }}>
            <tbody>
              {cart.map((l) => (
                <tr key={l.medicine.id}>
                  <td>
                    {l.medicine.name}
                    <div style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>{formatRupees(l.medicine.price_cents)} each</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn qty-btn" onClick={() => setQty(l.medicine.id, l.quantity - 1)} aria-label="Less">
                      −
                    </button>
                    <input
                      value={l.quantity}
                      onChange={(e) => setQty(l.medicine.id, Number(e.target.value) || 1)}
                      style={{ width: 48, textAlign: 'center', margin: '0 4px' }}
                    />
                    <button className="btn qty-btn" onClick={() => setQty(l.medicine.id, l.quantity + 1)} aria-label="More">
                      +
                    </button>
                  </td>
                  <td className="num">{formatRupees(l.quantity * l.medicine.price_cents)}</td>
                  <td>
                    <button className="btn-text" onClick={() => setCart((c) => c.filter((x) => x.medicine.id !== l.medicine.id))}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="form-grid">
          <div className="field">
            <label>Customer name (optional)</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
        </div>

        <div className="invoice-total-row">
          <span>Subtotal</span>
          <span>{formatRupees(subtotal)}</span>
        </div>
        <div className="invoice-total-row">
          <span>Discount (₹)</span>
          <input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" style={{ width: 100, textAlign: 'right' }} />
        </div>
        <div className="invoice-total-row invoice-grand-total">
          <span>Total</span>
          <span>{formatRupees(total)}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
          {PAYMENT_MODES.map((p) => (
            <button
              key={p.value}
              className={paymentMode === p.value ? 'btn btn-primary' : 'btn'}
              onClick={() => setPaymentMode(p.value)}
              style={{ flex: 1 }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {paymentMode === 'cash' && (
          <div className="invoice-total-row">
            <span>Amount received (₹)</span>
            <input value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0" style={{ width: 100, textAlign: 'right' }} />
          </div>
        )}
        {paymentMode === 'cash' && received && (
          <div className="invoice-total-row" style={{ fontWeight: 700, color: change < 0 ? 'var(--color-critical)' : 'var(--color-positive)' }}>
            <span>{change < 0 ? 'Still to pay' : 'Change to give'}</span>
            <span>{formatRupees(Math.abs(change))}</span>
          </div>
        )}

        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, margin: '12px 0' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={printAfter}
            onChange={(e) => {
              setPrintAfter(e.target.checked);
              try {
                localStorage.setItem(PRINT_AFTER_KEY, e.target.checked ? '1' : '0');
              } catch {
                // remembered for this session only
              }
            }}
          />
          Print receipt after sale
        </label>

        <ErrorMessage error={error} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={completeSale} disabled={saving || cart.length === 0}>
            {saving ? 'Saving…' : `Complete sale · ${formatRupees(total)}`}
          </button>
          {cart.length > 0 && (
            <button
              className="btn"
              onClick={() => {
                setCart([]);
                setDiscount('');
                setReceived('');
                setError(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sales history -----------------------------------------------------------

interface SaleRow {
  id: number;
  receipt_number: string;
  sold_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_cents: number;
  payment_mode: string;
  voided_at: string | null;
  sold_by_name: string | null;
  item_count: number;
}

const HISTORY_PAGE_SIZE = 20;

function SalesHistory() {
  const [from, setFrom] = useState(isoDate());
  const [to, setTo] = useState(isoDate());
  const [paymentMode, setPaymentMode] = useState('');
  const [q, setQ] = useState('');
  const [includeVoided, setIncludeVoided] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ sales: SaleRow[]; total: number; totalCents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(HISTORY_PAGE_SIZE) });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (paymentMode) params.set('paymentMode', paymentMode);
    if (q.trim()) params.set('q', q.trim());
    if (includeVoided) params.set('includeVoided', '1');
    get<{ sales: SaleRow[]; total: number; totalCents: number }>(`/pharmacy/sales?${params}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load sales')));
  }, [from, to, paymentMode, q, includeVoided, page]);

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div>
      <div className="filter-bar">
        <label>
          From <input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </label>
        <label>
          To <input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </label>
        <select value={paymentMode} onChange={(e) => resetPage(setPaymentMode)(e.target.value)} className="input">
          <option value="">All payments</option>
          {PAYMENT_MODES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Receipt no., customer or phone"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={includeVoided} onChange={(e) => resetPage(setIncludeVoided)(e.target.checked)} />
          Show cancelled
        </label>
        <button
          className="btn-text"
          onClick={() => {
            setFrom('');
            setTo('');
            setPaymentMode('');
            setQ('');
            setIncludeVoided(false);
            setPage(1);
          }}
        >
          All dates
        </button>
      </div>

      <ErrorMessage error={error} />
      {data && (
        <p style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
          {data.total} sale{data.total === 1 ? '' : 's'} · total <strong>{formatRupees(data.totalCents)}</strong>
          {includeVoided ? ' (cancelled sales not counted)' : ''}
        </p>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Receipt</th>
            <th>Date &amp; time</th>
            <th>Customer</th>
            <th style={{ textAlign: 'right' }}>Items</th>
            <th>Payment</th>
            <th style={{ textAlign: 'right' }}>Total</th>
            <th>Sold by</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data?.sales.map((s) => (
            <tr key={s.id} style={s.voided_at ? { opacity: 0.55, textDecoration: 'line-through' } : undefined}>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{s.receipt_number}</td>
              <td>{s.sold_at}</td>
              <td>
                {s.customer_name ?? '—'}
                {s.customer_phone ? <span style={{ color: 'var(--color-ink-soft)' }}> · {s.customer_phone}</span> : null}
              </td>
              <td className="num">{s.item_count}</td>
              <td style={{ textTransform: 'uppercase', fontSize: 12 }}>{s.payment_mode}</td>
              <td className="num">{formatRupees(s.total_cents)}</td>
              <td>{s.sold_by_name ?? '—'}</td>
              <td style={{ textAlign: 'right', textDecoration: 'none' }}>
                <Link to={`/pharmacy/sales/${s.id}`} className="btn-text" style={{ textDecoration: 'none' }}>
                  {s.voided_at ? 'View' : 'View / print'}
                </Link>
              </td>
            </tr>
          ))}
          {data && data.sales.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-ink-soft)' }}>
                No sales match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {data && <Pagination page={page} pageSize={HISTORY_PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}

// --- Expiring soon -----------------------------------------------------------

interface ExpiringRow {
  batch_id: number;
  lot_number: string;
  expiry_date: string;
  quantity_remaining: number;
  medicine_id: number;
  medicine_name: string;
  medical_code: string | null;
  base_unit: string;
  category_name: string | null;
  expired: boolean;
  days_left: number;
}

function ExpiringStock() {
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ExpiringRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<{ batches: ExpiringRow[] }>(`/pharmacy/expiring?days=${days}`)
      .then((d) => {
        setRows(d.batches);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load expiring stock')));
  }, [days]);

  const categories = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.category_name).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const shown = (rows ?? []).filter(
    (r) =>
      (!category || r.category_name === category) &&
      (!q.trim() ||
        r.medicine_name.toLowerCase().includes(q.trim().toLowerCase()) ||
        (r.medical_code ?? '').toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <div>
      <div className="filter-bar">
        <label>
          Expiring within{' '}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input">
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Search medicine or code" value={q} onChange={(e) => setQ(e.target.value)} />
        <Link to="/inventory" className="btn-text" style={{ marginLeft: 'auto' }}>
          Open inventory →
        </Link>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
        Expired stock is never sold or dispensed automatically — remove it from the shelf and write it off in Inventory.
      </p>
      <ErrorMessage error={error} />
      <table className="data-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Batch code</th>
            <th>Lot</th>
            <th>Category</th>
            <th>Expiry</th>
            <th style={{ textAlign: 'right' }}>Days left</th>
            <th style={{ textAlign: 'right' }}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.batch_id} className={r.expired ? 'row-critical' : ''}>
              <td>{r.medicine_name}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.medical_code}</td>
              <td>{r.lot_number}</td>
              <td>{r.category_name ?? '—'}</td>
              <td style={{ color: 'var(--color-critical)', fontWeight: r.expired ? 700 : 400 }}>{r.expiry_date}</td>
              <td className="num" style={{ color: 'var(--color-critical)', fontWeight: r.expired ? 700 : 400 }}>
                {r.expired ? `Expired ${Math.abs(r.days_left)}d ago` : r.days_left}
              </td>
              <td className="num">
                {r.quantity_remaining} {r.base_unit}
              </td>
            </tr>
          ))}
          {rows && shown.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-ink-soft)' }}>
                Nothing expiring within {days} days.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { formatRupees } from '../lib/money.js';
import { formatDateTime } from '../lib/datetime.js';

export interface VendorRow {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  credit_days: number;
  notes: string | null;
  is_active: number;
  bill_count: number;
  pending_cents: number;
  overdue_cents: number;
}

export interface PurchaseBillRow {
  id: number;
  vendor_name: string;
  vendor_bill_number: string | null;
  bill_date: string;
  due_date: string | null;
  line_count: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: 'paid' | 'part_paid' | 'pending' | 'cancelled';
  overdue: boolean;
}

export function VendorBillBadge({ status, overdue }: { status: PurchaseBillRow['status']; overdue: boolean }) {
  if (status === 'cancelled') return <span className="badge badge-neutral">Cancelled</span>;
  if (status === 'paid') return <span className="badge badge-positive">Paid</span>;
  if (overdue) return <span className="badge badge-critical">Overdue</span>;
  if (status === 'part_paid') return <span className="badge badge-warning">Part paid</span>;
  return <span className="badge badge-warning">Pending</span>;
}

const EMPTY_VENDOR = { name: '', phone: '', address: '', creditDays: '0', notes: '', isActive: true };

function VendorForm({ vendor, onDone }: { vendor: VendorRow | null; onDone: (saved: boolean) => void }) {
  const [f, setF] = useState(
    vendor
      ? {
          name: vendor.name,
          phone: vendor.phone ?? '',
          address: vendor.address ?? '',
          creditDays: String(vendor.credit_days),
          notes: vendor.notes ?? '',
          isActive: vendor.is_active === 1,
        }
      : EMPTY_VENDOR,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      name: f.name.trim(),
      phone: f.phone.trim() || null,
      address: f.address.trim() || null,
      creditDays: Number(f.creditDays) || 0,
      notes: f.notes.trim() || null,
      isActive: f.isActive,
    };
    try {
      if (vendor) await mutate(`/vendors/${vendor.id}`, 'PATCH', body);
      else await mutate('/vendors', 'POST', body);
      onDone(true);
    } catch (err) {
      setError(describeError(err, 'save the vendor'));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card" style={{ marginBottom: 16, maxWidth: 760 }}>
      <h3 style={{ marginTop: 0 }}>{vendor ? `Edit ${vendor.name}` : 'New vendor'}</h3>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="v-name">Vendor name</label>
          <input id="v-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="v-phone">Phone</label>
          <input id="v-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="v-address">Address</label>
          <input id="v-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="v-credit">Credit days (pay within)</label>
          <input id="v-credit" type="number" min="0" value={f.creditDays} onChange={(e) => setF({ ...f, creditDays: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="v-notes">Notes</label>
          <input id="v-notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
        {vendor && (
          <div className="field">
            <label>
              <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Still buying from
              this vendor
            </label>
          </div>
        )}
      </div>
      <ErrorMessage error={error} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save vendor'}
        </button>
        <button type="button" className="btn" onClick={() => onDone(false)} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function VendorList() {
  const canManage = useHasPermission('supplier.manage');
  const [vendors, setVendors] = useState<VendorRow[] | null>(null);
  const [editing, setEditing] = useState<VendorRow | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    get<{ vendors: VendorRow[] }>('/vendors')
      .then((d) => setVendors(d.vendors))
      .catch((err) => setError(describeError(err, 'load vendors')));
  }
  useEffect(load, []);

  return (
    <div>
      {canManage && !editing && (
        <button className="btn" style={{ marginBottom: 12 }} onClick={() => setEditing('new')}>
          + Add vendor
        </button>
      )}
      {editing && (
        <VendorForm
          vendor={editing === 'new' ? null : editing}
          onDone={(saved) => {
            setEditing(null);
            if (saved) load();
          }}
        />
      )}
      <ErrorMessage error={error} />
      {vendors && vendors.length === 0 && <p style={{ color: 'var(--color-ink-soft)' }}>No vendors yet. Add the distributors you buy from.</p>}
      {vendors && vendors.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Phone</th>
              <th style={{ textAlign: 'right' }}>Credit days</th>
              <th style={{ textAlign: 'right' }}>Bills</th>
              <th style={{ textAlign: 'right' }}>Pending</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} style={v.is_active ? undefined : { opacity: 0.55 }}>
                <td>
                  <strong>{v.name}</strong>
                  {v.address && <div style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>{v.address}</div>}
                </td>
                <td>{v.phone ?? '—'}</td>
                <td className="num">{v.credit_days}</td>
                <td className="num">{v.bill_count}</td>
                <td className="num">
                  {formatRupees(v.pending_cents)}
                  {v.overdue_cents > 0 && (
                    <span className="badge badge-critical" style={{ marginLeft: 6 }}>
                      {formatRupees(v.overdue_cents)} overdue
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Link to={`/vendors?tab=bills&vendor=${v.id}`} className="btn-text" style={{ marginRight: 10 }}>
                    Bills
                  </Link>
                  {canManage && (
                    <button className="btn-text" onClick={() => setEditing(v)} disabled={!!editing}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PurchaseBillList({ vendorId }: { vendorId: string | null }) {
  const [bills, setBills] = useState<PurchaseBillRow[] | null>(null);
  const [unpaidOnly, setUnpaidOnly] = useState(!vendorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (vendorId) params.set('supplierId', vendorId);
    if (unpaidOnly) params.set('unpaid', '1');
    get<{ bills: PurchaseBillRow[] }>(`/vendors/purchases?${params}`)
      .then((d) => setBills(d.bills))
      .catch((err) => setError(describeError(err, 'load purchase bills')));
  }, [vendorId, unpaidOnly]);

  return (
    <div>
      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)} /> Only bills still to pay
      </label>
      {vendorId && (
        <Link to="/vendors?tab=bills" className="btn-text" style={{ marginLeft: 16 }}>
          Show all vendors
        </Link>
      )}
      <ErrorMessage error={error} />
      {bills && bills.length === 0 && <p style={{ color: 'var(--color-ink-soft)' }}>No purchase bills here.</p>}
      {bills && bills.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill date</th>
              <th>Vendor</th>
              <th>Vendor bill no.</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} className={b.overdue ? 'row-critical' : undefined}>
                <td>{formatDateTime(b.bill_date)}</td>
                <td>{b.vendor_name}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{b.vendor_bill_number ?? '—'}</td>
                <td className="num">{formatRupees(b.totalCents)}</td>
                <td className="num">{formatRupees(b.balanceCents)}</td>
                <td>{formatDateTime(b.due_date)}</td>
                <td>
                  <VendorBillBadge status={b.status} overdue={b.overdue} />
                </td>
                <td>
                  <Link to={`/vendors/purchases/${b.id}`} className="btn-text">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Vendors: who we buy medicines from, their bills, and what we still owe. */
export function Vendors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'bills' ? 'bills' : 'vendors';
  const canReceive = useHasPermission('inventory.adjust');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vendors</h1>
          <p>Distributors we buy medicines from, their bills, and payments due.</p>
        </div>
        {canReceive && (
          <Link to="/vendors/purchases/new" className="btn btn-primary">
            Receive stock from vendor
          </Link>
        )}
      </div>
      <div className="tabs">
        <button className={tab === 'vendors' ? 'tab active' : 'tab'} onClick={() => setSearchParams({})}>
          Vendors
        </button>
        <button className={tab === 'bills' ? 'tab active' : 'tab'} onClick={() => setSearchParams({ tab: 'bills' })}>
          Purchase bills
        </button>
      </div>
      {tab === 'vendors' ? <VendorList /> : <PurchaseBillList vendorId={searchParams.get('vendor')} />}
    </div>
  );
}

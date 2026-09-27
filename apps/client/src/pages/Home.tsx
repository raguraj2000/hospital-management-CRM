import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api/client.js';
import { getSessionUser } from '../state/auth-store.js';
import { useHasPermission } from '../state/permissions.js';

interface Summary {
  lowStockCount: number | null;
  dispensesToday: number | null;
  activePatients: number | null;
}

interface LowStockMedicine {
  id: number;
  name: string;
  minimum_stock: number;
  reorder_point: number;
  total_remaining: number;
}

interface ExpiringBatch {
  batch_id: number;
  medicine_name: string;
  expiry_date: string;
  quantity_remaining: number;
  base_unit: string;
  expired: boolean;
  days_left: number;
}

interface StaffRow {
  id: number;
  full_name: string;
  role_name: string;
}

export function Home() {
  const user = getSessionUser();
  const canAddPatient = useHasPermission('patient.create');
  const canViewSettings =
    useHasPermission('auditLog.view') ||
    useHasPermission('user.manage') ||
    useHasPermission('backup.configure') ||
    useHasPermission('lab.manageTests');

  const [summary, setSummary] = useState<Summary>({ lowStockCount: null, dispensesToday: null, activePatients: null });
  const [criticalMedicines, setCriticalMedicines] = useState<LowStockMedicine[] | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<StaffRow[] | null>(null);
  const canSeeInventory = useHasPermission('inventory.view');
  const canManageVendors = useHasPermission('supplier.manage');
  const [vendorOverdue, setVendorOverdue] = useState<{ overdueBills: number; overdueCents: number } | null>(null);
  const [expiring, setExpiring] = useState<ExpiringBatch[] | null>(null);

  useEffect(() => {
    // Stock numbers only for staff who can see inventory (not e.g. the lab technician).
    if (canSeeInventory) {
      get<{ lowStock: LowStockMedicine[] }>('/medicines/low-stock')
        .then((d) => {
          setSummary((s) => ({ ...s, lowStockCount: d.lowStock.length }));
          setCriticalMedicines(d.lowStock);
        })
        .catch(() => setCriticalMedicines([]));
      get<{ count: number }>('/dispense/today-summary')
        .then((d) => setSummary((s) => ({ ...s, dispensesToday: d.count })))
        .catch(() => {});
    } else {
      setCriticalMedicines([]);
    }
    get<{ activeCount: number }>('/patients/summary')
      .then((d) => setSummary((s) => ({ ...s, activePatients: d.activeCount })))
      .catch(() => {});
    get<{ staff: StaffRow[] }>('/staff')
      .then((d) => setAvailableDoctors(d.staff.filter((s) => s.role_name === 'doctor')))
      .catch(() => setAvailableDoctors([]));
    if (canManageVendors) {
      get<{ overdueBills: number; overdueCents: number }>('/vendors/summary')
        .then(setVendorOverdue)
        .catch(() => {});
    }
    if (canSeeInventory) {
      get<{ batches: ExpiringBatch[] }>('/pharmacy/expiring?days=30')
        .then((d) => setExpiring(d.batches))
        .catch(() => setExpiring([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            {greeting}, {user?.fullName?.split(' ')[0] ?? 'there'}
          </h1>
          <p>Here's what's happening at Aadhi Hospital right now.</p>
        </div>
      </div>

      {vendorOverdue && vendorOverdue.overdueBills > 0 && (
        <div className="alert alert-critical">
          <strong>Vendor payments overdue:</strong> {vendorOverdue.overdueBills} bill{vendorOverdue.overdueBills === 1 ? '' : 's'},{' '}
          ₹{(vendorOverdue.overdueCents / 100).toFixed(2)}. <Link to="/vendors?tab=bills">See them</Link>
        </div>
      )}

      <div className="stat-grid">
        <div className={`stat-tile ${summary.lowStockCount !== null && summary.lowStockCount > 0 ? 'warning' : 'positive'}`}>
          <div className="stat-value">{summary.lowStockCount ?? '—'}</div>
          <div className="stat-label">Medicines at or below minimum stock</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{summary.dispensesToday ?? '—'}</div>
          <div className="stat-label">Medicines dispensed today</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{summary.activePatients ?? '—'}</div>
          <div className="stat-label">Active patients on record</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Critical medicines</h3>
          {criticalMedicines === null && <p style={{ color: 'var(--color-ink-soft)', margin: 0 }}>Loading…</p>}
          {criticalMedicines !== null && criticalMedicines.length === 0 && (
            <p style={{ color: 'var(--color-ink-soft)', margin: 0 }}>Nothing at or below minimum stock.</p>
          )}
          {criticalMedicines !== null && criticalMedicines.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {criticalMedicines.map((m) => (
                <li key={m.id}>
                  {m.name} — {m.total_remaining} left (minimum {m.minimum_stock})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Today's available doctors</h3>
          {availableDoctors === null && <p style={{ color: 'var(--color-ink-soft)', margin: 0 }}>Loading…</p>}
          {availableDoctors !== null && availableDoctors.length === 0 && (
            <p style={{ color: 'var(--color-ink-soft)', margin: 0 }}>No doctors on record.</p>
          )}
          {availableDoctors !== null && availableDoctors.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {availableDoctors.map((d) => (
                <li key={d.id}>{d.full_name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {canSeeInventory && expiring !== null && expiring.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--color-critical)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--color-critical)' }}>
              Expiring within 30 days ({expiring.length} batch{expiring.length === 1 ? '' : 'es'})
            </h3>
            <Link to="/pharmacy?tab=expiring" className="btn-text">
              See all →
            </Link>
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {expiring.slice(0, 6).map((b) => (
              <li key={b.batch_id} style={{ color: 'var(--color-critical)', fontWeight: b.expired ? 700 : 400 }}>
                {b.medicine_name} — {b.quantity_remaining} {b.base_unit},{' '}
                {b.expired ? `expired ${Math.abs(b.days_left)} day(s) ago` : `expires ${b.expiry_date} (${b.days_left} day${b.days_left === 1 ? '' : 's'})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Quick actions</h2>
      <div className="quick-links">
        <Link to="/patients" className="quick-link">
          <div className="quick-link-title">Find a patient</div>
          <div className="quick-link-desc">Search by Customer ID or name</div>
        </Link>
        {canAddPatient && (
          <Link to="/patients/new" className="quick-link">
            <div className="quick-link-title">Register a new patient</div>
            <div className="quick-link-desc">Add identity, contact, and clinical details</div>
          </Link>
        )}
        {canSeeInventory && (
          <Link to="/pharmacy" className="quick-link">
            <div className="quick-link-title">Pharmacy counter</div>
            <div className="quick-link-desc">Sell medicine, print receipts, expiring stock</div>
          </Link>
        )}
        <Link to="/inventory" className="quick-link">
          <div className="quick-link-title">Medicine inventory</div>
          <div className="quick-link-desc">Stock levels, reorder points, and expiry</div>
        </Link>
        {canViewSettings && (
          <Link to="/settings" className="quick-link">
            <div className="quick-link-title">Settings</div>
            <div className="quick-link-desc">Staff, roles, backups, and the audit log</div>
          </Link>
        )}
      </div>
    </div>
  );
}

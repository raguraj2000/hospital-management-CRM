import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ConnectionBanner } from './components/ConnectionBanner.js';
import { Login } from './pages/Login.js';
import { Home } from './pages/Home.js';
import { PatientSearch } from './pages/PatientSearch.js';
import { AddPatient } from './pages/AddPatient.js';
import { PatientDetail } from './pages/PatientDetail.js';
import { AddPrescription } from './pages/AddPrescription.js';
import { AddLabReport } from './pages/AddLabReport.js';
import { Inventory } from './pages/Inventory.js';
import { Settings } from './pages/Settings.js';
import { Invoice } from './pages/Invoice.js';
import { Pharmacy } from './pages/Pharmacy.js';
import { SaleReceipt } from './pages/SaleReceipt.js';
import { Preferences } from './pages/Preferences.js';
import { getSessionUser, clearSession, getMustChangePassword } from './state/auth-store.js';
import { useHasPermission } from './state/permissions.js';
import { startConnectionMonitor } from './state/connection-monitor.js';
import { startThemeAutoUpdate, useThemePreference } from './state/theme.js';
import { get, mutate } from './api/client.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = getSessionUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  // Still on the default password: nothing else opens until it's changed.
  // TODO(shortcut): enforced in the app only; the server just refuses the default as a *new* password.
  if (getMustChangePassword() && location.pathname !== '/preferences') return <Navigate to="/preferences" replace />;
  return <>{children}</>;
}

/** Listens for the global 401 signal from api/client.ts and sends the user to a clean re-login instead of leaving stale pages showing per-widget "session expired" errors. */
function SessionExpiryHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    function onExpired() {
      navigate('/login', { replace: true, state: { expired: true } });
    }
    window.addEventListener('clinic:session-expired', onExpired);
    return () => window.removeEventListener('clinic:session-expired', onExpired);
  }, [navigate]);
  return null;
}

function NavLink({ to, children, badge }: { to: string; children: React.ReactNode; badge?: number }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/home' && location.pathname.startsWith(to));
  return (
    <Link to={to} className={`sidebar-link${active ? ' active' : ''}`}>
      {children}
      {badge ? <span className="count-badge" title="Batches expired or expiring within 30 days">{badge}</span> : null}
    </Link>
  );
}

function Sidebar() {
  const user = getSessionUser();
  const canAddPatient = useHasPermission('patient.create');
  const canViewAudit = useHasPermission('auditLog.view');
  const canManageUsers = useHasPermission('user.manage');
  const canConfigureBackup = useHasPermission('backup.configure');
  const canSeeInventory = useHasPermission('inventory.view');
  const location = useLocation();
  const [expiryCount, setExpiryCount] = useState(0);

  // The red number next to Pharmacy: batches already expired or expiring
  // within 30 days. Refreshed on every page change so it clears as stock is
  // written off, without polling the server in the background.
  useEffect(() => {
    if (!user || !canSeeInventory) return;
    get<{ expiringCount: number; expiredCount: number }>('/pharmacy/summary')
      .then((d) => setExpiryCount(d.expiringCount + d.expiredCount))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, canSeeInventory]);

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">AH</div>
        <div className="sidebar-brand-name">Aadhi Hospital</div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/home">Home</NavLink>
        <NavLink to="/patients">Patients</NavLink>
        {canAddPatient && <NavLink to="/patients/new">Add patient</NavLink>}
        <NavLink to="/inventory">Inventory</NavLink>
        {canSeeInventory && (
          <NavLink to="/pharmacy" badge={expiryCount}>
            Pharmacy
          </NavLink>
        )}
        {(canViewAudit || canManageUsers || canConfigureBackup) && <NavLink to="/settings">Settings</NavLink>}
      </nav>
    </aside>
  );
}

// Drawn as SVG (not emoji/text glyphs) so they look the same on every PC's fonts.
const SunIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const MoonIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const THEME_OPTIONS = [
  { value: 'light', icon: SunIcon, label: 'Light' },
  { value: 'dark', icon: MoonIcon, label: 'Dark' },
  { value: 'auto', icon: 'Auto', label: 'Automatic (dark 6 PM to 6 AM)' },
] as const;

function ThemeSwitch() {
  const [pref, choose] = useThemePreference();
  return (
    <div className="theme-switch" role="group" aria-label="Appearance">
      {THEME_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={pref === o.value ? 'active' : ''}
          onClick={() => choose(o.value)}
          title={o.label}
          aria-label={o.label}
          aria-pressed={pref === o.value}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

function Topbar() {
  const user = getSessionUser();
  const navigate = useNavigate();
  if (!user) return null;

  async function handleLogout() {
    try {
      await mutate('/auth/logout', 'POST');
    } catch {
      // Best-effort: even if the server is unreachable, clear the local session.
    }
    clearSession();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="topbar-user">
        <ThemeSwitch />
        <span className="name">
          <strong>{user.fullName}</strong> · {user.role.replace('_', ' ')}
        </span>
        <Link to="/preferences" className="btn-text">
          Preferences
        </Link>
        <button onClick={handleLogout} className="btn-text">
          Log out
        </button>
      </div>
    </header>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  // Re-render on navigation so the top bar/sidebar appear right after login
  // (the session is read from storage, which React doesn't watch).
  useLocation();
  const user = getSessionUser();
  if (!user) return <>{children}</>;
  return (
    <div className="shell">
      <Topbar />
      <div className="shell-body">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

export function App() {
  useEffect(() => startConnectionMonitor(), []);
  useEffect(() => startThemeAutoUpdate(), []);

  return (
    <BrowserRouter>
      <SessionExpiryHandler />
      <ConnectionBanner />
      <AppLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/patients"
            element={
              <RequireAuth>
                <PatientSearch />
              </RequireAuth>
            }
          />
          <Route
            path="/patients/new"
            element={
              <RequireAuth>
                <AddPatient />
              </RequireAuth>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <RequireAuth>
                <PatientDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/patients/:id/prescribe"
            element={
              <RequireAuth>
                <AddPrescription />
              </RequireAuth>
            }
          />
          <Route
            path="/patients/:id/lab-reports/new"
            element={
              <RequireAuth>
                <AddLabReport />
              </RequireAuth>
            }
          />
          <Route
            path="/patients/:id/lab-reports/:reportId/edit"
            element={
              <RequireAuth>
                <AddLabReport />
              </RequireAuth>
            }
          />
          <Route
            path="/patients/:id/invoice"
            element={
              <RequireAuth>
                <Invoice />
              </RequireAuth>
            }
          />
          <Route
            path="/invoices/:invoiceId"
            element={
              <RequireAuth>
                <Invoice />
              </RequireAuth>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <RequireAuth>
                <Pharmacy />
              </RequireAuth>
            }
          />
          <Route
            path="/pharmacy/sales/:saleId"
            element={
              <RequireAuth>
                <SaleReceipt />
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth>
                <Inventory />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            }
          />
          <Route
            path="/preferences"
            element={
              <RequireAuth>
                <Preferences />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

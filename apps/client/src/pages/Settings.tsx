import { useEffect, useState, type FormEvent } from 'react';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ServerStatusPanel } from '../components/ServerStatusPanel.js';
import { Pagination } from '../components/Pagination.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { LabTestsSettings } from '../components/LabTestsSettings.js';
import { LabReportSettings, PrintHeaderSettings } from '../components/PrintSettings.js';

const AUDIT_PAGE_SIZE = 20;

interface StaffRow {
  id: number;
  full_name: string;
  username: string;
  is_active: number;
  role_name: string;
}

interface AuditEntry {
  id: number;
  performed_at: string;
  entity_type: string;
  entity_id: number;
  action: string;
  performed_by_role: string;
}

const ROLES = ['front_desk', 'pharmacist', 'lab_technician', 'doctor', 'manager', 'admin'] as const;
// Only one Admin account can ever exist (the seeded default) -- it's never
// offered when adding staff or changing someone's role.
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== 'admin');
const ROLE_LABEL: Record<string, string> = {
  front_desk: 'Front Desk',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  doctor: 'Doctor',
  manager: 'Manager',
  admin: 'Admin',
};

const EMPTY_STAFF = { fullName: '', username: '', password: '', roleName: 'front_desk' as string };

function StaffAndRoles() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_STAFF);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  function load() {
    get<{ users: StaffRow[] }>('/admin/users')
      .then((d) => {
        setStaff(d.users);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load the staff list')));
  }
  useEffect(load, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddStatus(null);
    try {
      await mutate('/admin/users', 'POST', form);
      setForm(EMPTY_STAFF);
      setShowAdd(false);
      load();
    } catch (err) {
      setAddStatus(describeError(err, 'add staff'));
    }
  }

  async function handleRoleChange(id: number, roleName: string) {
    setError(null);
    try {
      await mutate(`/admin/users/${id}/role`, 'PATCH', { roleName });
      load();
    } catch (err) {
      setError(describeError(err, 'change that role'));
    }
  }

  async function handleToggleActive(row: StaffRow) {
    setError(null);
    try {
      await mutate(`/admin/users/${row.id}/${row.is_active ? 'deactivate' : 'reactivate'}`, 'POST');
      load();
    } catch (err) {
      setError(describeError(err, row.is_active ? 'deactivate that staff member' : 'reactivate that staff member'));
    }
  }

  const [editingNameId, setEditingNameId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  function startEditName(row: StaffRow) {
    setEditingNameId(row.id);
    setNameDraft(row.full_name);
  }

  async function saveNameEdit(id: number) {
    const trimmed = nameDraft.trim();
    setEditingNameId(null);
    if (!trimmed) return;
    await mutate(`/admin/users/${id}`, 'PATCH', { fullName: trimmed });
    load();
  }

  const [editingUsernameId, setEditingUsernameId] = useState<number | null>(null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  function startEditUsername(row: StaffRow) {
    setEditingUsernameId(row.id);
    setUsernameDraft(row.username);
    setUsernameError(null);
  }

  async function saveUsernameEdit(id: number) {
    const trimmed = usernameDraft.trim();
    if (!trimmed) {
      setEditingUsernameId(null);
      return;
    }
    try {
      await mutate(`/admin/users/${id}`, 'PATCH', { username: trimmed });
      setEditingUsernameId(null);
      load();
    } catch (err) {
      setUsernameError(describeError(err, 'update the username'));
    }
  }

  const [resettingId, setResettingId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  function startResetPassword(id: number) {
    setResettingId(id);
    setNewPassword('');
    setResetStatus(null);
  }

  async function saveResetPassword(id: number) {
    if (newPassword.length < 8) {
      setResetStatus('Password must be at least 8 characters.');
      return;
    }
    try {
      await mutate(`/admin/users/${id}/reset-password`, 'POST', { newPassword });
      setResetStatus('Password reset. Share the new password with the staff member so they can sign in.');
      setNewPassword('');
    } catch (err) {
      setResetStatus(describeError(err, 'reset this password'));
    }
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Staff &amp; roles</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd((v) => !v)}>
          Add staff
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card" style={{ marginBottom: 16, maxWidth: 480 }}>
          <div className="field">
            <label>Full name</label>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required autoFocus />
          </div>
          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Temporary password (8+ characters)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.roleName} onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <ErrorMessage error={addStatus} />
          <button type="submit" className="btn btn-primary">
            Save staff member
          </button>
        </form>
      )}

      <ErrorMessage error={error} />

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td>
                {editingNameId === s.id ? (
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => saveNameEdit(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNameEdit(s.id);
                      if (e.key === 'Escape') setEditingNameId(null);
                    }}
                    style={{ fontSize: 13, padding: '4px 6px' }}
                  />
                ) : (
                  <button className="btn-text" onClick={() => startEditName(s)} title="Click to rename">
                    {s.full_name}
                  </button>
                )}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>
                {editingUsernameId === s.id ? (
                  <input
                    autoFocus
                    value={usernameDraft}
                    onChange={(e) => setUsernameDraft(e.target.value)}
                    onBlur={() => saveUsernameEdit(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveUsernameEdit(s.id);
                      if (e.key === 'Escape') setEditingUsernameId(null);
                    }}
                    style={{ fontSize: 13, padding: '4px 6px', fontFamily: 'var(--font-mono)' }}
                  />
                ) : (
                  <button className="btn-text" onClick={() => startEditUsername(s)} title="Click to change username">
                    {s.username}
                  </button>
                )}
                {editingUsernameId === s.id && <ErrorMessage error={usernameError} style={{ fontSize: 12, margin: '4px 0 0' }} />}
              </td>
              <td>
                {s.role_name === 'admin' ? (
                  <span title="The Admin account's role is fixed and can't be changed.">{ROLE_LABEL.admin} (fixed)</span>
                ) : (
                  <select value={s.role_name} onChange={(e) => handleRoleChange(s.id, e.target.value)} style={{ fontSize: 13 }}>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                <span className={`badge ${s.is_active ? 'badge-positive' : 'badge-neutral'}`}>
                  {s.is_active ? 'Active' : 'Deactivated'}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                  <button className="btn-text" onClick={() => handleToggleActive(s)}>
                    {s.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {resettingId === s.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="password"
                        placeholder="New password (8+ chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                        autoFocus
                        style={{ fontSize: 13, padding: '4px 6px', width: 170 }}
                      />
                      <button className="btn-text" onClick={() => saveResetPassword(s.id)}>
                        Save
                      </button>
                      <button className="btn-text" onClick={() => setResettingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="btn-text" onClick={() => startResetPassword(s.id)}>
                      Reset password
                    </button>
                  )}
                  {resettingId === s.id && resetStatus && (
                    <p style={{ fontSize: 12, margin: 0, color: resetStatus.startsWith('Password reset') ? 'var(--color-positive)' : 'var(--color-critical)' }}>
                      {resetStatus}
                    </p>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface BackupSettings {
  auto: boolean;
  intervalMinutes: number;
  keepDailyDays: number;
}

interface BackupSummary {
  lastBackupAt: string | null;
  fileCount: number;
  totalMB: number;
  folder: string;
}

const INTERVAL_OPTIONS = [
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every 1 hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 240, label: 'Every 4 hours' },
];

const KEEP_DAILY_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Forever' },
];

function Backups() {
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  function load() {
    get<{ settings: BackupSettings; summary: BackupSummary }>('/admin/backup-settings')
      .then((d) => {
        setSettings(d.settings);
        setSummary(d.summary);
      })
      .catch((err) => setStatus(describeError(err, 'load backup settings')));
  }

  useEffect(load, []);

  async function save(next: BackupSettings) {
    setSettings(next);
    setStatus(null);
    try {
      await mutate('/admin/backup-settings', 'POST', next);
      setStatus('Saved.');
    } catch (err) {
      setStatus(describeError(err, 'save backup settings'));
      load();
    }
  }

  async function runBackup() {
    setRunning(true);
    setStatus(null);
    try {
      const res = await mutate<{ file: string }>('/admin/backup', 'POST');
      setStatus(`Backup saved: ${res.file}`);
      load();
    } catch (err) {
      setStatus(describeError(err, 'run the backup'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: 40, maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>Backups</h2>
      {!settings && !status && <p>Loading…</p>}
      {settings && (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={settings.auto}
              onChange={(e) => save({ ...settings, auto: e.target.checked })}
              style={{ width: 'auto' }}
            />
            Automatic backups
          </label>
          {!settings.auto && (
            <p className="error-message" style={{ marginTop: 0 }}>
              Automatic backups are OFF. Use “Back up now” regularly, or turn them back on.
            </p>
          )}
          <div className="form-grid">
            <div className="field">
              <label>How often</label>
              <select
                value={settings.intervalMinutes}
                disabled={!settings.auto}
                onChange={(e) => save({ ...settings, intervalMinutes: Number(e.target.value) })}
              >
                {INTERVAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Keep daily backups for</label>
              <select
                value={settings.keepDailyDays}
                disabled={!settings.auto}
                onChange={(e) => save({ ...settings, keepDailyDays: Number(e.target.value) })}
              >
                {KEEP_DAILY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: 13, marginTop: 0 }}>
            Skipped when nothing has changed. Frequent backups are kept for 1 day, one backup per month is kept forever,
            and “Back up now” backups are never deleted automatically.
          </p>
        </>
      )}
      {summary && (
        <p style={{ fontSize: 13 }}>
          Last backup: <strong>{summary.lastBackupAt ? new Date(summary.lastBackupAt).toLocaleString() : 'none yet'}</strong>
          {' · '}
          {summary.fileCount} files, {summary.totalMB} MB
          <br />
          <span style={{ color: 'var(--color-ink-soft)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{summary.folder}</span>
        </p>
      )}
      <button className="btn" onClick={runBackup} disabled={running}>
        {running ? 'Backing up…' : 'Back up now'}
      </button>
      {status && <p style={{ marginTop: 8 }}>{status}</p>}
    </section>
  );
}

function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  function load(targetPage: number) {
    get<{ entries: AuditEntry[]; total: number }>(
      `/admin/audit-log?page=${targetPage}&pageSize=${AUDIT_PAGE_SIZE}`,
    )
      .then((d) => {
        setEntries(d.entries);
        setTotal(d.total);
      })
      .catch(() => {});
  }

  useEffect(() => load(1), []);

  function goToPage(nextPage: number) {
    setPage(nextPage);
    load(nextPage);
  }

  return (
    <section>
      <h2>Audit log</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Entity</th>
            <th>Action</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{e.performed_at}</td>
              <td>
                {e.entity_type} #{e.entity_id}
              </td>
              <td>{e.action}</td>
              <td>{e.performed_by_role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageSize={AUDIT_PAGE_SIZE} total={total} onPageChange={goToPage} />
    </section>
  );
}

export function Settings() {
  const canManageUsers = useHasPermission('user.manage');
  const canConfigureBackup = useHasPermission('backup.configure');
  const canViewAudit = useHasPermission('auditLog.view');
  const canManageLabTests = useHasPermission('lab.manageTests');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Staff, roles, backups, and the audit trail.</p>
        </div>
      </div>

      {canManageUsers && <StaffAndRoles />}
      {canManageLabTests && <LabTestsSettings />}
      {canManageLabTests && <LabReportSettings />}
      {canConfigureBackup && <PrintHeaderSettings />}
      {canConfigureBackup && <ServerStatusPanel />}
      {canConfigureBackup && <Backups />}
      {canViewAudit && <AuditLog />}
    </div>
  );
}

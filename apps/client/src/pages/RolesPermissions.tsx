import { useEffect, useState } from 'react';
import { get, mutate, describeError } from '../api/client.js';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@clinic/shared';
import { ErrorMessage } from '../components/ErrorMessage.js';

function RolesAndPermissionsGrid() {
  const [matrix, setMatrix] = useState<Record<string, string[]> | null>(null);
  const [adminRole, setAdminRole] = useState('admin');
  const [editableRoles, setEditableRoles] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  function load() {
    get<{ matrix: Record<string, string[]>; adminRole: string; editableRoles: string[] }>('/admin/role-permissions')
      .then((d) => {
        setMatrix(d.matrix);
        setAdminRole(d.adminRole);
        setEditableRoles(d.editableRoles);
      })
      .catch((err) => setStatus(describeError(err, 'load roles and permissions')));
  }

  useEffect(load, []);

  async function toggle(role: string, permission: string, checked: boolean) {
    if (!matrix) return;
    const current = matrix[role] ?? [];
    const next = checked ? [...current, permission] : current.filter((p) => p !== permission);
    setMatrix({ ...matrix, [role]: next }); // optimistic, so the tick responds immediately
    setSavingRole(role);
    setStatus(null);
    try {
      const res = await mutate<{ matrix: Record<string, string[]> }>('/admin/role-permissions', 'POST', {
        roleName: role,
        permissions: next,
      });
      setMatrix(res.matrix);
    } catch (err) {
      setStatus(describeError(err, 'save this permission'));
      load(); // put the grid back to what the server actually has
    } finally {
      setSavingRole(null);
    }
  }

  if (!matrix) return <section style={{ marginBottom: 40 }}><h2>Roles &amp; permissions</h2><p>{status ?? 'Loading…'}</p></section>;

  const roles = [adminRole, ...editableRoles];

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>Roles &amp; permissions</h2>
      <p style={{ color: 'var(--color-ink-soft)', marginTop: -8 }}>
        Tick what each role is allowed to do. Blocking takes effect straight away, even for staff already signed in;
        the buttons they see update when they next sign in.
        <br />
        <strong>Admin always has everything</strong> and can't be changed — that's what stops the clinic being locked out
        of its own system.
      </p>
      <ErrorMessage error={status} />
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 260 }}>Can do</th>
              {roles.map((role) => (
                <th key={role} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {role.replace('_', ' ')}
                  {role === adminRole && (
                    <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-ink-soft)' }}>locked</div>
                  )}
                  {savingRole === role && (
                    <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-ink-soft)' }}>saving…</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <td>{PERMISSION_LABELS[permission]}</td>
                {roles.map((role) => {
                  const locked = role === adminRole;
                  return (
                    <td key={role} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        style={{ width: 'auto' }}
                        checked={locked ? true : (matrix[role] ?? []).includes(permission)}
                        disabled={locked || savingRole === role}
                        onChange={(e) => toggle(role, permission, e.target.checked)}
                        aria-label={`${PERMISSION_LABELS[permission]} for ${role}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Roles & permissions, on its own page (it used to be a section of Settings). */
export function RolesPermissions() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Roles &amp; permissions</h1>
          <p>What each kind of staff account is allowed to do.</p>
        </div>
      </div>
      <RolesAndPermissionsGrid />
    </div>
  );
}

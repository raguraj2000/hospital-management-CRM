import { useState, type FormEvent } from 'react';
import { mutate, describeError, ApiError } from '../api/client.js';
import { getSessionUser, patchSessionUser } from '../state/auth-store.js';
import { useThemePreference } from '../state/theme.js';

function Appearance() {
  const [pref, choose] = useThemePreference();

  return (
    <section className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Appearance</h2>
      <p style={{ color: 'var(--color-ink-soft)', marginTop: -4 }}>
        Automatic switches to dark between 6:00 PM and 6:00 AM.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['auto', 'light', 'dark'] as const).map((option) => (
          <button
            key={option}
            className={pref === option ? 'btn btn-primary' : 'btn'}
            onClick={() => choose(option)}
            type="button"
          >
            {option === 'auto' ? 'Automatic' : option === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>
    </section>
  );
}

function MyAccount() {
  const user = getSessionUser();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await mutate('/auth/me', 'PATCH', { fullName });
      patchSessionUser({ fullName });
      setStatus('Name updated.');
    } catch (err) {
      setStatus(describeError(err, 'update your name'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>My account</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fullName">Display name</label>
          <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        {status && <p style={{ marginTop: 0 }}>{status}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save name'}
        </button>
      </form>
    </section>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setStatus({ ok: false, message: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      await mutate('/auth/me', 'PATCH', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatus({ ok: true, message: 'Password changed.' });
    } catch (err) {
      // 401 here specifically means "current password was wrong" (checked
      // in the /auth/me handler itself), not a generic expired-session 401.
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Current password is incorrect.'
          : err instanceof ApiError && err.status === 400
            ? 'Could not change password — new password needs 8+ characters.'
            : describeError(err, 'change your password');
      setStatus({ ok: false, message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>Change password</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password (8+ characters)</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {status && <p className={status.ok ? undefined : 'login-error'}>{status.message}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

export function Preferences() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Preferences</h1>
          <p>Personal to your account on this computer.</p>
        </div>
      </div>
      <Appearance />
      <MyAccount />
      <ChangePassword />
    </div>
  );
}

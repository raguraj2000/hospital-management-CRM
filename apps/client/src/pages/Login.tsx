import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getServerBaseUrl } from '../api/client.js';
import { setSession, setMustChangePassword } from '../state/auth-store.js';
import { ServerSettings } from '../components/ServerSettings.js';
import { ServerStartupScreen } from '../components/ServerStartupScreen.js';
import { VitalLine } from '../components/VitalLine.js';
import { isTauriRuntime } from '../api/tauri-bridge.js';
import { isConfiguredForLocalServer } from '../state/server-lifecycle.js';
import { ErrorMessage } from '../components/ErrorMessage.js';

type ServerPhase = 'checking' | 'ready' | 'needs-startup' | 'unreachable';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverPhase, setServerPhase] = useState<ServerPhase>('checking');
  const navigate = useNavigate();
  const location = useLocation();
  const expired = Boolean((location.state as { expired?: boolean } | null)?.expired);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getServerBaseUrl()}/health`, { signal: AbortSignal.timeout(2500) });
        if (cancelled) return;
        setServerPhase(res.ok ? 'ready' : 'unreachable');
      } catch {
        if (cancelled) return;
        // Only the main computer (server URL = localhost) should try to
        // auto-start anything; anywhere else this just means "can't reach
        // the main computer right now" -- fall back to the normal form +
        // Server settings, same as before.
        if (isTauriRuntime() && isConfiguredForLocalServer(getServerBaseUrl())) {
          setServerPhase('needs-startup');
        } else {
          setServerPhase('unreachable');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${getServerBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 429) {
        // Locked after too many wrong passwords; the server says for how long.
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Too many wrong passwords. Try again in a few minutes.');
        return;
      }
      if (!res.ok) {
        setError('Invalid username or password.');
        return;
      }
      const data = await res.json();
      setSession(data.token, data.user, data.permissions);
      setMustChangePassword(Boolean(data.mustChangePassword));
      navigate(data.mustChangePassword ? '/preferences' : '/home');
    } catch {
      setError('Could not reach the main computer. Check "Server settings" below and the network connection.');
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand-panel">
        <div className="login-brand-mark">AH</div>
        <h1>Aadhi Hospital</h1>
        <p className="login-brand-tagline">Patient records, prescriptions, and pharmacy stock, kept on the ward.</p>
        <VitalLine />
      </div>

      <div className="login-form-panel">
        {serverPhase === 'checking' && <h2>Connecting…</h2>}

        {serverPhase === 'needs-startup' && <ServerStartupScreen onReady={() => setServerPhase('ready')} />}

        {(serverPhase === 'ready' || serverPhase === 'unreachable') && (
          <>
            <h2>Sign in</h2>
            {expired && <p className="error-message">Your session expired. Please sign in again.</p>}
            {serverPhase === 'unreachable' && <ServerSettings />}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <ErrorMessage error={error} />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ensureServerRunning, stopLocalServer } from '../api/tauri-bridge.js';
import { getServerRoot, isConfiguredForLocalServer } from '../state/server-lifecycle.js';
import { getServerBaseUrl } from '../api/client.js';
import { isTauriRuntime } from '../api/tauri-bridge.js';

const HEALTH_CHECK_INTERVAL_MS = 5000;

// A real HTTP call to /health, not a flag tracked by this app session --
// the backend on the main computer runs as a Windows service that starts at
// boot and keeps itself alive independently of whether this app has ever
// spawned anything itself, so "did *this app* start a process" was never the
// right question and showed "Stopped" even while the service was healthy.
async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getServerBaseUrl()}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Settings > Server. Only meaningful on the machine actually hosting the
 * server (serverBaseUrl points at localhost) -- a satellite computer talking
 * to the main computer over LAN has nothing local to manage here.
 */
export function ServerStatusPanel() {
  const [visible, setVisible] = useState(false);
  const [running, setRunning] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime() || !isConfiguredForLocalServer(getServerBaseUrl())) return;
    setVisible(true);
    checkHealth().then(setRunning);
    const interval = setInterval(() => {
      checkHealth().then(setRunning);
    }, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  async function handleRestart() {
    setBusy(true);
    setStatus('Restarting…');
    try {
      try {
        await stopLocalServer();
      } catch {
        // wasn't running under our management -- fine, proceed to start it
      }
      await ensureServerRunning(getServerRoot());
      const healthy = await checkHealth();
      setRunning(healthy);
      setStatus(healthy ? 'Server restarted.' : 'Restart command ran, but the server is not responding yet.');
    } catch (err: any) {
      setRunning(false);
      setStatus(`Failed to restart: ${err.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>Server</h2>
      <div className="card" style={{ maxWidth: 480 }}>
        <p style={{ marginTop: 0 }}>
          Status:{' '}
          <strong style={{ color: running ? 'var(--color-positive)' : 'var(--color-critical)' }}>
            {running === null ? 'Checking…' : running ? 'Running' : 'Stopped'}
          </strong>
        </p>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>Folder: {getServerRoot()}</p>
        {running === false && (
          <p style={{ color: 'var(--color-critical)', fontSize: 13 }}>
            The server isn't responding. Click restart below to bring it back.
          </p>
        )}
        <button className="btn" onClick={handleRestart} disabled={busy}>
          {busy ? 'Working…' : 'Restart server'}
        </button>
        {status && <p style={{ marginTop: 8, marginBottom: 0 }}>{status}</p>}
      </div>
    </section>
  );
}

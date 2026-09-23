import { useEffect, useRef, useState } from 'react';
import { ensureServerRunning } from '../api/tauri-bridge.js';
import { getServerRoot, setServerRoot } from '../state/server-lifecycle.js';
import { getServerBaseUrl } from '../api/client.js';
import { ErrorMessage } from './ErrorMessage.js';

type Phase = 'starting' | 'waiting' | 'error';

const HEALTH_POLL_INTERVAL_MS = 1000;
const HEALTH_POLL_TIMEOUT_MS = 30000;

async function pollHealth(): Promise<boolean> {
  const deadline = Date.now() + HEALTH_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${getServerBaseUrl()}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      // keep trying
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }
  return false;
}

/**
 * Shown on the Login screen, in place of the form, whenever this machine is
 * configured to run its own local server (see isConfiguredForLocalServer)
 * and that server isn't answering yet. Runs install/build/migrate/seed/spawn
 * automatically, then waits for a real health-check pass before handing
 * control back -- staff never see a terminal or a manual step.
 */
export function ServerStartupScreen({ onReady }: { onReady: () => void }) {
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<string | null>(null);
  const [root, setRoot] = useState(getServerRoot());
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    run();
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  async function run() {
    setPhase('starting');
    setError(null);
    try {
      await ensureServerRunning(root);
      if (cancelled.current) return;
      setPhase('waiting');
      const healthy = await pollHealth();
      if (cancelled.current) return;
      if (healthy) {
        onReady();
      } else {
        setError('The server started but never responded. Check the server directory and try again.');
        setPhase('error');
      }
    } catch (err: any) {
      if (cancelled.current) return;
      setError(err?.message ?? String(err));
      setPhase('error');
    }
  }

  function retry() {
    setServerRoot(root);
    setAttempt((a) => a + 1);
  }

  return (
    <div>
      {phase !== 'error' && (
        <>
          <h2>Starting the clinic server…</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)' }}>
            {phase === 'starting'
              ? 'Setting up (this can take a minute the first time).'
              : 'Waiting for it to come online…'}
          </p>
        </>
      )}

      {phase === 'error' && (
        <>
          <h2>Couldn't start the server</h2>
          <ErrorMessage error={error} style={{ whiteSpace: 'pre-wrap' }} />
          <div className="field">
            <label htmlFor="server-root">Server folder</label>
            <input id="server-root" value={root} onChange={(e) => setRoot(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={retry}>
            Retry
          </button>
        </>
      )}
    </div>
  );
}

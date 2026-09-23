import { getServerBaseUrl } from '../api/client.js';
import { isTauriRuntime, ensureServerRunning } from '../api/tauri-bridge.js';
import { getServerRoot, isConfiguredForLocalServer } from './server-lifecycle.js';

export type ConnectionState = 'online' | 'degraded' | 'offline' | 'reconnecting';

const HEARTBEAT_INTERVAL_MS = 5000;
const FAILURES_BEFORE_OFFLINE = 2;
const RESTART_COOLDOWN_MS = 20000;

let state: ConnectionState = 'online';
let consecutiveFailures = 0;
let lastRestartAttempt = 0;
const listeners = new Set<(state: ConnectionState) => void>();

function setState(next: ConnectionState) {
  if (next === state) return;
  state = next;
  // Mutations are blocked for both 'offline' and 'reconnecting' -- during a
  // restart attempt the server is known to be down, so a write would just
  // fail anyway; treat it the same as offline rather than a third state
  // the rest of the app (mutate()'s guard) would need to know about.
  (window as any).__clinicConnectionState = next === 'offline' || next === 'reconnecting' ? 'offline' : 'online';
  for (const listener of listeners) listener(state);
}

export function getConnectionState(): ConnectionState {
  return state;
}

export function subscribeConnectionState(listener: (state: ConnectionState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Called by the API client after every request, success or failure. */
export function reportRequestOutcome(success: boolean): void {
  if (success) {
    consecutiveFailures = 0;
    setState('online');
    return;
  }

  consecutiveFailures += 1;
  if (consecutiveFailures < FAILURES_BEFORE_OFFLINE) {
    setState('degraded');
    return;
  }

  // On the main computer (server URL = localhost), try to bring the server
  // back automatically instead of just sitting on "lost" until someone
  // notices and knows what to do -- covers a crash mid-shift, not just the
  // app-launch case. Cooldown avoids hammering retries if it's genuinely
  // broken (e.g. someone moved the server folder).
  if (isTauriRuntime() && isConfiguredForLocalServer(getServerBaseUrl())) {
    const now = Date.now();
    if (now - lastRestartAttempt > RESTART_COOLDOWN_MS) {
      lastRestartAttempt = now;
      setState('reconnecting');
      ensureServerRunning(getServerRoot()).catch(() => {
        // Swallow -- the next failed heartbeat will just try again after
        // the cooldown, and the banner already reflects "not online".
      });
      return;
    }
  }

  setState('offline');
}

async function heartbeat() {
  try {
    const res = await fetch(`${getServerBaseUrl()}/health`, { signal: AbortSignal.timeout(3000) });
    reportRequestOutcome(res.ok);
  } catch {
    reportRequestOutcome(false);
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startConnectionMonitor(): () => void {
  if (intervalHandle) return () => {};
  heartbeat();
  intervalHandle = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  return () => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  };
}

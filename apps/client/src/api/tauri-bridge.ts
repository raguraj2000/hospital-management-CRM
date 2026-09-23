// Wraps the Tauri-only server-lifecycle commands (src-tauri/src/server_manager.rs).
// Returns sane fallbacks when running outside Tauri (e.g. `vite dev` in a
// plain browser during development) so the rest of the app doesn't need to
// know the difference.

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(command, args);
}

/** Runs install (if needed) → build → migrate → seed → spawn. See server_manager.rs. */
export async function ensureServerRunning(root: string): Promise<void> {
  if (!isTauriRuntime()) throw new Error('Server control is only available in the desktop app.');
  await invoke<void>('ensure_server_running', { root });
}

export async function stopLocalServer(): Promise<void> {
  if (!isTauriRuntime()) throw new Error('Server control is only available in the desktop app.');
  await invoke<void>('stop_local_server');
}

export { isTauriRuntime };

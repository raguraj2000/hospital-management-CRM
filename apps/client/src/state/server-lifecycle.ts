const ROOT_KEY = 'clinic.localServerDir';
export const DEFAULT_SERVER_ROOT = 'C:\\Aadhi Hospital';

export function getServerRoot(): string {
  return localStorage.getItem(ROOT_KEY) ?? DEFAULT_SERVER_ROOT;
}

export function setServerRoot(path: string): void {
  localStorage.setItem(ROOT_KEY, path);
}

/**
 * Only the main computer should attempt to auto-install/build/run a local
 * server copy. The other clinic computers point their server URL at the
 * main computer's LAN address (via Server settings) and should just connect
 * to it like any client -- never try to spawn a server of their own.
 */
export function isConfiguredForLocalServer(serverBaseUrl: string): boolean {
  try {
    const host = new URL(serverBaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

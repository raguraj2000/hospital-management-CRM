import { useState } from 'react';
import { getServerBaseUrl, setServerBaseUrl } from '../api/client.js';

// Lets any of the 2-3 other clinic computers point this app at the main
// computer's address on the LAN (e.g. http://192.168.1.18:3001), instead of
// the http://localhost:3001 default that only makes sense on the main
// computer itself. Reachable from the login screen since you need this
// configured correctly before login can ever succeed.
export function ServerSettings() {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState(getServerBaseUrl());
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setTestResult({ ok: true, message: 'Connected successfully.' });
      } else {
        setTestResult({ ok: false, message: `Server responded with an error (HTTP ${res.status}).` });
      }
    } catch {
      setTestResult({
        ok: false,
        message: 'Could not reach that address. Check the IP/port, that the main computer is on, and that you\'re on the same Wi-Fi/LAN.',
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setServerBaseUrl(url.replace(/\/$/, ''));
    setTestResult({ ok: true, message: 'Saved. This app will now connect to that address.' });
  }

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="btn-text" style={{ marginBottom: 20 }}>
        Server settings ({getServerBaseUrl()})
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 20, fontSize: 13 }}>
      <p style={{ marginTop: 0, color: 'var(--color-ink-soft)' }}>
        <strong style={{ color: 'var(--color-ink)' }}>Main computer address.</strong> On the main
        computer itself, leave this as <code>http://localhost:3001</code>. On any other computer in
        the clinic, enter the main computer's network address instead (find it on the main computer
        with <code>ipconfig</code> — it looks like <code>http://192.168.1.xx:3001</code>). Both
        computers must be on the same Wi-Fi/LAN.
      </p>
      <div className="field">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.18:3001" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" onClick={handleTest} disabled={testing || !url}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!url}>
          Save
        </button>
        <button type="button" className="btn" onClick={() => setExpanded(false)}>
          Close
        </button>
      </div>
      {testResult && (
        <p style={{ color: testResult.ok ? 'var(--color-positive)' : 'var(--color-critical)', marginBottom: 0, marginTop: 10 }}>
          {testResult.message}
        </p>
      )}
    </div>
  );
}

import { useRef, useState } from 'react';
import { DatabaseBackup, Download, TriangleAlert, Upload } from 'lucide-react';
import type { ApiErrorBody } from '@platform/shared';
import { Button, Card, CardHeader, ConfirmDelete, toast } from '@platform/ui';

/** These two calls carry a file, not JSON, so they do not go through the JSON api client. */
async function errorOf(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as Partial<ApiErrorBody> | null;
  return body?.error ?? `The server answered ${res.status}.`;
}
const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Settings → Backup: download everything as one file, or put a backup file back (branch admin / owner). */
export function BackupRestore({ branch }: { branch: string }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/b/${branch}/backup`, { credentials: 'include' });
      if (!res.ok) return setDownloadError(await errorOf(res));
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'hms-backup.db';
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setLastFile(name);
      toast.success('Backup downloaded', { description: `${name} — copy it to a pendrive and keep it away from this computer.` });
    } catch {
      setDownloadError("Can't reach the server. Check the connection.");
    } finally {
      setDownloading(false);
    }
  }

  async function restore() {
    if (!file) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      const res = await fetch(`/api/b/${branch}/restore`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
      if (!res.ok) return setRestoreError(await errorOf(res));
      toast.success('Backup restored', { description: 'Everyone is signed out. Sign in again with an account from the backup.', duration: 8000 });
      // The session ended with the restore: go to the sign-in page with a clean start.
      window.setTimeout(() => window.location.assign('/login'), 2000);
    } catch {
      setRestoreError("Can't reach the server. Check the connection.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader icon={Download} iconTone="positive" title="Download backup" description="One file with everything: patients, visits, bills, lab, pharmacy, stock, staff and settings." />
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted">Do this every day. Save the file on a pendrive, not only on this computer. It contains patient data, so keep it safe.</p>
          <Button size="lg" disabled={downloading} onClick={download}>
            <Download /> {downloading ? 'Preparing…' : 'Download backup'}
          </Button>
          {lastFile && <p className="text-sm text-positive">Saved: {lastFile} (in this browser's Downloads folder).</p>}
          {downloadError && <p role="alert" className="text-sm font-medium text-critical">{downloadError}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader icon={DatabaseBackup} iconTone="critical" title="Restore from a backup" description="Puts a backup file back. Use it when moving to a new computer or after a failure." />
        <div className="space-y-3 p-4">
          <div className="flex gap-3 rounded-lg border border-critical/20 bg-critical-soft p-3 text-sm text-critical">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              This <b>replaces everything</b> with what is in the file. Anything entered after that backup was made is removed. A copy of the current data is kept on the server first.
            </span>
          </div>
          <input
            ref={picker}
            type="file"
            accept=".db"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setRestoreError(null);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="lg" onClick={() => picker.current?.click()}>
              <Upload /> {file ? 'Choose another file' : 'Choose backup file'}
            </Button>
            {file && (
              <Button size="lg" variant="danger" disabled={restoring} onClick={() => setConfirming(true)}>
                {restoring ? 'Restoring…' : 'Restore this file'}
              </Button>
            )}
          </div>
          {file && (
            <p className="text-sm">
              Chosen: <b>{file.name}</b> · {sizeLabel(file.size)} · last changed {new Date(file.lastModified).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
          {restoreError && <p role="alert" className="text-sm font-medium text-critical">{restoreError}</p>}
        </div>
      </Card>

      <ConfirmDelete
        open={confirming}
        onOpenChange={setConfirming}
        title="Replace everything with this backup?"
        description={`All current data is replaced by "${file?.name ?? ''}". Everyone is signed out and signs in again with the accounts in the backup. Other staff should stop working first.`}
        pending={restoring}
        error={restoreError}
        onConfirm={async () => {
          await restore();
          setConfirming(false);
        }}
      />
    </div>
  );
}

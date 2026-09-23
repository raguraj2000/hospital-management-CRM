import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, uploadFile, describeError } from '../api/client.js';

const COMMON_TITLES = ['Blood Test', 'X-Ray', 'Urine Test', 'ECG', 'Ultrasound', 'MRI/CT Scan'];

function nowLocalDateTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

interface LabReportDetail {
  title: string;
  report_datetime: string;
  notes: string | null;
  file_name: string | null;
}

/** Add a lab report, or edit one when the route has :reportId. */
export function AddLabReport() {
  const { id, reportId } = useParams();
  const isEdit = !!reportId;
  const navigate = useNavigate();

  const [patientName, setPatientName] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [reportDateTime, setReportDateTime] = useState(nowLocalDateTime());
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get<{ patient: { current_name: string } }>(`/patients/${id}`)
      .then((d) => setPatientName(d.patient.current_name))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!isEdit) return;
    get<{ report: LabReportDetail }>(`/lab-reports/${reportId}`)
      .then(({ report }) => {
        if (COMMON_TITLES.includes(report.title)) {
          setTitle(report.title);
        } else {
          setTitle('Other');
          setCustomTitle(report.title);
        }
        setReportDateTime(report.report_datetime.slice(0, 16).replace(' ', 'T'));
        setNotes(report.notes ?? '');
        setCurrentFileName(report.file_name);
        setLoaded(true);
      })
      .catch((err) => setError(describeError(err, 'load this lab report')));
  }, [isEdit, reportId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const resolvedTitle = title === 'Other' ? customTitle.trim() : title;
    if (!resolvedTitle) {
      setError('Choose or enter a report type.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set('title', resolvedTitle);
      formData.set('reportDatetime', reportDateTime.replace('T', ' '));
      formData.set('notes', notes);
      if (file) formData.set('file', file);

      if (isEdit) {
        if (removeFile && !file) formData.set('removeFile', '1');
        await uploadFile(`/lab-reports/${reportId}/update`, formData);
      } else {
        formData.set('patientId', id!);
        await uploadFile('/lab-reports', formData);
      }
      navigate(`/patients/${id}`);
    } catch (err) {
      setError(describeError(err, 'save this lab report'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit lab report' : 'Add lab report'}</h1>
          <p>
            {patientName ? (
              <>
                For <Link to={`/patients/${id}`}>{patientName}</Link>
              </>
            ) : (
              '…'
            )}
          </p>
        </div>
      </div>

      {!loaded && !error && <p>Loading…</p>}
      {loaded && (
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 560 }}>
          <div className="form-grid">
            <div className="field">
              <label>Report type</label>
              <select value={title} onChange={(e) => setTitle(e.target.value)} required>
                <option value="">Select…</option>
                {COMMON_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>
            {title === 'Other' && (
              <div className="field">
                <label>Report type (custom)</label>
                <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} required />
              </div>
            )}
            <div className="field">
              <label>Report date &amp; time</label>
              <input
                type="datetime-local"
                value={reportDateTime}
                onChange={(e) => setReportDateTime(e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Findings / notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            {isEdit && currentFileName && !file && (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Current file</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ textDecoration: removeFile ? 'line-through' : 'none' }}>{currentFileName}</span>
                  <button type="button" className="btn-text" onClick={() => setRemoveFile(!removeFile)}>
                    {removeFile ? 'Keep file' : 'Remove file'}
                  </button>
                </div>
              </div>
            )}
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>
                {isEdit && currentFileName ? 'Replace file' : 'Attach file'} (optional — PDF, image, etc., up to 15MB)
              </label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save lab report'}
          </button>
        </form>
      )}
      {!loaded && error && <p className="login-error">{error}</p>}
    </div>
  );
}

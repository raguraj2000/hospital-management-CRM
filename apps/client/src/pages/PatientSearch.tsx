import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { Pagination } from '../components/Pagination.js';
import { formatIndianPhone } from '../lib/phone.js';
import { ErrorMessage } from '../components/ErrorMessage.js';

const PAGE_SIZE = 20;

interface PatientRow {
  id: number;
  customer_code: string;
  current_name: string;
  age: number | null;
  blood_group: string | null;
  phone_number: string | null;
  status: string;
  created_at?: string;
}

// Local calendar date (NOT toISOString, which is UTC and would show
// yesterday's date during early-morning hours in timezones ahead of UTC).
function todayLocalIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function PatientSearch() {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(todayLocalIso());
  const [results, setResults] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canAddPatient = useHasPermission('patient.create');
  const canPrescribe = useHasPermission('patient.editMedicalInstructions');

  // Default view: most recently registered patients, optionally filtered by
  // registration date. Typing in the search box overrides this with a
  // name/Customer ID search instead.
  function loadList(date: string, targetPage: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
    if (date) params.set('date', date);
    get<{ results: PatientRow[]; total: number }>(`/patients?${params}`)
      .then((d) => {
        setResults(d.results);
        setTotal(d.total);
        setError(null);
      })
      .catch((err) => setError(describeError(err, 'load patients')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!query) {
      setPage(1);
      loadList(dateFilter, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  async function runSearch(q: string, targetPage = 1) {
    setQuery(q);
    setPage(targetPage);
    if (!q) {
      loadList(dateFilter, targetPage);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, page: String(targetPage), pageSize: String(PAGE_SIZE) });
      const data = await get<{ results: PatientRow[]; total: number }>(`/patients/search?${params}`);
      setResults(data.results);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(describeError(err, 'search patients'));
    } finally {
      setLoading(false);
    }
  }

  function goToPage(nextPage: number) {
    if (query) runSearch(query, nextPage);
    else loadList(dateFilter, nextPage);
  }

  function refresh() {
    if (query) runSearch(query, page);
    else loadList(dateFilter, page);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Patients</h1>
          <p>Showing today's registrations — search by name, Customer ID, or phone number, or change the date.</p>
        </div>
        {canAddPatient && (
          <Link to="/patients/new" className="btn btn-primary">
            Register new patient
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          style={{ width: '100%', maxWidth: 360 }}
          placeholder="Search by name, Customer ID, or phone number"
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          autoFocus
        />
        <input
          className="input"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          disabled={!!query}
          title="Filter by registration date"
        />
        {dateFilter && (
          <button className="btn" onClick={() => setDateFilter('')}>
            Clear date
          </button>
        )}
        <button className="btn" onClick={refresh} disabled={loading} title="Refresh list">
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        {!loading && results.length > 0 && (
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 13, marginLeft: 'auto' }}>
            {total} patient{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <ErrorMessage error={error} />

      {!loading && results.length === 0 && !error && (
        <p style={{ color: 'var(--color-ink-soft)' }}>
          {query
            ? `No patients match "${query}".`
            : dateFilter
              ? dateFilter === todayLocalIso()
                ? 'No patients registered today yet.'
                : `No patients registered on ${dateFilter}.`
              : 'No patients registered yet.'}
          {!query && dateFilter && (
            <>
              {' '}
              <button className="btn-text" onClick={() => setDateFilter('')}>
                View all patients
              </button>
            </>
          )}
        </p>
      )}

      {results.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Name</th>
              <th style={{ textAlign: 'right' }}>Age</th>
              <th>Blood group</th>
              <th>Registered</th>
              <th>Phone number</th>
              {canPrescribe && <th></th>}
            </tr>
          </thead>
          <tbody>
            {results.map((p) => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{p.customer_code}</td>
                <td>
                  <Link to={`/patients/${p.id}`}>{p.current_name}</Link>
                </td>
                <td className="num">{p.age ?? '—'}</td>
                <td>{p.blood_group ?? '—'}</td>
                <td>{p.created_at ? p.created_at.slice(0, 10) : '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{formatIndianPhone(p.phone_number)}</td>
                {canPrescribe && (
                  <td>
                    <Link to={`/patients/${p.id}/prescribe`} className="btn-text">
                      Prescription
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={goToPage} />
    </div>
  );
}

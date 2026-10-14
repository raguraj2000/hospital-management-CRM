// Settings > Activity log: who did what and when, for the last 30 days (older entries are removed by the server).
import { Fragment, useDeferredValue, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Badge, Card, CardHeader, Input, NativeSelect, Pager, Skeleton, Table, TBody, TD, TH, THead, TR } from '@platform/ui';
import { formatRupees } from '@platform/shared';
import { api, errorMessage } from '@/api/client';
import { fmtDateTime } from './format';

interface Entry {
  id: number;
  at: string;
  userName: string | null;
  roleName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  detail: unknown;
  patientName: string | null;
  patientPhone: string | null;
  patientUhid: string | null;
}
interface Page {
  entries: Entry[];
  total: number;
  keepDays: number;
  people: { id: number; name: string }[];
  entities: string[];
}
const PAGE = 50;
/** A field name as a person reads it: "amountPaise" -> "amount", "doctor_user_id" -> "doctor user id". */
const words = (s: string) => s.replace(/Paise$/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
const isMoney = (k: string, v: unknown): v is number => /paise$/i.test(k) && typeof v === 'number';
const TONE: Record<string, 'positive' | 'critical' | 'warning' | 'brand' | 'neutral'> = { create: 'positive', delete: 'critical', deactivate: 'critical', cancelled: 'critical', update: 'brand', payment: 'positive', login: 'neutral' };

/** One value of the details, as a person reads it. */
function show(v: unknown, key = ''): string {
  if (v == null || v === '') return '—';
  if (isMoney(key, v)) return formatRupees(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v.map((x) => show(x, key)).join('; ') : '—';
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${words(k)}: ${show(x, k)}`).join(', ');
  return String(v);
}

export function AuditLog({ branch }: { branch: string }) {
  const [text, setText] = useState('');
  const q = useDeferredValue(text.trim());
  const [userId, setUserId] = useState('');
  const [entity, setEntity] = useState('');
  const [days, setDays] = useState('7');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const query = new URLSearchParams({ days, limit: String(PAGE), offset: String((page - 1) * PAGE), ...(q ? { q } : {}), ...(userId ? { userId } : {}), ...(entity ? { entity } : {}) });
  const { data, isLoading, isFetching, error } = useQuery({ queryKey: ['audit', branch, days, q, userId, entity, page], queryFn: () => api.get<Page>(`/b/${branch}/audit?${query}`), placeholderData: keepPreviousData });
  const again = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader title="Activity log" description={`Who did what, and when. Kept for ${data?.keepDays ?? 30} days: each day the oldest day is removed.`} />
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
          <Input type="search" aria-label="Search the log" placeholder="Search: patient name, phone, bill no.…" className="pl-9" value={text} onChange={(e) => again(setText)(e.target.value)} />
        </div>
        <NativeSelect aria-label="Days" className="w-36" value={days} onChange={(e) => again(setDays)(e.target.value)}>
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </NativeSelect>
        <NativeSelect aria-label="Person" className="w-44" value={userId} onChange={(e) => again(setUserId)(e.target.value)}>
          <option value="">Everyone</option>
          {data?.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="What" className="w-44 capitalize" value={entity} onChange={(e) => again(setEntity)(e.target.value)}>
          <option value="">Everything</option>
          {data?.entities.map((x) => (
            <option key={x} value={x}>
              {words(x)}
            </option>
          ))}
        </NativeSelect>
        <span className="text-sm font-medium tabular-nums">{data ? `${data.total} entr${data.total === 1 ? 'y' : 'ies'}` : ''}</span>
      </div>
      {isLoading ? (
        <Skeleton className="m-4 h-40" />
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : !data?.entries.length ? (
        <p className="px-4 py-10 text-center text-sm text-muted">Nothing in the log for this choice.</p>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table>
            <THead>
              <tr>
                <TH className="w-8" />
                <TH>When</TH>
                <TH>Who</TH>
                <TH>Did</TH>
                <TH>To</TH>
                <TH>Patient</TH>
                <TH>Details</TH>
              </tr>
            </THead>
            <TBody>
              {data.entries.map((e) => {
                const fields = e.detail && typeof e.detail === 'object' && !Array.isArray(e.detail) ? Object.entries(e.detail as Record<string, unknown>) : [];
                const short = fields.length ? fields.slice(0, 3).map(([k, v]) => `${words(k)}: ${show(v, k)}`).join(' · ') : e.detail == null ? '' : show(e.detail);
                return (
                  <Fragment key={e.id}>
                    <TR onOpen={fields.length ? () => setOpen(open === e.id ? null : e.id) : undefined}>
                      <TD className="text-muted">{fields.length > 0 && (open === e.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />)}</TD>
                      <TD className="whitespace-nowrap tabular-nums">{fmtDateTime(e.at)}</TD>
                      <TD className="whitespace-nowrap">
                        <div className="font-medium">{e.userName ?? 'HMS itself'}</div>
                        {e.roleName && <div className="text-xs text-muted">{e.roleName}</div>}
                      </TD>
                      <TD>
                        <Badge tone={TONE[e.action] ?? 'neutral'}>{words(e.action)}</Badge>
                      </TD>
                      <TD className="whitespace-nowrap capitalize">
                        {words(e.entity)} {e.entityId && <span className="font-mono text-xs text-muted">#{e.entityId}</span>}
                      </TD>
                      <TD className="whitespace-nowrap">
                        {e.patientName ? (
                          <>
                            <div className="font-medium">{e.patientName}</div>
                            <div className="text-xs text-muted tabular-nums">{[e.patientPhone, e.patientUhid].filter(Boolean).join(' · ')}</div>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TD>
                      <TD className="max-w-md truncate text-muted">{short}</TD>
                    </TR>
                    {open === e.id && (
                      <tr className="bg-subtle/50">
                        <td />
                        <td colSpan={6} className="px-3 py-3">
                          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
                            {fields.map(([k, v]) => (
                              <Fragment key={k}>
                                <dt className="text-muted capitalize">{words(k)}</dt>
                                <dd className="break-words">{show(v, k)}</dd>
                              </Fragment>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
          <Pager page={page} pageSize={PAGE} total={data.total} onPage={setPage} />
        </div>
      )}
    </Card>
  );
}

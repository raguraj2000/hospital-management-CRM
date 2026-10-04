import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, CalendarClock, ClipboardList, FlaskConical, IndianRupee, PackageCheck, UserPlus, Users } from 'lucide-react';
import { formatRupees, type Patient } from '@platform/shared';
import { Avatar, Badge, Button, buttonVariants, Card, CardHeader, cn, EmptyState, PageHeader, Skeleton, StatCard, Table, TBody, TD, TH, THead, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { BarChartSkeleton, MedicineRowsSkeleton, PatientRowsSkeleton } from '@/components/Skeletons';
import { useBranch, useCan, useMe } from '@/state/auth';
import { formatPhone } from './Patients';

interface DashboardData {
  patients: number;
  newPatientsToday: number;
  opVisitsToday: number;
  opWaiting: number;
  last14Days: { day: string; count: number }[];
  recent: Pick<Patient, 'id' | 'uhid' | 'name' | 'phone' | 'gender' | 'createdAt'>[];
  // null = this role may not see it; missing = older API. Either way the card is hidden.
  collectionToday?: { cashPaise: number; upiPaise: number; cardPaise: number; totalPaise: number } | null;
  labPending?: number | null;
  stock?: {
    lowStockCount: number;
    lowStock: { id: number; name: string; strength: string | null; stock: number; reorderLevel: number }[];
    nearExpiryCount: number;
    nearExpiry: { medicineId: number; name: string; strength: string | null; batchNo: string; expiryDate: string; quantity: number }[];
  } | null;
}

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Written out in full so Tailwind sees them; no card count leaves a hole in the last row.
const STAT_GRID: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'sm:grid-cols-2 xl:grid-cols-4' };

const cardLink = 'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted hover:text-ink';

export function Dashboard() {
  const { branch } = useParams();
  const current = useBranch();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const canCreate = useCan('patient.create');
  const canBilling = useCan('billing.receive');
  const canLab = useCan('lab.view');
  const canInventory = useCan('inventory.view');
  // The branch is in the cache key, so switching branch never shows another branch's numbers.
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', branch],
    queryFn: () => api.get<DashboardData>(`/b/${branch}/dashboard`),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // The server decides who sees money, lab and stock. While loading we can only guess from the
  // pages this role can open, so the placeholders match what is most likely to appear.
  const collection = data?.collectionToday;
  const stock = data?.stock;
  const showCollection = isLoading ? canBilling : collection != null;
  const showLab = isLoading ? canLab : data?.labPending != null;
  const showStock = isLoading ? canInventory : stock != null;
  const footnote = (text: string) => (isLoading ? <Skeleton className="h-4 w-24" /> : text);

  return (
    <div aria-busy={isLoading || undefined}>
      {isLoading && <span className="sr-only">Loading…</span>}
      <PageHeader
        title={`${greeting}, ${me?.user.name.split(' ')[0] ?? ''}`}
        description={`Here's what's happening at ${current?.name} today.`}
        actions={
          canCreate && (
            <Link to={`/${branch}/patients?add=1`} className={buttonVariants()}>
              <UserPlus /> Add patient
            </Link>
          )
        }
      />

      {error && <Card className="mb-4 p-4 text-sm text-critical">{errorMessage(error)}</Card>}

      <div className={cn('grid grid-cols-1 gap-4', STAT_GRID[2 + Number(showCollection) + Number(showLab)])}>
        <StatCard
          icon={ClipboardList}
          tone="warning"
          label="OP visits today"
          value={data?.opVisitsToday ?? 0}
          footnote={footnote(`${data?.opWaiting ?? 0} waiting`)}
          loading={isLoading}
          action={<Link to={`/${branch}/visits`} className={cardLink}>Open list →</Link>}
        />
        {showCollection && (
          <StatCard
            icon={IndianRupee}
            tone="positive"
            label="Collection today"
            value={formatRupees(collection?.totalPaise ?? 0)}
            // Only the modes that took money today, so the line stays on one row in a narrow card.
            footnote={footnote(
              ([['Cash', collection?.cashPaise], ['UPI', collection?.upiPaise], ['Card', collection?.cardPaise]] as const)
                .filter(([, paise]) => paise)
                .map(([mode, paise]) => `${mode} ${formatRupees(paise!)}`)
                .join(' · ') || 'Nothing received yet',
            )}
            loading={isLoading}
            action={canBilling && <Link to={`/${branch}/billing`} className={cardLink}>Billing →</Link>}
          />
        )}
        {showLab && (
          <StatCard
            icon={FlaskConical}
            tone="violet"
            label="Lab reports pending"
            value={data?.labPending ?? 0}
            loading={isLoading}
            action={canLab && <Link to={`/${branch}/lab`} className={cardLink}>Open lab →</Link>}
          />
        )}
        <StatCard
          icon={UserPlus}
          label="New patients today"
          value={data?.newPatientsToday ?? 0}
          footnote={footnote(`${data?.patients ?? 0} registered in total`)}
          loading={isLoading}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="New registrations" description="Last 14 days" />
          <div className="p-4">{isLoading || !data ? <BarChartSkeleton /> : <BarChart data={data.last14Days} />}</div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent patients"
            description="Newest registrations"
            action={
              <Link to={`/${branch}/patients`} className={cardLink}>
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {isLoading || !data ? (
            <PatientRowsSkeleton />
          ) : data.recent.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No patients yet"
              description="Patients you register will show up here."
              action={canCreate && <Link to={`/${branch}/patients?add=1`}><Button size="sm" variant="outline">Add the first patient</Button></Link>}
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Patient</TH>
                  <TH className="hidden sm:table-cell lg:hidden xl:table-cell">Phone</TH>
                  <TH className="text-right">Added</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {data.recent.map((p) => (
                  <TR key={p.id} onOpen={() => navigate(`/${branch}/patients/${p.id}`)}>
                    <TD>
                      <Link to={`/${branch}/patients/${p.id}`} className="flex items-center gap-2.5">
                        <Avatar name={p.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium hover:underline">{p.name}</span>
                          <span className="block font-mono text-[11px] text-muted">{p.uhid}</span>
                        </span>
                      </Link>
                    </TD>
                    <TD className="hidden whitespace-nowrap text-muted tabular-nums sm:table-cell lg:hidden xl:table-cell">{formatPhone(p.phone)}</TD>
                    <TD className="text-right">
                      <Badge>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      {showStock && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Medicines to watch</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Low stock"
                description="At or below the reorder level"
                action={
                  <div className="flex shrink-0 items-center gap-3">
                    {stock && <Badge tone={stock.lowStockCount ? 'warning' : 'neutral'}>{stock.lowStockCount}</Badge>}
                    {canInventory && (
                      <Link to={`/${branch}/inventory`} className={cardLink}>
                        Inventory <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </div>
                }
              />
              {!stock ? (
                <MedicineRowsSkeleton />
              ) : stock.lowStock.length === 0 ? (
                <EmptyState icon={PackageCheck} title="Nothing running low" description="Every medicine is above its reorder level." />
              ) : (
                <ul>
                  {stock.lowStock.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
                      <MedicineName name={m.name} strength={m.strength} detail={`${m.stock} left · reorder at ${m.reorderLevel}`} />
                      <Badge tone={m.stock === 0 ? 'critical' : 'warning'}>{m.stock === 0 ? 'Out of stock' : 'Low'}</Badge>
                    </li>
                  ))}
                  <MoreRow shown={stock.lowStock.length} total={stock.lowStockCount} />
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Expiring in 30 days"
                description="Batches to use or return first"
                action={stock && <Badge tone={stock.nearExpiryCount ? 'warning' : 'neutral'}>{stock.nearExpiryCount}</Badge>}
              />
              {!stock ? (
                <MedicineRowsSkeleton />
              ) : stock.nearExpiry.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing expiring soon" description="No batch expires in the next 30 days." />
              ) : (
                <ul>
                  {stock.nearExpiry.map((b) => (
                    <li key={`${b.medicineId}-${b.batchNo}`} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
                      <MedicineName name={b.name} strength={b.strength} detail={`Batch ${b.batchNo} · Qty ${b.quantity}`} />
                      <Badge tone="warning">Expiry {dayLabel(b.expiryDate)}</Badge>
                    </li>
                  ))}
                  <MoreRow shown={stock.nearExpiry.length} total={stock.nearExpiryCount} />
                </ul>
              )}
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}

function MedicineName({ name, strength, detail }: { name: string; strength: string | null; detail: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">
        {name} {strength && <span className="font-normal text-muted">{strength}</span>}
      </div>
      <div className="truncate text-xs text-muted tabular-nums">{detail}</div>
    </div>
  );
}

/** The API sends at most 5 rows per list; say so when there are more. */
function MoreRow({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return <li className="px-4 py-2.5 text-xs text-muted">and {total - shown} more</li>;
}

/** Simple, dependency-free bar chart: one bar per day, today highlighted, value on hover. */
function BarChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const ticks = [max, Math.round(max / 2), 0];
  return (
    <div className="flex gap-3">
      <div className="flex h-48 flex-col justify-between pb-6 text-right text-[11px] text-muted tabular-nums">
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <div className="flex-1">
        <div className="relative flex h-42 items-end gap-1.5 border-b border-border sm:gap-2">
          {[0, 50].map((p) => (
            <div key={p} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${p}%` }} />
          ))}
          {data.map((d, i) => {
            const today = i === data.length - 1;
            return (
              <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${dayLabel(d.day)}: ${d.count}`}>
                <div
                  className={`w-full rounded-t-[4px] transition-all ${today ? 'bg-brand' : 'bg-brand/25 group-hover:bg-brand/50'}`}
                  style={{ height: `${Math.max((d.count / max) * 100, d.count ? 4 : 1)}%` }}
                />
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-primary-foreground group-hover:block">
                  {d.count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5 text-[10px] text-muted sm:gap-2">
          {data.map((d, i) => (
            <span key={d.day} className="flex-1 text-center">
              {i % 2 === 1 || i === data.length - 1 ? dayLabel(d.day).split(' ')[0] : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Card, CardHeader, Skeleton } from '@platform/ui';

/** Loading placeholders shaped like the real screens, so nothing jumps when the content swaps in. */

const srLoading = <span className="sr-only">Loading…</span>;

// ---------- Dashboard pieces (also used by pages/Dashboard.tsx) ----------

/** Same box as StatCard: icon chip + label, big number, footnote. */
export function StatCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Skeleton className="size-8 shrink-0" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex-1 px-4 py-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-1 h-4 w-24" />
      </div>
    </Card>
  );
}

const BAR_HEIGHTS = [35, 55, 40, 70, 50, 85, 30, 60, 45, 75, 55, 90, 40, 65];

/** Same axis layout as the bar chart in Dashboard: tick column, 14 bars, day labels. */
export function BarChartSkeleton() {
  return (
    <div className="flex gap-3">
      <div className="flex h-48 flex-col justify-between pb-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-3 w-4 rounded" />
        ))}
      </div>
      <div className="flex-1">
        <div className="flex h-42 items-end gap-1.5 border-b border-border sm:gap-2">
          {BAR_HEIGHTS.map((h, i) => (
            <div key={i} className="flex-1 animate-pulse rounded-t-[4px] bg-subtle" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-2 flex h-[15px] items-center gap-1.5 sm:gap-2">
          {BAR_HEIGHTS.map((_, i) => (
            <span key={i} className="flex flex-1 justify-center">
              {i % 2 === 1 && <Skeleton className="h-2.5 w-3 rounded" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Recent patients table: header strip, then avatar + name/UHID lines + date badge. */
export function PatientRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <div className="flex h-10 items-center justify-between border-b border-border bg-subtle/60 px-4">
        <Skeleton className="h-3 w-14 bg-border" />
        <Skeleton className="h-3 w-10 bg-border" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-0">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Medicine lists (low stock / expiring): two text lines on the left, a value on the right. */
export function MedicineRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ---------- Whole-screen skeletons (shown by Boot in main.tsx while "who am I" loads) ----------

/** Letter chip / avatar + two lines: the branch block and the user block. */
function IdentitySkeleton({ round }: { round?: boolean }) {
  return (
    <div className="flex w-full items-center gap-2.5 p-1.5">
      <Skeleton className={`size-8 shrink-0 ${round ? 'rounded-full' : ''}`} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

const cardTitle = (
  <CardHeader title={<Skeleton className="my-0.5 h-4 w-32" />} description={<Skeleton className="my-0.5 h-3 w-20" />} />
);

/** Mirrors components/AppShell.tsx with the dashboard inside it. */
export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh md:flex" aria-busy="true">
      {srLoading}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="p-3">
          <IdentitySkeleton />
        </div>
        <div className="px-3 pb-2">
          <Skeleton className="h-9" />
        </div>
        <div className="flex-1 overflow-hidden px-3 py-2">
          {[1, 6, 3].map((rows, g) => (
            <div key={g} className="mb-4">
              <div className="px-2 pb-1.5">
                <Skeleton className="my-0.5 h-3 w-16" />
              </div>
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: rows }, (_, i) => (
                  <div key={i} className="flex h-8 items-center gap-2.5 px-2">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <IdentitySkeleton round />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur md:px-8">
          <div className="min-w-0 flex-1 md:hidden">
            <IdentitySkeleton />
          </div>
          <Skeleton className="hidden h-4 w-40 md:block" />
          <Skeleton className="size-8 shrink-0 rounded-full md:hidden" />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <Skeleton className="h-7 w-56 sm:h-8" />
              <Skeleton className="mt-1.5 h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              {cardTitle}
              <div className="p-4">
                <BarChartSkeleton />
              </div>
            </Card>
            <Card className="lg:col-span-2">
              {cardTitle}
              <PatientRowsSkeleton />
            </Card>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </nav>
    </div>
  );
}

/** Mirrors pages/Login.tsx: brand panel on the left (desktop), form on the right. */
export function LoginSkeleton() {
  const onBrand = 'bg-primary-foreground/15';
  return (
    <div className="grid min-h-dvh lg:grid-cols-2" aria-busy="true">
      {srLoading}
      <div className="hidden flex-col justify-between bg-primary p-10 lg:flex">
        <div className="flex items-center gap-2">
          <Skeleton className={`size-9 ${onBrand}`} />
          <Skeleton className={`h-5 w-24 ${onBrand}`} />
        </div>
        <div>
          <div className="max-w-md space-y-2">
            <Skeleton className={`h-7 ${onBrand}`} />
            <Skeleton className={`h-7 ${onBrand}`} />
            <Skeleton className={`h-7 w-2/3 ${onBrand}`} />
          </div>
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className={`h-5 w-64 ${onBrand}`} />
            ))}
          </div>
        </div>
        <Skeleton className={`h-4 w-72 ${onBrand}`} />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Skeleton className="size-9" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-1 h-5 w-72 max-w-full" />
          <div className="mt-8 flex flex-col gap-5">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-9" />
              </div>
            ))}
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Plain page: used for /platform and the full-screen print pages. */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8" aria-busy="true">
      {srLoading}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <Skeleton className="mt-6 h-64" />
    </div>
  );
}

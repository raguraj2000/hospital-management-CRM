import { lazy, StrictMode, Suspense, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Construction, Lock } from 'lucide-react';
import type { Permission } from '@platform/shared';
import {
  Card,
  EmptyState,
  ErrorBoundary,
  PageHeader,
  Toaster,
} from '@platform/ui';
import { initTheme, isDark, useTheme } from './state/theme';
import './index.css';
import { setUnauthenticatedHandler } from './api/client';
import { ME_KEY, useCan, useMe } from './state/auth';
import { NAV } from './nav';
import { AppShell } from './components/AppShell';
import {
  AppShellSkeleton,
  LoginSkeleton,
  PageSkeleton,
} from './components/Skeletons';
import { Login } from './pages/Login';
import { PrescriptionPrint } from './pages/PrescriptionPrint';
// Hospital pages, each its own file downloaded when first opened (and early by prefetchPages below).
const load = {
  Dashboard: () => import('./pages/Dashboard'),
  Patients: () => import('./pages/Patients'),
  PatientDetail: () => import('./pages/PatientDetail'),
  OpVisits: () => import('./pages/OpVisits'),
  Settings: () => import('./pages/Settings'),
  VisitDetail: () => import('./pages/VisitDetail'),
  Pharmacy: () => import('./pages/Pharmacy'),
  PharmacyBillPrint: () => import('./pages/PharmacyBillPrint'),
  Inventory: () => import('./pages/Inventory'),
  Lab: () => import('./pages/Lab'),
  LabResults: () => import('./pages/LabResults'),
  LabReportPrint: () => import('./pages/LabReportPrint'),
  Billing: () => import('./pages/Billing'),
  BillPage: () => import('./pages/BillPage'),
  BillingPrints: () => import('./pages/BillingPrints'),
  Treatments: () => import('./pages/Treatments'),
  Bookmarks: () => import('./pages/Bookmarks'),
  Help: () => import('./pages/Help'),
  VisitBillPrint: () => import('./pages/VisitBillPrint'),
  Vendors: () => import('./pages/Vendors'),
  PurchaseBill: () => import('./pages/PurchaseBill'),
  NewPurchaseBill: () => import('./pages/NewPurchaseBill'),
};
const Dashboard = lazy(() =>
  load.Dashboard().then((m) => ({ default: m.Dashboard })),
);
const Patients = lazy(() =>
  load.Patients().then((m) => ({ default: m.Patients })),
);
const PatientDetail = lazy(() =>
  load.PatientDetail().then((m) => ({ default: m.PatientDetail })),
);
const OpVisits = lazy(() =>
  load.OpVisits().then((m) => ({ default: m.OpVisits })),
);
const Settings = lazy(() =>
  load.Settings().then((m) => ({ default: m.Settings })),
);
const VisitDetail = lazy(() =>
  load.VisitDetail().then((m) => ({ default: m.VisitDetail })),
);
const Pharmacy = lazy(() =>
  load.Pharmacy().then((m) => ({ default: m.Pharmacy })),
);
const PharmacyBillPrint = lazy(() =>
  load.PharmacyBillPrint().then((m) => ({ default: m.PharmacyBillPrint })),
);
const Inventory = lazy(() =>
  load.Inventory().then((m) => ({ default: m.Inventory })),
);
const Lab = lazy(() => load.Lab().then((m) => ({ default: m.Lab })));
const LabResults = lazy(() =>
  load.LabResults().then((m) => ({ default: m.LabResults })),
);
const LabReportPrint = lazy(() =>
  load.LabReportPrint().then((m) => ({ default: m.LabReportPrint })),
);
const Billing = lazy(() =>
  load.Billing().then((m) => ({ default: m.Billing })),
);
const BillPage = lazy(() =>
  load.BillPage().then((m) => ({ default: m.BillPage })),
);
const BillPrint = lazy(() =>
  load.BillPage().then((m) => ({ default: m.BillPrint })),
);
const DayReportPrint = lazy(() =>
  load.BillingPrints().then((m) => ({ default: m.DayReportPrint })),
);
const ReceiptPrint = lazy(() =>
  load.BillingPrints().then((m) => ({ default: m.ReceiptPrint })),
);
const Treatments = lazy(() =>
  load.Treatments().then((m) => ({ default: m.Treatments })),
);
const BookmarksPage = lazy(() =>
  load.Bookmarks().then((m) => ({ default: m.BookmarksPage })),
);
const Help = lazy(() => load.Help().then((m) => ({ default: m.Help })));
const VisitBillPrint = lazy(() =>
  load.VisitBillPrint().then((m) => ({ default: m.VisitBillPrint })),
);
const Vendors = lazy(() =>
  load.Vendors().then((m) => ({ default: m.Vendors })),
);
const PurchaseBillPage = lazy(() =>
  load.PurchaseBill().then((m) => ({ default: m.PurchaseBillPage })),
);
const NewPurchaseBill = lazy(() =>
  load.NewPurchaseBill().then((m) => ({ default: m.NewPurchaseBill })),
);
// The platform console is for platform admins only: never prefetched.
const Platform = lazy(() =>
  import('./pages/Platform').then((m) => ({ default: m.Platform })),
);

/**
 * Once signed in, download every hospital page in the background so the first click on each is instant.
 * Waits until the current page has settled, skips "data saver" connections, and ignores failures
 * (the page then simply downloads when opened, as before).
 */
let prefetched = false;
function prefetchPages() {
  if (prefetched) return;
  prefetched = true;
  if (
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData
  )
    return;
  const run = () =>
    Object.values(load).forEach((l) => void l().catch(() => {}));
  setTimeout(
    () =>
      'requestIdleCallback' in window
        ? requestIdleCallback(run, { timeout: 5_000 })
        : run(),
    2_000,
  );
}

initTheme();

// A screen that crashes is written in the server's log (Settings > Backup > Download log), once a minute per message.
const reported = new Map<string, number>();
function reportError(message: string, stack?: string) {
  const now = Date.now();
  if ((reported.get(message) ?? 0) > now - 60_000) return;
  reported.set(message, now);
  void fetch('/api/client-error', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, stack, url: location.pathname }),
  }).catch(() => {});
}
window.addEventListener('error', (e) => reportError(e.message, e.error?.stack));
window.addEventListener('unhandledrejection', (e) =>
  reportError(String(e.reason?.message ?? e.reason), e.reason?.stack),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true },
  },
});
// Session expired mid-use: forget who we were; AppShell then sends you to /login.
setUnauthenticatedHandler(() => queryClient.setQueryData(ME_KEY, null));

/** Typing a URL you're not allowed to see shows this, never the page. */
function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  if (useCan(permission)) return <>{children}</>;
  return (
    <Card className='mx-auto mt-10 max-w-md'>
      <EmptyState
        icon={Lock}
        title='No access'
        description="Your role in this branch doesn't include this page. Ask the owner if you need it."
      />
    </Card>
  );
}

function ComingNext({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card className='border-dashed'>
        <EmptyState
          icon={Construction}
          title={`${title} is coming next`}
          description='This module is being built step by step. Patients are ready to use now.'
        />
      </Card>
    </div>
  );
}

/** Waits for "who am I" once, so pages never flash the login screen. */
function Boot({ children }: { children: ReactNode }) {
  const { data: me, isLoading, error } = useMe();
  useEffect(() => {
    if (me && !me.user.isPlatformAdmin) prefetchPages();
  }, [me]);
  if (isLoading) {
    // Outside the router here, so read the address bar directly.
    const path = window.location.pathname;
    if (path === '/' || path.startsWith('/login')) return <LoginSkeleton />;
    // Print pages are full screen with no menus, like /platform.
    if (path.startsWith('/platform') || path.endsWith('/print'))
      return <PageSkeleton />;
    return <AppShellSkeleton />;
  }
  if (error)
    return (
      <p className='m-8 text-sm text-critical'>
        Can't reach the server. Check that it is running, then reload.
      </p>
    );
  return <>{children}</>;
}

function ThemedToaster() {
  const theme = useTheme((s) => s.theme);
  return (
    <Toaster
      theme={isDark(theme) ? 'dark' : 'light'}
      position='top-right'
      richColors
      closeButton
    />
  );
}

const pages: Record<string, ReactNode> = {
  '': <Dashboard />,
  patients: <Patients />,
  visits: <OpVisits />,
  settings: <Settings />,
  pharmacy: <Pharmacy />,
  inventory: <Inventory />,
  lab: <Lab />,
  billing: <Billing />,
  treatments: <Treatments />,
  bookmarks: <BookmarksPage />,
  help: <Help />,
  vendors: <Vendors />,
};

/** A page that is downloaded when first opened: the skeleton shows meanwhile. */
const Page = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
);

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/platform',
    element: (
      <Page>
        <Platform />
      </Page>
    ),
  },
  // Print page: full screen, no menus.
  {
    path: '/:branch/lab/visits/:visitId/print',
    element: (
      <Page>
        <LabReportPrint />
      </Page>
    ),
  },
  {
    path: '/:branch/billing/:billId/print',
    element: (
      <Page>
        <BillPrint />
      </Page>
    ),
  },
  {
    path: '/:branch/billing/:billId/receipts/:paymentId/print',
    element: (
      <Page>
        <ReceiptPrint />
      </Page>
    ),
  },
  {
    path: '/:branch/billing/day-report/print',
    element: (
      <Page>
        <DayReportPrint />
      </Page>
    ),
  },
  {
    path: '/:branch/pharmacy/sales/:saleId/print',
    element: (
      <Page>
        <PharmacyBillPrint />
      </Page>
    ),
  },
  {
    path: '/:branch/visits/:visitId/bill/print',
    element: (
      <Page>
        <VisitBillPrint />
      </Page>
    ),
  },
  {
    path: '/:branch/visits/:visitId/prescription/print',
    element: (
      <Page>
        <PrescriptionPrint />
      </Page>
    ),
  },
  {
    path: '/:branch',
    element: <AppShell />,
    children: [
      ...NAV.map((n) => ({
        ...(n.path === '' ? { index: true } : { path: n.path }),
        element: (
          <RequirePermission permission={n.permission}>
            <Page>{pages[n.path] ?? <ComingNext title={n.label} />}</Page>
          </RequirePermission>
        ),
      })),
      {
        path: 'billing/:billId',
        element: (
          <RequirePermission permission='billing.receive'>
            <Page>
              <BillPage />
            </Page>
          </RequirePermission>
        ),
      },
      {
        path: 'vendors/purchases/new',
        element: (
          <RequirePermission permission='inventory.view'>
            <Page>
              <NewPurchaseBill />
            </Page>
          </RequirePermission>
        ),
      },
      {
        path: 'vendors/purchases/:id',
        element: (
          <RequirePermission permission='inventory.view'>
            <Page>
              <PurchaseBillPage />
            </Page>
          </RequirePermission>
        ),
      },
      {
        path: 'lab/visits/:visitId',
        element: (
          <RequirePermission permission='lab.view'>
            <Page>
              <LabResults />
            </Page>
          </RequirePermission>
        ),
      },
      {
        path: 'visits/:visitId',
        element: (
          <RequirePermission permission='patient.view'>
            <Page>
              <VisitDetail />
            </Page>
          </RequirePermission>
        ),
      },
      {
        path: 'patients/:id',
        element: (
          <RequirePermission permission='patient.view'>
            <Page>
              <PatientDetail />
            </Page>
          </RequirePermission>
        ),
      },
    ],
  },
  { path: '/', element: <Navigate to='/login' replace /> },
  { path: '*', element: <Navigate to='/login' replace /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Boot>
          <RouterProvider router={router} />
        </Boot>
        <ThemedToaster />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

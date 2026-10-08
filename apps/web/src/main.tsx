import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Construction, Lock } from 'lucide-react';
import type { Permission } from '@platform/shared';
import { Card, EmptyState, ErrorBoundary, PageHeader, Toaster } from '@platform/ui';
import { initTheme, isDark, useTheme } from './state/theme';
import './index.css';
import { setUnauthenticatedHandler } from './api/client';
import { ME_KEY, useCan, useMe } from './state/auth';
import { NAV } from './nav';
import { AppShell } from './components/AppShell';
import { AppShellSkeleton, LoginSkeleton, PageSkeleton } from './components/Skeletons';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { OpVisits } from './pages/OpVisits';
import { Settings } from './pages/Settings';
import { VisitDetail } from './pages/VisitDetail';
import { Pharmacy } from './pages/Pharmacy';
import { PharmacyBillPrint } from './pages/PharmacyBillPrint';
import { Inventory } from './pages/Inventory';
import { Lab } from './pages/Lab';
import { LabResults } from './pages/LabResults';
import { LabReportPrint } from './pages/LabReportPrint';
import { Billing } from './pages/Billing';
import { BillPage, BillPrint } from './pages/BillPage';
import { DayReportPrint, ReceiptPrint } from './pages/BillingPrints';
import { Treatments } from './pages/Treatments';
import { VisitBillPrint } from './pages/VisitBillPrint';
import { Vendors } from './pages/Vendors';
import { PurchaseBillPage } from './pages/PurchaseBill';
import { NewPurchaseBill } from './pages/NewPurchaseBill';
import { Platform } from './pages/Platform';

initTheme();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } },
});
// Session expired mid-use: forget who we were; AppShell then sends you to /login.
setUnauthenticatedHandler(() => queryClient.setQueryData(ME_KEY, null));

/** Typing a URL you're not allowed to see shows this, never the page. */
function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  if (useCan(permission)) return <>{children}</>;
  return (
    <Card className="mx-auto mt-10 max-w-md">
      <EmptyState icon={Lock} title="No access" description="Your role in this branch doesn't include this page. Ask the owner if you need it." />
    </Card>
  );
}

function ComingNext({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card className="border-dashed">
        <EmptyState icon={Construction} title={`${title} is coming next`} description="This module is being built step by step. Patients are ready to use now." />
      </Card>
    </div>
  );
}

/** Waits for "who am I" once, so pages never flash the login screen. */
function Boot({ children }: { children: ReactNode }) {
  const { isLoading, error } = useMe();
  if (isLoading) {
    // Outside the router here, so read the address bar directly.
    const path = window.location.pathname;
    if (path === '/' || path.startsWith('/login')) return <LoginSkeleton />;
    // Print pages are full screen with no menus, like /platform.
    if (path.startsWith('/platform') || path.endsWith('/print')) return <PageSkeleton />;
    return <AppShellSkeleton />;
  }
  if (error) return <p className="m-8 text-sm text-critical">Can't reach the server. Check that it is running, then reload.</p>;
  return <>{children}</>;
}

function ThemedToaster() {
  const theme = useTheme((s) => s.theme);
  return <Toaster theme={isDark(theme) ? 'dark' : 'light'} position="top-right" richColors closeButton />;
}

const pages: Record<string, ReactNode> = { '': <Dashboard />, patients: <Patients />, visits: <OpVisits />, settings: <Settings />, pharmacy: <Pharmacy />, inventory: <Inventory />, lab: <Lab />, billing: <Billing />, treatments: <Treatments />, vendors: <Vendors /> };

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/platform', element: <Platform /> },
  // Print page: full screen, no menus.
  { path: '/:branch/lab/visits/:visitId/print', element: <LabReportPrint /> },
  { path: '/:branch/billing/:billId/print', element: <BillPrint /> },
  { path: '/:branch/billing/:billId/receipts/:paymentId/print', element: <ReceiptPrint /> },
  { path: '/:branch/billing/day-report/print', element: <DayReportPrint /> },
  { path: '/:branch/pharmacy/sales/:saleId/print', element: <PharmacyBillPrint /> },
  { path: '/:branch/visits/:visitId/bill/print', element: <VisitBillPrint /> },
  {
    path: '/:branch',
    element: <AppShell />,
    children: [
      ...NAV.map((n) => ({
        ...(n.path === '' ? { index: true } : { path: n.path }),
        element: <RequirePermission permission={n.permission}>{pages[n.path] ?? <ComingNext title={n.label} />}</RequirePermission>,
      })),
      {
        path: 'billing/:billId',
        element: (
          <RequirePermission permission="billing.receive">
            <BillPage />
          </RequirePermission>
        ),
      },
      {
        path: 'vendors/purchases/new',
        element: (
          <RequirePermission permission="inventory.view">
            <NewPurchaseBill />
          </RequirePermission>
        ),
      },
      {
        path: 'vendors/purchases/:id',
        element: (
          <RequirePermission permission="inventory.view">
            <PurchaseBillPage />
          </RequirePermission>
        ),
      },
      {
        path: 'lab/visits/:visitId',
        element: (
          <RequirePermission permission="lab.view">
            <LabResults />
          </RequirePermission>
        ),
      },
      {
        path: 'visits/:visitId',
        element: (
          <RequirePermission permission="patient.view">
            <VisitDetail />
          </RequirePermission>
        ),
      },
      {
        path: 'patients/:id',
        element: (
          <RequirePermission permission="patient.view">
            <PatientDetail />
          </RequirePermission>
        ),
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
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

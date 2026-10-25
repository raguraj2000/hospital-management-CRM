// Canonical API Request Adapter
// Maps legacy routes to the revamped /api/{module}/{op} contract,
// extracts route parameters into query params / JSON body, and injects branch headers.

function toObj(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>) };
  }
  return {};
}

export interface TransformedRequest {
  method: string;
  path: string;
  body?: unknown;
  headers: Record<string, string>;
}

export function transformRequest(
  method: string,
  path: string,
  body?: unknown,
  inputHeaders: Record<string, string> = {},
): TransformedRequest {
  const headers: Record<string, string> = { ...inputHeaders };
  const newMethod = method;
  let newBody = body;

  // Strip leading /api if present
  let cleanPath = path;
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  } else if (cleanPath === '/api') {
    cleanPath = '/';
  }

  // Extract query string
  const [pathname, queryString] = cleanPath.split('?');
  const query = new URLSearchParams(queryString || '');

  // Check /b/:branch prefix
  let branch: string | null = null;
  let subPath = pathname;
  const branchMatch = pathname.match(/^\/b\/([^/]+)(\/.*)?$/);
  if (branchMatch) {
    branch = branchMatch[1];
    subPath = branchMatch[2] || '';
    headers['X-Branch-Slug'] = branch;
  }

  let mappedRoute: string | null = null;

  if (branch) {
    // 1. Branch operations & settings
    if (subPath === '/audit') {
      mappedRoute = '/branch/audit-logs';
    } else if (subPath === '/backup') {
      mappedRoute = '/branch/backup';
    } else if (subPath === '/changes') {
      mappedRoute = '/branch/changes';
    } else if (subPath === '/charge-presets') {
      mappedRoute = '/branch/charge-presets';
    } else if (subPath === '/dashboard') {
      mappedRoute = '/branch/dashboard';
    } else if (subPath === '/doctor-settings') {
      mappedRoute = method === 'PUT' ? '/branch/update-doctor-settings' : '/branch/get-doctor-settings';
    } else if (subPath === '/doctors') {
      mappedRoute = '/branch/list-doctors';
    } else if (subPath === '/print-header') {
      mappedRoute = method === 'PUT' ? '/branch/update-print-header' : '/branch/get-print-header';
    } else if (subPath === '/restore') {
      mappedRoute = '/branch/restore';
    } else if (subPath === '/nav-counts') {
      mappedRoute = '/branch/nav-counts';
    }

    // 2. Staff management
    else if (/^\/roles\/(\d+)\/permissions$/.test(subPath)) {
      const id = subPath.match(/^\/roles\/(\d+)\/permissions$/)![1];
      mappedRoute = '/staff/update-role-permissions';
      newBody = { ...toObj(newBody), roleId: Number(id) };
    } else if (subPath === '/roles') {
      mappedRoute = '/staff/list-roles';
    } else if (subPath === '/staff') {
      mappedRoute = method === 'POST' ? '/staff/invite-member' : '/staff/list-members';
    } else if (/^\/staff\/(\d+)\/reset-password$/.test(subPath)) {
      const id = subPath.match(/^\/staff\/(\d+)\/reset-password$/)![1];
      mappedRoute = '/staff/reset-password';
      newBody = { ...toObj(newBody), userId: Number(id) };
    } else if (/^\/staff\/(\d+)\/([^/]+)$/.test(subPath)) {
      const m = subPath.match(/^\/staff\/(\d+)\/([^/]+)$/)!;
      mappedRoute = '/staff/toggle-member-status';
      newBody = { ...toObj(newBody), userId: Number(m[1]), action: m[2] };
    } else if (/^\/staff\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/staff\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/staff/remove-member';
        newBody = { ...toObj(newBody), userId: Number(id) };
      } else {
        mappedRoute = '/staff/update-member-role';
        newBody = { ...toObj(newBody), userId: Number(id) };
      }
    }

    // 3. Patients
    else if (subPath === '/patients') {
      mappedRoute = method === 'POST' ? '/patients/create' : '/patients/list';
    } else if (/^\/patients\/(\d+)\/activate$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/activate$/)![1];
      mappedRoute = '/patients/toggle-active';
      newBody = { ...toObj(newBody), patientId: Number(id), isActive: true };
    } else if (/^\/patients\/(\d+)\/deactivate$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/deactivate$/)![1];
      mappedRoute = '/patients/toggle-active';
      newBody = { ...toObj(newBody), patientId: Number(id), isActive: false };
    } else if (/^\/patients\/(\d+)\/direct-bill$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/direct-bill$/)![1];
      mappedRoute = '/patients/direct-bill';
      newBody = { ...toObj(newBody), patientId: Number(id) };
    } else if (/^\/patients\/(\d+)\/direct-lab$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/direct-lab$/)![1];
      mappedRoute = '/patients/direct-lab-order';
      newBody = { ...toObj(newBody), patientId: Number(id) };
    } else if (/^\/patients\/(\d+)\/pay-dues$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/pay-dues$/)![1];
      mappedRoute = '/patients/pay-due-balance';
      newBody = { ...toObj(newBody), patientId: Number(id) };
    } else if (/^\/patients\/(\d+)\/bills$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/bills$/)![1];
      mappedRoute = '/patients/bills';
      query.set('patientId', id);
    } else if (/^\/patients\/(\d+)\/courses$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/courses$/)![1];
      mappedRoute = '/patients/treatment-courses';
      query.set('patientId', id);
    } else if (/^\/patients\/(\d+)\/lab-orders$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/lab-orders$/)![1];
      mappedRoute = '/patients/lab-orders';
      query.set('patientId', id);
    } else if (/^\/patients\/(\d+)\/last-purchase$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/last-purchase$/)![1];
      mappedRoute = '/patients/last-pharmacy-purchase';
      query.set('patientId', id);
    } else if (/^\/patients\/(\d+)\/visits$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)\/visits$/)![1];
      if (method === 'POST') {
        mappedRoute = '/patients/create-visit';
        newBody = { ...toObj(newBody), patientId: Number(id) };
      } else {
        mappedRoute = '/patients/visit-history';
        query.set('patientId', id);
      }
    } else if (/^\/patients\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/patients\/(\d+)$/)![1];
      if (method === 'PATCH') {
        mappedRoute = '/patients/update';
        newBody = { ...toObj(newBody), patientId: Number(id) };
      } else {
        mappedRoute = '/patients/get-by-id';
        query.set('patientId', id);
      }
    }

    // 4. Visits
    else if (subPath === '/visits') {
      mappedRoute = '/visits/list';
    } else if (subPath === '/visits/call-next') {
      mappedRoute = '/visits/send-to-next';
    } else if (/^\/visits\/(\d+)\/send$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/send$/)![1];
      mappedRoute = '/visits/send-to-next';
      newBody = { ...toObj(newBody), visitId: Number(id) };
    } else if (/^\/visits\/(\d+)\/bills$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/bills$/)![1];
      if (method === 'POST') {
        mappedRoute = '/visits/create-invoice';
        newBody = { ...toObj(newBody), visitId: Number(id) };
      } else {
        mappedRoute = '/visits/get-invoice';
        query.set('visitId', id);
      }
    } else if (/^\/visits\/(\d+)\/charges\/(\d+)$/.test(subPath)) {
      const m = subPath.match(/^\/visits\/(\d+)\/charges\/(\d+)$/)!;
      if (method === 'DELETE') {
        mappedRoute = '/visits/delete-charge';
        newBody = { ...toObj(newBody), visitId: Number(m[1]), chargeId: Number(m[2]) };
      } else {
        mappedRoute = '/visits/update-charge';
        newBody = { ...toObj(newBody), visitId: Number(m[1]), chargeId: Number(m[2]) };
      }
    } else if (/^\/visits\/(\d+)\/charges$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/charges$/)![1];
      if (method === 'POST') {
        mappedRoute = '/visits/add-charge';
        newBody = { ...toObj(newBody), visitId: Number(id) };
      } else {
        mappedRoute = '/visits/get-invoice';
        query.set('visitId', id);
      }
    } else if (/^\/visits\/(\d+)\/consultation-fee$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/consultation-fee$/)![1];
      mappedRoute = '/visits/add-charge';
      newBody = { ...toObj(newBody), visitId: Number(id), chargeType: 'consultation' };
    } else if (/^\/visits\/(\d+)\/courses$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/courses$/)![1];
      mappedRoute = '/visits/add-course';
      newBody = { ...toObj(newBody), visitId: Number(id) };
    } else if (/^\/visits\/(\d+)\/lab-orders$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/lab-orders$/)![1];
      if (method === 'POST') {
        mappedRoute = '/visits/add-lab-order';
        newBody = { ...toObj(newBody), visitId: Number(id) };
      } else {
        mappedRoute = '/visits/get-lab-results';
        query.set('visitId', id);
      }
    } else if (/^\/visits\/(\d+)\/prescription\/order$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/prescription\/order$/)![1];
      mappedRoute = '/visits/add-prescription';
      newBody = { ...toObj(newBody), visitId: Number(id) };
    } else if (/^\/visits\/(\d+)\/prescription$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/prescription$/)![1];
      if (method === 'POST') {
        mappedRoute = '/visits/add-prescription';
        newBody = { ...toObj(newBody), visitId: Number(id) };
      } else {
        mappedRoute = '/visits/list-prescriptions';
        query.set('visitId', id);
      }
    } else if (/^\/visits\/(\d+)\/bookmarks\/(\d+)\/apply$/.test(subPath)) {
      const m = subPath.match(/^\/visits\/(\d+)\/bookmarks\/(\d+)\/apply$/)!;
      mappedRoute = '/prescriptions/create-bookmark';
      newBody = { ...toObj(newBody), visitId: Number(m[1]), bookmarkId: Number(m[2]) };
    } else if (/^\/visits\/(\d+)\/checkout$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/checkout$/)![1];
      if (method === 'POST') {
        mappedRoute = '/visits/complete-checkout';
        newBody = { ...toObj(newBody), visitId: Number(id) };
      } else {
        mappedRoute = '/visits/checkout-summary';
        query.set('visitId', id);
      }
    } else if (/^\/visits\/(\d+)\/combined-bill$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/combined-bill$/)![1];
      mappedRoute = '/visits/clinical-notes';
      query.set('visitId', id);
    } else if (/^\/visits\/(\d+)\/instructions$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/instructions$/)![1];
      mappedRoute = '/visits/list-instructions';
      query.set('visitId', id);
    } else if (/^\/visits\/(\d+)\/lab-release$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/lab-release$/)![1];
      mappedRoute = '/visits/release-lab-report';
      newBody = { ...toObj(newBody), visitId: Number(id) };
    } else if (/^\/visits\/(\d+)\/lab-report$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/lab-report$/)![1];
      mappedRoute = '/visits/get-lab-results';
      query.set('visitId', id);
    } else if (/^\/visits\/(\d+)\/pharmacy-note$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/pharmacy-note$/)![1];
      mappedRoute = '/visits/dispense-pharmacy';
      newBody = { ...toObj(newBody), visitId: Number(id) };
    } else if (/^\/visits\/(\d+)\/prescription-notes$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)\/prescription-notes$/)![1];
      mappedRoute = '/visits/create-referral';
      newBody = { ...toObj(newBody), visitId: Number(id) };
    } else if (/^\/visits\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/visits\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/visits/delete';
        newBody = { ...toObj(newBody), visitId: Number(id) };
      } else if (method === 'PATCH') {
        mappedRoute = '/visits/update';
        newBody = { ...toObj(newBody), visitId: Number(id) };
      } else {
        mappedRoute = '/visits/get-by-id';
        query.set('visitId', id);
      }
    }

    // 5. Bookmarks & Prescriptions
    else if (subPath === '/bookmarks') {
      mappedRoute = method === 'POST' ? '/prescriptions/create-bookmark' : '/prescriptions/list-bookmarks';
    } else if (/^\/bookmarks\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/bookmarks\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/prescriptions/delete-bookmark';
        newBody = { ...toObj(newBody), bookmarkId: Number(id) };
      } else {
        mappedRoute = '/prescriptions/update-bookmark';
        newBody = { ...toObj(newBody), bookmarkId: Number(id) };
      }
    } else if (/^\/prescription-items\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/prescription-items\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/prescriptions/delete-item';
        newBody = { ...toObj(newBody), itemId: Number(id) };
      } else {
        mappedRoute = '/prescriptions/update-item';
        newBody = { ...toObj(newBody), itemId: Number(id) };
      }
    } else if (/^\/prescription-notes\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/prescription-notes\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/prescriptions/delete-note';
        newBody = { ...toObj(newBody), noteId: Number(id) };
      } else {
        mappedRoute = '/prescriptions/update-note';
        newBody = { ...toObj(newBody), noteId: Number(id) };
      }
    } else if (subPath === '/prescription/suggestions') {
      mappedRoute = '/prescriptions/dosage-suggestions';
    } else if (/^\/visit-instructions\/(\d+)\/([^/]+)$/.test(subPath)) {
      const m = subPath.match(/^\/visit-instructions\/(\d+)\/([^/]+)$/)!;
      mappedRoute = '/prescriptions/instruction-action';
      newBody = { ...toObj(newBody), instructionId: Number(m[1]), action: m[2] };
    } else if (/^\/visit-instructions\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/visit-instructions\/(\d+)$/)![1];
      mappedRoute = '/prescriptions/delete-instruction';
      newBody = { ...toObj(newBody), instructionId: Number(id) };
    }

    // 6. Treatment courses & procedures
    else if (/^\/course-items\/(\d+)\/given$/.test(subPath)) {
      const id = subPath.match(/^\/course-items\/(\d+)\/given$/)![1];
      mappedRoute = '/treatment/update-item-status';
      newBody = { ...toObj(newBody), itemId: Number(id), status: 'given' };
    } else if (subPath === '/course-templates') {
      mappedRoute = method === 'POST' ? '/treatment/create-template' : '/treatment/list-templates';
    } else if (/^\/course-templates\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/course-templates\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/treatment/delete-template';
        newBody = { ...toObj(newBody), templateId: Number(id) };
      } else {
        mappedRoute = '/treatment/update-template';
        newBody = { ...toObj(newBody), templateId: Number(id) };
      }
    } else if (/^\/course-sittings\/(\d+)\/cancel$/.test(subPath)) {
      const id = subPath.match(/^\/course-sittings\/(\d+)\/cancel$/)![1];
      mappedRoute = '/treatment/cancel-sitting';
      newBody = { ...toObj(newBody), sittingId: Number(id) };
    } else if (/^\/course-sittings\/(\d+)\/start$/.test(subPath)) {
      const id = subPath.match(/^\/course-sittings\/(\d+)\/start$/)![1];
      mappedRoute = '/treatment/start-sitting';
      newBody = { ...toObj(newBody), sittingId: Number(id) };
    } else if (/^\/course-sittings\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/course-sittings\/(\d+)$/)![1];
      mappedRoute = '/treatment/update-sitting';
      newBody = { ...toObj(newBody), sittingId: Number(id) };
    } else if (/^\/courses\/(\d+)\/close$/.test(subPath)) {
      const id = subPath.match(/^\/courses\/(\d+)\/close$/)![1];
      mappedRoute = '/treatment/close-course';
      newBody = { ...toObj(newBody), courseId: Number(id) };
    } else if (/^\/courses\/(\d+)\/now$/.test(subPath)) {
      const id = subPath.match(/^\/courses\/(\d+)\/now$/)![1];
      mappedRoute = '/treatment/start-sitting';
      newBody = { ...toObj(newBody), courseId: Number(id) };
    } else if (/^\/courses\/(\d+)\/sittings$/.test(subPath)) {
      const id = subPath.match(/^\/courses\/(\d+)\/sittings$/)![1];
      mappedRoute = '/treatment/schedule-sitting';
      newBody = { ...toObj(newBody), courseId: Number(id) };
    } else if (/^\/courses\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/courses\/(\d+)$/)![1];
      mappedRoute = '/treatment/delete-course';
      newBody = { ...toObj(newBody), courseId: Number(id) };
    } else if (subPath === '/treatments/due') {
      mappedRoute = '/treatment/due-treatments';
    } else if (subPath === '/treatments') {
      mappedRoute = '/treatment/queue';
    } else if (/^\/treatments\/(\d+)\/give$/.test(subPath)) {
      const id = subPath.match(/^\/treatments\/(\d+)\/give$/)![1];
      mappedRoute = '/treatment/administer';
      newBody = { ...toObj(newBody), doseId: Number(id) };
    } else if (/^\/treatments\/(\d+)\/undo$/.test(subPath)) {
      const id = subPath.match(/^\/treatments\/(\d+)\/undo$/)![1];
      mappedRoute = '/treatment/undo-administer';
      newBody = { ...toObj(newBody), doseId: Number(id) };
    }

    // 7. Pharmacy
    else if (subPath === '/inventory/report') {
      mappedRoute = '/pharmacy/inventory-valuation';
    } else if (subPath === '/medicines') {
      mappedRoute = method === 'POST' ? '/pharmacy/create-medicine' : '/pharmacy/list-medicines';
    } else if (/^\/medicines\/(\d+)\/batches$/.test(subPath)) {
      const id = subPath.match(/^\/medicines\/(\d+)\/batches$/)![1];
      if (method === 'POST') {
        mappedRoute = '/pharmacy/create-batch';
        newBody = { ...toObj(newBody), medicineId: Number(id) };
      } else {
        mappedRoute = '/pharmacy/list-batches';
        query.set('medicineId', id);
      }
    } else if (/^\/medicines\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/medicines\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/pharmacy/delete-medicine';
        newBody = { ...toObj(newBody), medicineId: Number(id) };
      } else {
        mappedRoute = '/pharmacy/update-medicine';
        newBody = { ...toObj(newBody), medicineId: Number(id) };
      }
    } else if (subPath === '/pharmacy/dispense') {
      mappedRoute = '/pharmacy/dispense';
    } else if (subPath === '/pharmacy/queue') {
      mappedRoute = '/pharmacy/queue';
    } else if (subPath === '/pharmacy/sales') {
      mappedRoute = method === 'POST' ? '/pharmacy/create-sale' : '/pharmacy/list-sales';
    } else if (/^\/pharmacy\/sales\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/pharmacy\/sales\/(\d+)$/)![1];
      mappedRoute = '/pharmacy/get-sale';
      query.set('saleId', id);
    } else if (subPath === '/pharmacy/stock-report') {
      mappedRoute = '/pharmacy/stock-report';
    }

    // 8. Laboratory
    else if (subPath === '/lab/orders') {
      mappedRoute = '/lab/list-orders';
    } else if (/^\/lab\/orders\/(\d+)\/results$/.test(subPath)) {
      const id = subPath.match(/^\/lab\/orders\/(\d+)\/results$/)![1];
      mappedRoute = '/lab/save-results';
      newBody = { ...toObj(newBody), orderId: Number(id) };
    } else if (/^\/lab\/orders\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/lab\/orders\/(\d+)$/)![1];
      mappedRoute = '/lab/update-order';
      newBody = { ...toObj(newBody), orderId: Number(id) };
    } else if (subPath === '/lab/packages') {
      mappedRoute = method === 'POST' ? '/lab/create-package' : '/lab/list-packages';
    } else if (/^\/lab\/packages\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/lab\/packages\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/lab/delete-package';
        newBody = { ...toObj(newBody), packageId: Number(id) };
      } else {
        mappedRoute = '/lab/update-package';
        newBody = { ...toObj(newBody), packageId: Number(id) };
      }
    } else if (subPath === '/lab/report') {
      mappedRoute = '/lab/report';
    } else if (subPath === '/lab/tests') {
      mappedRoute = method === 'POST' ? '/lab/create-test' : '/lab/list-tests';
    } else if (subPath === '/lab/tests/load-standard') {
      mappedRoute = '/lab/load-standard-tests';
    } else if (subPath === '/lab/tests/order') {
      mappedRoute = '/lab/order-tests';
    } else if (/^\/lab\/tests\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/lab\/tests\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/lab/delete-test';
        newBody = { ...toObj(newBody), testId: Number(id) };
      } else if (method === 'PATCH') {
        mappedRoute = '/lab/update-test';
        newBody = { ...toObj(newBody), testId: Number(id) };
      } else {
        mappedRoute = '/lab/get-test';
        query.set('testId', id);
      }
    } else if (/^\/lab\/visits\/(\d+)\/back-to-doctor$/.test(subPath)) {
      const id = subPath.match(/^\/lab\/visits\/(\d+)\/back-to-doctor$/)![1];
      mappedRoute = '/lab/back-to-doctor';
      newBody = { ...toObj(newBody), visitId: Number(id) };
    }

    // 9. Billing, Expenses, Vendors, Purchases
    else if (subPath === '/billing/day-report') {
      mappedRoute = '/billing/day-report';
    } else if (subPath === '/billing/settings') {
      mappedRoute = method === 'PUT' ? '/billing/update-settings' : '/billing/get-settings';
    } else if (subPath === '/billing/to-bill') {
      mappedRoute = '/billing/to-bill-queue';
    } else if (subPath === '/bills') {
      mappedRoute = '/billing/list-invoices';
    } else if (/^\/bills\/(\d+)\/payments$/.test(subPath)) {
      const id = subPath.match(/^\/bills\/(\d+)\/payments$/)![1];
      mappedRoute = '/billing/record-payment';
      newBody = { ...toObj(newBody), invoiceId: Number(id) };
    } else if (/^\/bills\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/bills\/(\d+)$/)![1];
      if (method === 'PATCH') {
        mappedRoute = '/billing/update-invoice';
        newBody = { ...toObj(newBody), invoiceId: Number(id) };
      } else {
        mappedRoute = '/billing/get-invoice';
        query.set('invoiceId', id);
      }
    } else if (subPath === '/reports/period') {
      mappedRoute = '/billing/period-report';
    } else if (subPath === '/checkout-queue') {
      mappedRoute = '/billing/checkout-queue';
    } else if (subPath === '/expenses') {
      mappedRoute = method === 'POST' ? '/expenses/create' : '/expenses/list';
    } else if (/^\/expenses\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/expenses\/(\d+)$/)![1];
      mappedRoute = '/expenses/delete';
      newBody = { ...toObj(newBody), expenseId: Number(id) };
    } else if (subPath === '/purchases') {
      mappedRoute = method === 'POST' ? '/purchases/create' : '/purchases/list';
    } else if (subPath === '/purchases/profit') {
      mappedRoute = '/purchases/profit-report';
    } else if (/^\/purchases\/(\d+)\/cancel$/.test(subPath)) {
      const id = subPath.match(/^\/purchases\/(\d+)\/cancel$/)![1];
      mappedRoute = '/purchases/cancel';
      newBody = { ...toObj(newBody), purchaseId: Number(id) };
    } else if (/^\/purchases\/(\d+)\/payments$/.test(subPath)) {
      const id = subPath.match(/^\/purchases\/(\d+)\/payments$/)![1];
      mappedRoute = '/purchases/record-payment';
      newBody = { ...toObj(newBody), purchaseId: Number(id) };
    } else if (/^\/purchases\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/purchases\/(\d+)$/)![1];
      mappedRoute = '/purchases/get-by-id';
      query.set('purchaseId', id);
    } else if (subPath === '/vendors') {
      mappedRoute = method === 'POST' ? '/vendors/create' : '/vendors/list';
    } else if (/^\/vendors\/(\d+)$/.test(subPath)) {
      const id = subPath.match(/^\/vendors\/(\d+)$/)![1];
      if (method === 'DELETE') {
        mappedRoute = '/vendors/delete';
        newBody = { ...toObj(newBody), vendorId: Number(id) };
      } else {
        mappedRoute = '/vendors/update';
        newBody = { ...toObj(newBody), vendorId: Number(id) };
      }
    }
  } else {
    // Non-branch routes
    // Platform
    if (pathname === '/platform/customers') {
      mappedRoute = method === 'POST' ? '/platform/create-customer' : '/platform/list-customers';
    } else if (/^\/platform\/customers\/(\d+)\/owner\/password$/.test(pathname)) {
      const id = pathname.match(/^\/platform\/customers\/(\d+)\/owner\/password$/)![1];
      mappedRoute = '/platform/reset-owner-password';
      newBody = { ...toObj(newBody), customerId: Number(id) };
    } else if (/^\/platform\/customers\/(\d+)\/owner$/.test(pathname)) {
      const id = pathname.match(/^\/platform\/customers\/(\d+)\/owner$/)![1];
      if (method === 'PUT') {
        mappedRoute = '/platform/update-customer-owner';
        newBody = { ...toObj(newBody), customerId: Number(id) };
      } else {
        mappedRoute = '/platform/get-customer-owner';
        query.set('customerId', id);
      }
    } else if (/^\/platform\/customers\/(\d+)\/payments$/.test(pathname)) {
      const id = pathname.match(/^\/platform\/customers\/(\d+)\/payments$/)![1];
      if (method === 'POST') {
        mappedRoute = '/platform/record-customer-payment';
        newBody = { ...toObj(newBody), customerId: Number(id) };
      } else {
        mappedRoute = '/platform/list-customer-payments';
        query.set('customerId', id);
      }
    } else if (/^\/platform\/customers\/(\d+)\/([^/]+)$/.test(pathname)) {
      const m = pathname.match(/^\/platform\/customers\/(\d+)\/([^/]+)$/)!;
      mappedRoute = '/platform/toggle-customer-status';
      newBody = { ...toObj(newBody), customerId: Number(m[1]), action: m[2] };
    } else if (/^\/platform\/customers\/(\d+)$/.test(pathname)) {
      const id = pathname.match(/^\/platform\/customers\/(\d+)$/)![1];
      mappedRoute = '/platform/update-customer';
      newBody = { ...toObj(newBody), customerId: Number(id) };
    }

    // Organization
    else if (pathname === '/org/branches') {
      mappedRoute = method === 'POST' ? '/org/create-branch' : '/org/list-branches';
    } else if (/^\/org\/branches\/([^/]+)\/roles\/(\d+)\/permissions$/.test(pathname)) {
      const m = pathname.match(/^\/org\/branches\/([^/]+)\/roles\/(\d+)\/permissions$/)!;
      mappedRoute = '/org/update-branch-role-permissions';
      newBody = { ...toObj(newBody), branchSlug: m[1], roleId: Number(m[2]) };
    } else if (/^\/org\/branches\/([^/]+)\/roles$/.test(pathname)) {
      const p = pathname.match(/^\/org\/branches\/([^/]+)\/roles$/)![1];
      mappedRoute = '/org/list-branch-roles';
      query.set('branchSlug', p);
    } else if (/^\/org\/branches\/([^/]+)$/.test(pathname)) {
      const p = pathname.match(/^\/org\/branches\/([^/]+)$/)![1];
      if (/^\d+$/.test(p)) {
        mappedRoute = '/org/update-branch';
        newBody = { ...toObj(newBody), branchId: Number(p) };
      } else {
        mappedRoute = '/org/update-branch-settings';
        newBody = { ...toObj(newBody), branchSlug: p };
      }
    } else if (pathname === '/org/my-network') {
      mappedRoute = '/org/my-network';
    } else if (pathname === '/org/owner') {
      mappedRoute = '/org/update-owner';
    } else if (pathname === '/org/roles') {
      mappedRoute = '/org/list-roles';
    } else if (/^\/org\/roles\/(\d+)\/permissions$/.test(pathname)) {
      const id = pathname.match(/^\/org\/roles\/(\d+)\/permissions$/)![1];
      mappedRoute = '/org/update-role-permissions';
      newBody = { ...toObj(newBody), roleId: Number(id) };
    }

    // Auth & sessions
    else if (pathname === '/auth/login') {
      mappedRoute = '/auth/login';
    } else if (pathname === '/auth/logout') {
      mappedRoute = '/auth/logout';
    } else if (pathname === '/auth/me') {
      mappedRoute = '/auth/me';
    } else if (pathname === '/auth/password') {
      mappedRoute = '/auth/password';
    }

    // Reports module
    else if (pathname === '/reports/catalog') {
      mappedRoute = '/reports/catalog';
    } else if (pathname === '/reports/generate') {
      mappedRoute = '/reports/generate';
    } else if (pathname === '/reports/export') {
      mappedRoute = '/reports/export';
    }

    // Client error logging
    else if (pathname === '/client-error') {
      mappedRoute = '/branch/client-error';
    }
  }

  // Construct target path
  let finalPath: string;
  if (mappedRoute) {
    if (branch && !query.has('branch_slug')) {
      query.set('branch_slug', branch);
    }
    const qStr = query.toString();
    finalPath = mappedRoute + (qStr ? `?${qStr}` : '');
  } else {
    // If no legacy mapping rule matched, preserve canonical or custom path
    if (branch && !query.has('branch_slug')) {
      query.set('branch_slug', branch);
    }
    const qStr = query.toString();
    finalPath = (subPath || pathname) + (qStr ? `?${qStr}` : '');
  }

  // Ensure prefix /api
  if (!finalPath.startsWith('/api')) {
    finalPath = '/api' + (finalPath.startsWith('/') ? finalPath : '/' + finalPath);
  }

  return {
    method: newMethod,
    path: finalPath,
    body: newBody,
    headers,
  };
}


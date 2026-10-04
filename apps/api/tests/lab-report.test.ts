import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LAB_CATALOG } from '@platform/shared';
import { branchMember } from '../src/db/schema.js';
import { M, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const json = async (r: Response | Promise<Response>) => (await r).json();
const login = (username: string, password: string) =>
  t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: M(username), password }) });

async function visitFor(caller: Awaited<ReturnType<typeof t.as>>, name: string) {
  const { patient } = await json(caller('/api/b/main/patients', { method: 'POST', body: { name, gender: 'female', ageYears: 34 } }));
  const { visit } = await json(caller(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  return visit as { id: number; opNo: string };
}

describe('standard tests + results + report', () => {
  it('loads the clinic test list once, with parameters', async () => {
    const owner = await t.as('owner');
    expect(await json(owner('/api/b/main/lab/tests/load-standard', { method: 'POST' }))).toEqual({ added: LAB_CATALOG.length, skipped: 0 });
    expect(await json(owner('/api/b/main/lab/tests/load-standard', { method: 'POST' }))).toEqual({ added: 0, skipped: LAB_CATALOG.length });
    const { tests } = await json(owner('/api/b/main/lab/tests'));
    const cbc = tests.find((x: any) => x.name === 'Complete Blood Count');
    expect(cbc).toMatchObject({ department: 'DEPARTMENT OF HEMATOLOGY', kind: 'panel', parameterCount: 10, pricePaise: 0 });
    expect(tests.find((x: any) => x.name === 'VDRL')).toMatchObject({ kind: 'card', parameterCount: 1 });
    expect((await json(owner('/api/b/east/lab/tests'))).tests).toEqual([]); // per branch
    const doc = await t.as('doc');
    expect((await doc('/api/b/main/lab/tests/load-standard', { method: 'POST' })).status).toBe(403);
  });

  it('results get H / L / ! flags; complete; the report has header, patient and results', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const lab = await t.as('labtech');
    await owner('/api/b/main/lab/tests/load-standard', { method: 'POST' });
    const { tests } = await json(owner('/api/b/main/lab/tests'));
    const cbc = tests.find((x: any) => x.name === 'Complete Blood Count');
    const widal = tests.find((x: any) => x.name.startsWith('WIDAL'));
    const v = await visitFor(doc, 'Lakshmi N');
    await doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc.id, widal.id] } });

    let report = await json(lab(`/api/b/main/visits/${v.id}/lab-report`));
    expect(report.header.title).toBe('Main branch'); // its own name until the branch saves a header
    expect(report.patient).toMatchObject({ name: 'Lakshmi N', uhid: 'AH000001', gender: 'female', age: 34 });
    const [cbcTest, widalTest] = report.tests;
    const p = (name: string) => cbcTest.parameters.find((x: any) => x.name === name).id;

    expect(
      (await lab(`/api/b/main/lab/orders/${cbcTest.orderId}/results`, {
        method: 'PUT',
        body: { results: [{ parameterId: p('Haemoglobin'), value: '9.5' }, { parameterId: p('Total WBC Count'), value: '12,500' }, { parameterId: p('Platelet Count'), value: '2.5' }] },
      })).status,
    ).toBe(200);
    await lab(`/api/b/main/lab/orders/${widalTest.orderId}/results`, {
      method: 'PUT',
      body: { results: [{ parameterId: widalTest.parameters[0].id, value: 'POSITIVE' }, { parameterId: widalTest.parameters[1].id, value: 'NEGATIVE' }], complete: true },
    });

    report = await json(lab(`/api/b/main/visits/${v.id}/lab-report`));
    const flags = Object.fromEntries(report.tests[0].parameters.filter((x: any) => x.value).map((x: any) => [x.name, [x.value, x.flag]]));
    expect(flags).toEqual({ Haemoglobin: ['9.5', 'L'], 'Total WBC Count': ['12,500', 'H'], 'Platelet Count': ['2.5', ''] });
    expect(report.tests[0].status).toBe('sample_collected'); // saving results means the sample was taken
    expect(report.tests[1]).toMatchObject({ status: 'completed', kind: 'card' });
    expect(report.tests[1].parameters.map((x: any) => [x.value, x.flag])).toEqual([['POSITIVE', '!'], ['NEGATIVE', '']]);
    expect(report.tests[1].completedAt).toBeTruthy();

    // A parameter of another test is refused; another branch sees nothing.
    expect((await lab(`/api/b/main/lab/orders/${cbcTest.orderId}/results`, { method: 'PUT', body: { results: [{ parameterId: widalTest.parameters[0].id, value: 'x' }] } })).status).toBe(400);
    expect((await owner(`/api/b/east/visits/${v.id}/lab-report`)).status).toBe(404);
    // Front desk (no lab permission) cannot enter results.
    const desk = await t.as('desk');
    expect((await desk(`/api/b/main/lab/orders/${cbcTest.orderId}/results`, { method: 'PUT', body: { results: [] } })).status).toBe(403);
  });

  it('Bill No. on the report is the patient bill of its lab tests, not the pharmacy sale', async () => {
    const owner = await t.as('owner');
    const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
    const { id: sugar } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood sugar', pricePaise: 8000 } }));
    const v = await visitFor(owner, 'Lakshmi N');
    await owner(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } });
    const billNo = async () => (await json(owner(`/api/b/main/visits/${v.id}/lab-report`))).billNo;

    // A pharmacy sale for the visit, before any bill.
    const { id: med } = await json(owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }));
    const expiry = new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10);
    expect((await owner(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: expiry, quantity: 50 } })).status).toBe(201);
    const item = await json(owner(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-0-1', days: 2 } }));
    expect((await owner('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: v.id, itemIds: [item.id], paymentMode: 'cash' } })).status).toBe(201);
    expect(await billNo()).toBeNull(); // not billed yet: no number, and never the PH-... sale number

    const first = (await json(owner(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' }))).bill;
    expect(first.billNo).toMatch(/^BL-/);
    expect(await billNo()).toBe(first.billNo);

    // A test ordered after the first bill is paid goes on a second bill: both numbers, in bill order.
    await owner(`/api/b/main/bills/${first.id}/payments`, { method: 'POST', body: { amountPaise: first.totalPaise, mode: 'cash' } });
    await owner(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [sugar] } });
    const second = (await json(owner(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' }))).bill;
    expect(await billNo()).toBe(`${first.billNo}, ${second.billNo}`);
  });

  it('a hand-added test gets one free-text result line', async () => {
    const owner = await t.as('owner');
    const { id } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Mantoux test', pricePaise: 15000 } }));
    const { tests } = await json(owner('/api/b/main/lab/tests'));
    expect(tests.find((x: any) => x.id === id)).toMatchObject({ parameterCount: 1, department: 'OTHER TESTS' });
  });
});

describe('print header (per branch)', () => {
  it('everyone in the branch reads it; only branch admin/owner change it; images are checked', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    expect((await doc('/api/b/main/print-header')).status).toBe(200);
    const header = {
      title: 'அதி மருத்துவமனை',
      address: 'மெயின் ரோடு, புதுவேட்டக்குடி',
      phone: '04328 123456',
      logo: 'data:image/png;base64,iVBORw0KGgo=',
      doctors: [{ name: 'Dr. சுதாகர்', degree: 'MBBS MD.,', role: 'பொது மற்றும் மயக்க மருத்துவர்' }],
      leftSignTitle: 'Lab Technician',
      rightSignName: 'Dr. Lakshmi Devi',
      rightSignTitle: 'MBBS, DNB (OG)',
    };
    expect((await doc('/api/b/main/print-header', { method: 'PUT', body: header })).status).toBe(403);
    expect((await owner('/api/b/main/print-header', { method: 'PUT', body: { ...header, logo: 'javascript:alert(1)' } })).status).toBe(400);
    expect((await owner('/api/b/main/print-header', { method: 'PUT', body: header })).status).toBe(200);
    const got = (await json(doc('/api/b/main/print-header'))).header;
    expect(got).toMatchObject({ title: 'அதி மருத்துவமனை', doctors: [{ name: 'Dr. சுதாகர்' }], logo: header.logo });
    // Each branch its own: east saved nothing, so it still prints only its own name.
    expect((await json(owner('/api/b/east/print-header'))).header).toMatchObject({ title: 'East branch', doctors: [] });
    expect((await json(owner('/api/b/east/print-header'))).header.logo ?? null).toBeNull();
  });

  it('a branch with nothing saved prints its own name: no logo, no doctors, on the report too', async () => {
    const doc = await t.as('doc');
    const got = (await json(doc('/api/b/main/print-header'))).header;
    expect(got).toMatchObject({ title: 'Main branch', doctors: [], rightSignName: '' });
    expect(got.logo ?? null).toBeNull();
    const v = await visitFor(doc, 'Lakshmi N');
    expect((await json(doc(`/api/b/main/visits/${v.id}/lab-report`))).header).toEqual(got);
  });

  it('a saved header is returned exactly as saved', async () => {
    const owner = await t.as('owner');
    const saved = (await json(owner('/api/b/main/print-header', { method: 'PUT', body: { title: 'City Clinic', doctors: [] } }))).header;
    const got = (await json(owner('/api/b/main/print-header'))).header;
    expect(got).toEqual(saved);
    expect(got).toMatchObject({ title: 'City Clinic', address: '', doctors: [], rightSignName: '' });
    expect(got.logo ?? null).toBeNull();
    const v = await visitFor(owner, 'Lakshmi N');
    expect((await json(owner(`/api/b/main/visits/${v.id}/lab-report`))).header).toEqual(got);
  });
});

describe('activate / deactivate staff', () => {
  it('deactivated: signed out and cannot log in; still listed; activate lets them back', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const { staff } = await json(owner('/api/b/main/staff'));
    const docId = staff.find((s: any) => s.mobile === M('doc')).userId;

    expect((await owner(`/api/b/main/staff/${docId}/deactivate`, { method: 'POST' })).status).toBe(200);
    expect((await doc('/api/auth/me')).status).toBe(401);
    expect((await login('doc', 'doc-pass-123')).status).toBe(401);
    const listed = (await json(owner('/api/b/main/staff'))).staff.find((s: any) => s.userId === docId);
    expect(listed.isActive).toBe(false);

    expect((await owner(`/api/b/main/staff/${docId}/activate`, { method: 'POST' })).status).toBe(200);
    expect((await login('doc', 'doc-pass-123')).status).toBe(200);
  });

  it('a branch admin cannot deactivate someone who also works in another branch, nor themselves', async () => {
    const owner = await t.as('owner');
    const { roles } = await json(owner('/api/b/main/roles'));
    const adminRole = roles.find((r: any) => r.key === 'branch_admin').id;
    await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Main Admin', mobile: M('madmin'), password: 'madmin-pass-1', roleId: adminRole } });
    const { staff } = await json(owner('/api/b/main/staff'));
    const docId = staff.find((s: any) => s.mobile === M('doc')).userId;
    const adminId = staff.find((s: any) => s.mobile === M('madmin')).userId;
    await t.db.insert(branchMember).values({ branchId: t.east.id, userId: docId, roleId: roles.find((r: any) => r.key === 'doctor').id });

    const admin = await t.as('madmin', 'madmin-pass-1');
    expect((await admin(`/api/b/main/staff/${docId}/deactivate`, { method: 'POST' })).status).toBe(403);
    expect((await admin(`/api/b/main/staff/${adminId}/deactivate`, { method: 'POST' })).status).toBe(400);
    const lab = (await json(admin('/api/b/main/staff'))).staff.find((s: any) => s.mobile === M('labtech'));
    expect((await admin(`/api/b/main/staff/${lab.userId}/deactivate`, { method: 'POST' })).status).toBe(200); // main-only staff: allowed
  });
});

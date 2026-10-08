// Vendors (purchases, payments to suppliers) and patient billing (OP bills).
import { z } from 'zod';
import type { PharmacySaleDetail, PrescriptionItem, PrintHeader } from './index.js';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');
const paise = (label: string) => z.number({ error: `Enter ${label}` }).int().min(0, `Enter ${label}`).max(100_000_000);

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export const vendorInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the vendor name').max(120),
  phone: text(30),
  address: text(300),
  gstNo: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === '' || /^[0-9A-Z]{15}$/.test(v), 'GST number is 15 letters/digits')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  creditDays: z.number().int().min(0).max(365).optional(),
  notes: text(500),
});
export type VendorInput = z.input<typeof vendorInputSchema>;

export interface Vendor {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  gstNo: string | null;
  creditDays: number;
  notes: string | null;
  /** Unpaid amount over all their bills. */
  duePaise: number;
  overduePaise: number;
}

/**
 * One line of a vendor's invoice, in the invoice's own terms: packs, free packs, rate per pack, GST.
 * With the defaults (pack size 1, nothing free, no GST) it is simply "units × cost per unit".
 */
export const purchaseLineSchema = z.object({
  medicineId: z.number({ error: 'Choose a medicine' }).int().positive('Choose a medicine'),
  batchNo: z.string().trim().min(1, 'Batch no.').max(40),
  expiryDate: isoDate,
  /** Packs charged for (loose units when the pack size is 1). */
  quantity: z.number({ error: 'Qty' }).int().min(1, 'At least 1').max(1_000_000),
  /** Rate per pack before GST (cost per unit when the pack size is 1). */
  unitCostPaise: paise('the cost'),
  /** Units in one pack: 10 for a strip of 10, 1 for a vial or a tube. */
  packSize: z.number({ error: 'Pack' }).int().min(1, 'At least 1').max(10_000).default(1),
  /** Packs received free on top. */
  freeQty: z.number({ error: 'Free' }).int().min(0).max(1_000_000).default(0),
  gstPercent: z.number({ error: 'GST %' }).min(0).max(40, 'Check the GST %').default(0),
  /** Printed MRP per pack. */
  mrpPaise: paise('the MRP').nullable().optional(),
  /** Also set the medicine's selling price per unit to this (e.g. MRP ÷ pack size). Left out = price unchanged. */
  sellingPricePaise: paise('the selling price').nullable().optional(),
});

/** What a purchase line comes to: the loose units into stock, what the vendor is owed, what one unit cost. */
export function purchaseLineTotals(l: { quantity: number; unitCostPaise: number; packSize?: number; freeQty?: number; gstPercent?: number }) {
  const units = (l.quantity + (l.freeQty ?? 0)) * (l.packSize ?? 1);
  const amountPaise = Math.round(l.quantity * l.unitCostPaise * (1 + (l.gstPercent ?? 0) / 100));
  return { units, amountPaise, unitCostPaise: units ? Math.round(amountPaise / units) : 0 };
}

export const purchaseBillSchema = z.object({
  vendorId: z.number({ error: 'Choose a vendor' }).int().positive('Choose a vendor'),
  vendorBillNo: text(40),
  billDate: isoDate,
  notes: text(500),
  lines: z.array(purchaseLineSchema).min(1, 'Add at least one medicine').max(200),
});
/** What the form sends (pack size, free and GST may be left out). */
export type PurchaseBillInput = z.input<typeof purchaseBillSchema>;

export const VENDOR_PAYMENT_MODES = ['cash', 'upi', 'cheque', 'bank'] as const;
export type VendorPaymentMode = (typeof VENDOR_PAYMENT_MODES)[number];

export const vendorPaymentSchema = z.object({
  amountPaise: z.number({ error: 'Enter the amount' }).int().min(1, 'Enter the amount'),
  mode: z.enum(VENDOR_PAYMENT_MODES),
  reference: text(60),
});

export const cancelSchema = z.object({ reason: z.string().trim().min(3, 'Give a short reason').max(300) });

export interface PurchaseBillSummary {
  id: number;
  vendorId: number;
  vendorName: string;
  vendorBillNo: string | null;
  billDate: string;
  dueDate: string;
  totalPaise: number;
  paidPaise: number;
  status: 'unpaid' | 'part_paid' | 'paid' | 'cancelled';
  overdue: boolean;
}

export interface PurchaseBillDetail extends PurchaseBillSummary {
  notes: string | null;
  cancelReason: string | null;
  lines: {
    id: number;
    medicineName: string;
    batchNo: string;
    expiryDate: string;
    /** Loose units into stock, and what one of them cost. */
    quantity: number;
    unitCostPaise: number;
    amountPaise: number;
    soldQty: number;
    // As on the vendor's invoice.
    packSize: number;
    packQty: number;
    freeQty: number;
    ratePaise: number;
    mrpPaise: number | null;
    gstPercent: number;
  }[];
  payments: { id: number; amountPaise: number; mode: VendorPaymentMode; reference: string | null; paidAt: string; paidByName: string | null }[];
  canCancel: boolean;
}

// ---------------------------------------------------------------------------
// Patient billing (OP bill: consultation + lab + other; pharmacy is paid at its counter)
// ---------------------------------------------------------------------------

export const BILL_PAYMENT_MODES = ['cash', 'upi', 'card'] as const;
export type BillPaymentMode = (typeof BILL_PAYMENT_MODES)[number];

/** One extra charge on a bill (dressing, injection, ...). */
export const billChargeSchema = z.object({ description: z.string().trim().min(1, 'Say what this charge is for').max(60), amountPaise: paise('the amount') });
export type BillCharge = z.infer<typeof billChargeSchema>;

export const billUpdateSchema = z.object({
  consultationFeePaise: paise('the fee').optional(),
  otherChargesPaise: paise('the amount').optional(),
  otherChargesLabel: text(60),
  /** Every extra charge of the bill. Given, it replaces the ones the bill has (and the single "other charges" of older bills). */
  charges: z.array(billChargeSchema).max(20, 'At most 20 extra charges on a bill').optional(),
  discountPaise: paise('the discount').optional(),
});

export const billPaymentSchema = z.object({
  amountPaise: z.number({ error: 'Enter the amount' }).int().min(1, 'Enter the amount'),
  mode: z.enum(BILL_PAYMENT_MODES),
});

export const billingSettingsSchema = z.object({ consultationFeePaise: paise('the fee') });

export interface BillLine {
  id: number;
  description: string;
  amountPaise: number;
  labOrderId: number | null;
}

/** The extra charges of a bill: its charge lines (not lab tests), and the single "other charges" older bills carry. */
export const billCharges = (b: { lines: Pick<BillLine, 'description' | 'amountPaise' | 'labOrderId'>[]; otherChargesPaise: number; otherChargesLabel: string | null }): BillCharge[] => [
  ...(b.otherChargesPaise > 0 ? [{ description: b.otherChargesLabel || 'Other charges', amountPaise: b.otherChargesPaise }] : []),
  ...b.lines.filter((l) => l.labOrderId == null).map((l) => ({ description: l.description, amountPaise: l.amountPaise })),
];

export interface OpBill {
  id: number;
  billNo: string;
  visitId: number;
  opNo: string;
  token: number | null;
  billDate: string;
  /** When the bill was made (UTC ISO): printed with its time. */
  createdAt: string;
  patientId: number;
  patientName: string;
  patientUhid: string;
  patientPhone: string | null;
  doctorName: string | null;
  consultationFeePaise: number;
  otherChargesPaise: number;
  otherChargesLabel: string | null;
  discountPaise: number;
  lines: BillLine[];
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
  status: 'unpaid' | 'part_paid' | 'paid';
  /** Bills can be changed only until the first payment. */
  editable: boolean;
  payments: { id: number; amountPaise: number; mode: BillPaymentMode; receivedAt: string; receivedByName: string | null }[];
}

export interface BillListRow {
  id: number;
  billNo: string;
  visitId: number;
  opNo: string;
  token: number | null;
  patientName: string;
  patientUhid: string;
  patientPhone: string | null;
  totalPaise: number;
  paidPaise: number;
  status: OpBill['status'];
  createdAt: string;
}

/** A pharmacy sale on the patient's Bills tab. */
export interface PatientPharmacySale {
  id: number;
  saleNo: string;
  /** UTC, ISO 8601. */
  createdAt: string;
  totalPaise: number;
  paymentMode: BillPaymentMode;
  /** null for a direct sale (no prescription). */
  visitId: number | null;
  opNo: string | null;
  direct: boolean;
}

/** Everything one patient was billed, over all their visits (newest first). */
export interface PatientBills {
  bills: OpBill[];
  /** null when the role may not see pharmacy sales (needs pharmacy.sell). */
  pharmacy: PatientPharmacySale[] | null;
  summary: { billedPaise: number; paidPaise: number; balancePaise: number; pharmacyPaise: number | null };
}

export interface Collection {
  date: string;
  bills: Record<BillPaymentMode, number>;
  pharmacy: Record<BillPaymentMode, number>;
  totalPaise: number;
  vendorPaidPaise: number;
}

/** One amount received at the counter on a day: a payment on an OP bill, or a pharmacy sale. */
export interface DayReceipt {
  kind: 'bill' | 'pharmacy';
  /** Receipt no. of a bill payment ("BL-261007-001/R1"), or the pharmacy sale no. */
  no: string;
  /** For a bill payment: where its receipt prints from. */
  billId: number | null;
  paymentId: number | null;
  saleId: number | null;
  at: string;
  /** null = a pharmacy sale without a patient. */
  patientName: string | null;
  amountPaise: number;
  mode: BillPaymentMode;
}

/** The day at a glance: who came, what was billed, what was received, what is still due. */
export interface DayReport extends Collection {
  visits: { total: number; completed: number; cancelled: number; newPatients: number; byDoctor: { doctorName: string | null; count: number }[] };
  labTests: number;
  /** What the day's OP bills and pharmacy sales were made up of. */
  billed: { consultationPaise: number; labPaise: number; otherPaise: number; discountPaise: number; pharmacyPaise: number };
  /** Balance still due on the bills made that day, and on every bill of the branch. */
  pendingDayPaise: number;
  pendingAllPaise: number;
  /** Every amount received that day, in time order. Pharmacy sales only for those who run that counter. */
  receipts: DayReceipt[];
}

/** "BL-261007-001/R2": the 2nd payment received on that bill. */
export const receiptNo = (billNo: string, nth: number) => `${billNo}/R${nth}`;

export const labReleaseSchema = z.object({ reason: z.string().trim().min(3, 'Give a short reason').max(300) });

export function billStatus(totalPaise: number, paidPaise: number): OpBill['status'] {
  if (paidPaise <= 0) return totalPaise === 0 ? 'paid' : 'unpaid';
  return paidPaise >= totalPaise ? 'paid' : 'part_paid';
}

// ---------------------------------------------------------------------------
// Checkout: everything a visit owes (OP bill + medicines) collected in one go at the counter
// ---------------------------------------------------------------------------

/** Both lists of visits with something to collect look back this many days. Older dues stay under "Bills with balance due". */
export const CHECKOUT_LOOKBACK_DAYS = 30;

/**
 * One payment for a visit. The bill fields need billing.receive, itemIds needs pharmacy.sell.
 * Medicines are always paid in full; what is left of amountPaise goes to the bill (less than the total = balance due).
 */
/**
 * Fewer units than prescribed for some lines (the patient wants 2 days of 3): prescription line id -> units to give.
 * Never more than the doctor wrote; lines left out are given in full.
 */
export const dispenseQuantitiesSchema = z.record(z.string().regex(/^\d+$/), z.number().int().min(1, 'At least 1').max(10_000)).optional();

export const checkoutSchema = billUpdateSchema.extend({
  /** Prescription lines to dispense now; the other pending lines are marked "declined". */
  itemIds: z.array(z.number().int().positive()).max(200).default([]),
  /** Fewer units than prescribed for some of those lines (see dispenseQuantitiesSchema). */
  quantities: dispenseQuantitiesSchema,
  paymentMode: z.enum(BILL_PAYMENT_MODES),
  amountPaise: z.number({ error: 'Enter the amount received' }).int().min(0, 'Enter the amount received').max(100_000_000),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

/** A pending prescription line at the counter: the queue line plus the batch the sale takes from first. */
export interface CheckoutMedicine extends PrescriptionItem {
  nextBatchNo: string | null;
  nextExpiry: string | null;
}

/** The bill part of a checkout: what will be charged now, and what earlier bills still owe. */
export interface CheckoutBill {
  /** The unpaid bill the fee edits apply to; null = a new bill is created on checkout (or nothing is left to bill). */
  billId: number | null;
  billNo: string | null;
  /** Fees and discount can still be changed (no payment taken on that bill yet). */
  editable: boolean;
  consultationFeePaise: number;
  /** Extra charges on that bill (dressing, injection, ...). */
  charges: BillCharge[];
  discountPaise: number;
  /** Lab tests on that bill, and those ordered since (billed: false) which the checkout adds to it. */
  labLines: { description: string; amountPaise: number; billed: boolean }[];
  /** Balance still due on the visit's other bills (ones that already have payments). */
  earlierBills: { id: number; billNo: string; totalPaise: number; paidPaise: number; balancePaise: number }[];
  /** Already received on all bills of the visit. */
  paidPaise: number;
  /** To collect on the bill part now, before any edit. */
  duePaise: number;
}

/** GET /visits/:visitId/checkout. A part is null when the caller may not act on it. */
export interface VisitCheckout {
  visitId: number;
  opNo: string;
  token: number | null;
  visitDate: string;
  /** Visit status as stored ('at_counter' = the doctor sent the patient to the counter). */
  status: string;
  patientId: number;
  patientName: string;
  patientUhid: string;
  doctorName: string | null;
  /** Needs billing.receive. */
  bill: CheckoutBill | null;
  /** Needs pharmacy.sell: the pending prescription lines and the doctor's note to the pharmacy. */
  medicines: { items: CheckoutMedicine[]; pharmacyNote: string | null } | null;
  totals: { billDuePaise: number; medicinesPaise: number; grandTotalPaise: number };
}

/** One line of GET /checkout-queue. Amounts of a part the caller may not act on are null. */
export interface CheckoutQueueEntry {
  visitId: number;
  opNo: string;
  token: number | null;
  visitDate: string;
  status: string;
  patientId: number;
  patientName: string;
  patientUhid: string;
  doctorName: string | null;
  /** Pending prescription lines and what they cost. */
  medicinesWaiting: number | null;
  medicinesPaise: number | null;
  /** Not billed yet: the consultation fee (if the visit has no bill) + lab tests not on a bill. */
  toBillPaise: number | null;
  /** Balance due on the visit's bills. */
  balancePaise: number | null;
  grandTotalPaise: number;
  summary: string;
}

/** POST /visits/:visitId/checkout. */
export interface CheckoutResult {
  /** The bill that was created / changed / paid (the latest one of the visit); null if the bill part was not touched. */
  bill: OpBill | null;
  /** Every bill of the visit that got a payment in this checkout. */
  paidBills: { id: number; billNo: string; amountPaise: number }[];
  sale: { id: number; saleNo: string; totalPaise: number } | null;
  /** balancePaise: still due on the visit's bills; null without billing.receive. */
  totals: { receivedPaise: number; billPaidPaise: number; medicinesPaise: number; balancePaise: number | null };
  visitStatus: string;
  /** The lab report can be printed (charges paid or released) and has completed tests. */
  labReportReady: boolean;
}

/** GET /visits/:visitId/combined-bill: one printed bill for the whole visit. */
export interface VisitBillPrint {
  visit: { id: number; opNo: string; token: number | null; visitDate: string; status: string; doctorName: string | null };
  patient: { id: number; name: string; uhid: string; phone: string | null };
  /** null without billing.receive / patient.view. */
  bills: OpBill[] | null;
  /** null without pharmacy.sell. */
  sales: PharmacySaleDetail[] | null;
  totals: { grandTotalPaise: number; paidPaise: number; balancePaise: number; paidByMode: Record<BillPaymentMode, number> };
  collectedBy: string[];
  header: PrintHeader;
}

// Vendors (purchases, payments to suppliers) and patient billing (OP bills).
import { z } from 'zod';

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

export const purchaseLineSchema = z.object({
  medicineId: z.number({ error: 'Choose a medicine' }).int().positive('Choose a medicine'),
  batchNo: z.string().trim().min(1, 'Batch no.').max(40),
  expiryDate: isoDate,
  quantity: z.number({ error: 'Qty' }).int().min(1, 'At least 1').max(1_000_000),
  unitCostPaise: paise('the cost'),
});

export const purchaseBillSchema = z.object({
  vendorId: z.number({ error: 'Choose a vendor' }).int().positive('Choose a vendor'),
  vendorBillNo: text(40),
  billDate: isoDate,
  notes: text(500),
  lines: z.array(purchaseLineSchema).min(1, 'Add at least one medicine').max(200),
});
export type PurchaseBillInput = z.infer<typeof purchaseBillSchema>;

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
  lines: { id: number; medicineName: string; batchNo: string; expiryDate: string; quantity: number; unitCostPaise: number; amountPaise: number; soldQty: number }[];
  payments: { id: number; amountPaise: number; mode: VendorPaymentMode; reference: string | null; paidAt: string; paidByName: string | null }[];
  canCancel: boolean;
}

// ---------------------------------------------------------------------------
// Patient billing (OP bill: consultation + lab + other; pharmacy is paid at its counter)
// ---------------------------------------------------------------------------

export const BILL_PAYMENT_MODES = ['cash', 'upi', 'card'] as const;
export type BillPaymentMode = (typeof BILL_PAYMENT_MODES)[number];

export const billUpdateSchema = z.object({
  consultationFeePaise: paise('the fee').optional(),
  otherChargesPaise: paise('the amount').optional(),
  otherChargesLabel: text(60),
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

export interface OpBill {
  id: number;
  billNo: string;
  visitId: number;
  opNo: string;
  token: number | null;
  billDate: string;
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

export const labReleaseSchema = z.object({ reason: z.string().trim().min(3, 'Give a short reason').max(300) });

export function billStatus(totalPaise: number, paidPaise: number): OpBill['status'] {
  if (paidPaise <= 0) return totalPaise === 0 ? 'paid' : 'unpaid';
  return paidPaise >= totalPaise ? 'paid' : 'part_paid';
}

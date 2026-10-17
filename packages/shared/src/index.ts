import { z } from 'zod';
import { dispenseQuantitiesSchema } from './billing.js';

// ---------------------------------------------------------------------------
// Permissions. The platform core owns the CORE list; each product (clinic,
// school, ...) adds its own list. A role is just a set of these strings.
// ---------------------------------------------------------------------------

export const CORE_PERMISSIONS = ['users.manage', 'settings.manage', 'audit.view'] as const;

export const CLINIC_PERMISSIONS = [
  'dashboard.view',
  'patient.view',
  'patient.create',
  'patient.edit',
  'patient.delete',
  'prescription.write',
  'lab.order',
  'billing.receive',
  'lab.view',
  'pharmacy.sell',
  'inventory.view',
  'inventory.manage',
  'vendor.manage',
  'treatment.give',
  // Money reports: Billing > Payment reports, Pharmacy > Pharmacy reports, every doctor's line on the dashboard.
  'reports.view',
] as const;

/** Only this role (and the owner) may ever hold these: managing staff and roles. */
export const ADMIN_ROLE_KEY = 'branch_admin';
export const ADMIN_ONLY_PERMISSIONS = ['users.manage', 'settings.manage'] as const;

export const ALL_PERMISSIONS = [...CORE_PERMISSIONS, ...CLINIC_PERMISSIONS] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Starting roles for a new organization (editable later in Settings).
 * Front desk and Pharmacist both hold billing.receive + pharmacy.sell: either one at the counter can take a visit's whole payment.
 */
export const DEFAULT_ROLES: { key: string; name: string; permissions: Permission[] }[] = [
  {
    key: 'branch_admin',
    name: 'Branch admin',
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'audit.view'),
  },
  {
    key: 'doctor',
    name: 'Doctor',
    permissions: ['dashboard.view', 'patient.view', 'patient.create', 'patient.edit', 'prescription.write', 'lab.order', 'lab.view', 'inventory.view', 'treatment.give'],
  },
  // A doctor from outside who comes for some hours: sees and treats the patients, orders and reads lab tests.
  // No registration, stock, money or settings pages. (Change what they may do in Settings > Roles.)
  { key: 'visiting_doctor', name: 'Visiting doctor', permissions: ['dashboard.view', 'patient.view', 'patient.edit', 'prescription.write', 'lab.order', 'lab.view'] },
  { key: 'front_desk', name: 'Front desk', permissions: ['dashboard.view', 'patient.view', 'patient.create', 'patient.edit', 'billing.receive', 'pharmacy.sell'] },
  {
    key: 'pharmacist',
    name: 'Pharmacist',
    permissions: ['dashboard.view', 'patient.view', 'pharmacy.sell', 'billing.receive', 'inventory.view', 'inventory.manage', 'vendor.manage'],
  },
  { key: 'lab_technician', name: 'Lab technician', permissions: ['dashboard.view', 'patient.view', 'lab.view'] },
  // Gives the medicines that are given in the hospital (injections, drips) and ticks each dose.
  { key: 'nurse', name: 'Nurse', permissions: ['dashboard.view', 'patient.view', 'treatment.give'] },
];

/** The roles whose holders are doctors of the branch without being ticked one by one. */
export const DOCTOR_ROLE_KEYS = ['doctor', 'visiting_doctor'];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Login id: an Indian mobile number, typed any way ("98765 43210", "+91…", "0…").
 * Stored and compared as +91XXXXXXXXXX. One mobile = one account across the whole system.
 */
export const loginMobileSchema = z
  .string({ error: 'Enter your mobile number' })
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .transform((d) => (d.length > 10 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d))
  .refine((d) => /^[6-9]\d{9}$/.test(d), 'Enter a 10-digit mobile number')
  .transform((d) => `+91${d}`);

export const loginSchema = z.object({
  mobile: loginMobileSchema,
  password: z.string().min(1, 'Enter your password').max(200),
});
export type LoginInput = z.input<typeof loginSchema>;

export interface MeBranch {
  slug: string;
  name: string;
  roleName: string;
  permissions: Permission[];
}

export interface MeResponse {
  user: { id: number; name: string; mobile: string; isOwner: boolean; isPlatformAdmin: boolean };
  organization: { id: number; name: string };
  branches: MeBranch[];
}

const password = z.string().min(8, 'Use at least 8 characters').max(200);

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: password })
  .refine((v) => v.newPassword !== v.currentPassword, { message: 'Choose a different password', path: ['newPassword'] });

// ---------------------------------------------------------------------------
// Settings: staff, branches, roles
// ---------------------------------------------------------------------------

export const newStaffSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  mobile: loginMobileSchema,
  password,
  roleId: z.number({ error: 'Choose a role' }).int().positive('Choose a role'),
});
export type NewStaffInput = z.input<typeof newStaffSchema>;

export const updateStaffSchema = z.object({
  roleId: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(120).optional(),
});

export const resetPasswordSchema = z.object({ password });

export interface StaffMember {
  userId: number;
  name: string;
  mobile: string;
  roleId: number;
  roleKey: string;
  roleName: string;
  addedAt: string;
  /** false = account deactivated (cannot sign in anywhere). */
  isActive: boolean;
}

export interface RoleInfo {
  id: number;
  key: string;
  name: string;
  permissions: Permission[];
}

export const branchInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the branch name').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,30}$/, '2–30 lowercase letters, numbers or dashes (used in the web address)'),
  address: z.string().trim().max(300).transform((v) => (v === '' ? null : v)).nullable().optional(),
  phone: z.string().trim().max(30).transform((v) => (v === '' ? null : v)).nullable().optional(),
});
export const updateBranchSchema = branchInputSchema.omit({ slug: true }).partial();
export type BranchInput = z.input<typeof branchInputSchema>;

export interface BranchInfo {
  id: number;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  staffCount: number;
}

export const rolePermissionsSchema = z.object({ permissions: z.array(z.string()) });

/** Settings → Owner: the owner's own name and login mobile, and the organization's name. */
export const ownerDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  mobile: loginMobileSchema,
  organizationName: z.string().trim().min(2, 'Enter the organization name').max(120),
});
export type OwnerDetailsInput = z.input<typeof ownerDetailsSchema>;

/** Human labels for the permissions grid. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'users.manage': 'Manage staff',
  'settings.manage': 'Branch settings',
  'audit.view': 'View audit log',
  'dashboard.view': 'Dashboard',
  'patient.view': 'View patients & visits',
  'patient.create': 'Register patients & start visits',
  'patient.edit': 'Edit patients & visits',
  'patient.delete': 'Delete patients & visits',
  'prescription.write': 'Write prescriptions',
  'lab.order': 'Order lab tests',
  'billing.receive': 'Billing & payments',
  'reports.view': 'Reports: payment & pharmacy reports',
  'lab.view': 'Lab queue',
  'treatment.give': 'Give treatments (tick doses given in the hospital)',
  'pharmacy.sell': 'Pharmacy: dispense & sell',
  'inventory.view': 'View medicines & stock',
  'inventory.manage': 'Manage medicines & stock',
  'vendor.manage': 'Vendors & purchases',
};

// ---------------------------------------------------------------------------
// Money: always whole paise (integers) in the API and database. ₹12.50 = 1250.
// ---------------------------------------------------------------------------

export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const formatRupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// Clinic: medicines & stock (branch-scoped)
// ---------------------------------------------------------------------------

export const MEDICINE_FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'other'] as const;
export type MedicineForm = (typeof MEDICINE_FORMS)[number];
/** What one unit of each form is called (stock and quantities are counted in these). */
export const FORM_UNIT: Record<MedicineForm, string> = {
  tablet: 'tab',
  capsule: 'cap',
  syrup: 'bottle',
  injection: 'vial',
  ointment: 'tube',
  drops: 'bottle',
  other: 'unit',
};

export const medicineInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the medicine name').max(120),
  form: z.enum(MEDICINE_FORMS),
  strength: z.string().trim().max(40).transform((v) => (v === '' ? null : v)).nullable().optional(),
  pricePaise: z.number({ error: 'Enter the price' }).int().min(0, 'Enter the price').max(10_000_000),
  reorderLevel: z.number().int().min(0).max(100_000).optional(),
});
export type MedicineInput = z.output<typeof medicineInputSchema>;

export interface Medicine {
  id: number;
  name: string;
  form: MedicineForm;
  strength: string | null;
  pricePaise: number;
  reorderLevel: number;
  /** Units in stock that have not expired. */
  stock: number;
  /** Earliest expiry among batches still in stock. */
  nextExpiry: string | null;
  /** Batch number of that earliest-expiring batch: the one the next sale takes from first. */
  nextBatchNo: string | null;
}

export const batchInputSchema = z.object({
  batchNo: z.string().trim().min(1, 'Enter the batch number').max(40),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the expiry date'),
  quantity: z.number({ error: 'Enter the quantity' }).int().min(1, 'At least 1').max(1_000_000),
});
export type BatchInput = z.infer<typeof batchInputSchema>;

export interface MedicineBatch {
  id: number;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  receivedQty: number;
  createdAt: string;
}

/** A batch still on the shelf, as listed in the stock report (expiring soon or already expired). */
export interface StockReportBatch {
  batchId: number;
  medicineId: number;
  medicineName: string;
  form: MedicineForm;
  strength: string | null;
  batchNo: string;
  expiryDate: string;
  /** Days from today to the expiry date: 0 = expires today, negative = expired that many days ago. */
  daysLeft: number;
  quantity: number;
  /** quantity × the medicine's selling price. */
  valuePaise: number;
  /** Vendor of the purchase bill the batch came in on; null if it was added without a bill (or the bill was cancelled). */
  vendorName: string | null;
}

/** Expiry and stock report for the pharmacist. "Sellable" = unexpired with units left. */
export interface StockReport {
  /** The server's local day the report was made for (YYYY-MM-DD). */
  today: string;
  /** Sellable batches expiring within the next 90 days, earliest first. */
  expiring: StockReportBatch[];
  /** Expired batches that still have units on the shelf, most recently expired first. */
  expired: StockReportBatch[];
  /** Medicines at or below their reorder level (out of stock included), lowest stock first. */
  lowStock: Pick<Medicine, 'id' | 'name' | 'form' | 'strength' | 'stock' | 'reorderLevel'>[];
  summary: {
    medicines: number;
    inStock: number;
    outOfStock: number;
    lowStock: number;
    /** Batches expiring within 30 / 60 / 90 days (each count includes the shorter windows). */
    expiring30: number;
    expiring60: number;
    expiring90: number;
    /** Expired batches still on the shelf. */
    expired: number;
    /** All sellable stock at selling price. */
    sellableValuePaise: number;
    expiredValuePaise: number;
    /** Cost of the sellable units whose purchase cost is known (batches that came in on a purchase bill). */
    costValuePaise: number;
    costKnownUnits: number;
    sellableUnits: number;
  };
}

// ---------------------------------------------------------------------------
// Clinic: prescriptions
// ---------------------------------------------------------------------------

/**
 * Units per day from a dose like "1-0-1" (morning-noon-night) or "1-1-1-1"; halves allowed ("0.5-0-1").
 * null for free-text doses ("SOS", "as needed") -- then the quantity must be typed.
 */
export function unitsPerDay(dose: string): number | null {
  if (!/^\d+(\.(?:25|5|75))?(-\d+(\.(?:25|5|75))?){1,3}$/.test(dose.trim())) return null;
  return dose
    .trim()
    .split('-')
    .reduce((s, x) => s + Number(x), 0);
}

/** Suggested quantity = units per day × days, rounded up. */
export function suggestedQuantity(dose: string, days: number): number | null {
  const perDay = unitsPerDay(dose);
  return perDay == null || !days ? null : Math.ceil(perDay * days);
}

export const prescriptionItemSchema = z.object({
  medicineId: z.number({ error: 'Choose a medicine' }).int().positive('Choose a medicine'),
  dose: z.string().trim().min(1, 'Enter the dose, e.g. 1-0-1').max(40),
  days: z.number({ error: 'Enter days' }).int().min(1, 'At least 1 day').max(365),
  quantity: z.number().int().min(1, 'At least 1').max(10_000).nullable().optional(),
  instructions: z.string().trim().max(200).transform((v) => (v === '' ? null : v)).nullable().optional(),
  /** Given in the hospital, dose by dose (an injection, a drip): the nurse ticks each dose on the Treatments page. */
  givenHere: z.boolean().optional(),
});
/** Changing a line already on the prescription (also one a bookmark put there): the medicine itself stays. */
export const prescriptionItemEditSchema = prescriptionItemSchema.omit({ medicineId: true, givenHere: true });
export type PrescriptionItemInput = z.output<typeof prescriptionItemSchema>;
export type PrescriptionItemFormValues = z.input<typeof prescriptionItemSchema>;

export const PRESCRIPTION_STATUSES = ['pending', 'dispensed', 'declined'] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

/** Doses and instructions this branch has used most, offered as one-click choices when prescribing. */
export interface PrescriptionSuggestions {
  doses: string[];
  instructions: string[];
}

export interface PrescriptionItem {
  id: number;
  visitId: number;
  medicineId: number;
  medicineName: string;
  form: MedicineForm;
  strength: string | null;
  dose: string;
  days: number;
  quantity: number;
  instructions: string | null;
  status: PrescriptionStatus;
  pricePaise: number;
  stock: number;
  /** Given in the hospital: how many doses there are and how many were given so far. */
  givenHere: boolean;
  dosesTotal: number;
  dosesGiven: number;
}

// ---------------------------------------------------------------------------
// Clinic: bookmarks (ready-made treatments) and the instructions of a visit
// ---------------------------------------------------------------------------

/** One line of a bookmark: a medicine as on a prescription, or an instruction to carry out. */
export const bookmarkLineSchema = z.discriminatedUnion('kind', [
  prescriptionItemSchema.extend({ kind: z.literal('medicine') }),
  z.object({ kind: z.literal('instruction'), text: z.string().trim().min(2, 'Write the instruction').max(200) }),
]);
export const bookmarkInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name, e.g. Dengue').max(80),
  lines: z.array(bookmarkLineSchema).min(1, 'Add at least one medicine or instruction').max(40),
});
export type BookmarkInput = z.input<typeof bookmarkInputSchema>;

/**
 * Which lines of the bookmark go onto the visit (the doctor unticks what this patient does not need), each with
 * what was changed for this patient only -- the dose, days, quantity, instructions, or the instruction's text.
 * The bookmark itself stays as it is.
 */
export const bookmarkApplySchema = z.object({
  lines: z
    .array(
      z.object({
        id: z.number().int().positive(),
        dose: z.string().trim().min(1, 'Enter the dose, e.g. 1-0-1').max(40).optional(),
        days: z.number({ error: 'Enter days' }).int().min(1, 'At least 1 day').max(365).optional(),
        quantity: z.number().int().min(1, 'At least 1').max(10_000).nullable().optional(),
        instructions: z.string().trim().max(200).transform((v) => (v === '' ? null : v)).nullable().optional(),
        text: z.string().trim().min(2, 'Write the instruction').max(200).optional(),
      }),
    )
    .min(1, 'Tick at least one line')
    .max(40),
});
export type BookmarkApplyInput = z.input<typeof bookmarkApplySchema>;

export type BookmarkLine =
  | { id: number; kind: 'medicine'; medicineId: number; medicineName: string; strength: string | null; form: MedicineForm; dose: string; days: number; quantity: number | null; instructions: string | null; givenHere: boolean; /** Today's rate per unit. */ pricePaise: number; /** Today's stock; 0 = cannot be prescribed now. */ stock: number; /** false = no longer in the medicine list. */ available: boolean }
  | { id: number; kind: 'instruction'; text: string };

export interface Bookmark {
  id: number;
  name: string;
  lines: BookmarkLine[];
}

/** An instruction on a visit; done = ticked by someone as carried out. */
export interface VisitInstruction {
  id: number;
  visitId: number;
  text: string;
  bookmarkName: string | null;
  doneAt: string | null;
  doneByName: string | null;
}

// ---------------------------------------------------------------------------
// Clinic: treatments given in the hospital
// ---------------------------------------------------------------------------

/** Doses nobody ticked stay on the nurse's list this many days back. */
export const TREATMENT_LOOKBACK_DAYS = 3;
const TIMES_OF_DAY = ['Morning', 'Afternoon', 'Night'];

/**
 * The doses of one day from a dose pattern: "1-0-1" = Morning and Night; "1-1-1-1" = Dose 1..4;
 * a typed dose ("SOS", "5 ml twice") = one dose a day.
 */
export function treatmentSlots(dose: string): { slotNo: number; slot: string; amount: string | null }[] {
  const parts = dose.trim().split('-');
  if (parts.length < 2 || parts.length > 4 || parts.some((x) => !/^\d+(\.(?:25|5|75))?$/.test(x))) return [{ slotNo: 1, slot: 'Dose', amount: null }];
  const names = parts.length === 3 ? TIMES_OF_DAY : parts.length === 2 ? ['Morning', 'Night'] : parts.map((_, i) => `Dose ${i + 1}`);
  return parts.map((amount, i) => ({ slotNo: i + 1, slot: names[i]!, amount })).filter((s) => Number(s.amount) > 0);
}

export const treatmentGiveSchema = z.object({
  note: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
});

export interface TreatmentDose {
  id: number;
  prescriptionItemId: number;
  visitId: number;
  opNo: string;
  token: number | null;
  patientId: number;
  patientName: string;
  patientUhid: string;
  patientConditions: string | null;
  medicineName: string;
  strength: string | null;
  form: MedicineForm;
  dose: string;
  days: number;
  instructions: string | null;
  /** pending = the pharmacy has not handed the medicine over yet. */
  itemStatus: PrescriptionStatus;
  dueDate: string;
  slotNo: number;
  slot: string;
  amount: string | null;
  givenAt: string | null;
  givenByName: string | null;
  note: string | null;
}

export interface TreatmentList {
  date: string;
  today: string;
  doses: TreatmentDose[];
  /** Only for today: doses of the last few days that were never given. */
  missed: TreatmentDose[];
}

// ---------------------------------------------------------------------------
// Clinic: pharmacy
// ---------------------------------------------------------------------------

export const PAYMENT_MODES = ['cash', 'upi', 'card'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const dispenseSchema = z.object({
  visitId: z.number().int().positive(),
  itemIds: z.array(z.number().int().positive()).min(1, 'Tick at least one medicine'),
  quantities: dispenseQuantitiesSchema,
  paymentMode: z.enum(PAYMENT_MODES),
});

/** Direct (over-the-counter) sale: no visit, the customer is optional. Each medicine once. */
export const directSaleSchema = z.object({
  items: z
    .array(
      z.object({
        medicineId: z.number({ error: 'Choose a medicine' }).int().positive('Choose a medicine'),
        quantity: z.number({ error: 'Enter the quantity' }).int('Whole units only').min(1, 'At least 1').max(10_000),
      }),
    )
    .min(1, 'Add at least one medicine')
    .max(100)
    .superRefine((items, ctx) => {
      items.forEach((item, i) => {
        if (items.findIndex((x) => x.medicineId === item.medicineId) !== i) ctx.addIssue({ code: 'custom', message: 'This medicine is already in the sale', path: [i, 'medicineId'] });
      });
    }),
  paymentMode: z.enum(PAYMENT_MODES),
  patientId: z.number().int().positive().nullable().optional(),
});

export interface PharmacyQueueEntry {
  visitId: number;
  opNo: string;
  visitDate: string;
  patientId: number;
  patientName: string;
  patientUhid: string;
  doctorName: string | null;
  /** The doctor's note to the pharmacy for this visit. */
  pharmacyNote: string | null;
  items: PrescriptionItem[];
}

export interface PharmacySale {
  id: number;
  saleNo: string;
  visitId: number | null;
  patientName: string;
  totalPaise: number;
  paymentMode: PaymentMode;
  createdAt: string;
  lines: { medicineName: string; batchNo: string; quantity: number; unitPricePaise: number; amountPaise: number }[];
}

/** What a patient bought last time at the pharmacy (their most recent sale, one line per medicine), to sell the same again. */
export interface LastPurchase {
  saleId: number;
  saleNo: string;
  createdAt: string;
  items: { medicineId: number; medicineName: string; strength: string | null; quantity: number; /** false = no longer in the medicine list. */ available: boolean }[];
}

/** One sale as printed on the pharmacy bill. */
export interface PharmacySaleDetail {
  id: number;
  saleNo: string;
  /** UTC, ISO 8601. */
  createdAt: string;
  paymentMode: PaymentMode;
  totalPaise: number;
  soldByName: string | null;
  /** null for a walk-in customer. */
  patient: { name: string; uhid: string; phone?: string | null } | null;
  /** null for a direct sale (no prescription). */
  visitId: number | null;
  opNo: string | null;
  lines: { medicineName: string; form: MedicineForm; strength: string | null; batchNo: string; expiryDate: string; quantity: number; unitPricePaise: number; amountPaise: number }[];
}

// ---------------------------------------------------------------------------
// Clinic: lab (tests catalog + orders)
// ---------------------------------------------------------------------------

/** One result line of a test (e.g. "Basophils" of a CBC): what is measured, how, in what unit, and the normal range. */
export const labTestLineSchema = z.object({
  /** An existing line of the test being edited; without it the line is new. */
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, 'Enter the name').max(120),
  method: z.string().trim().max(120).default(''),
  unit: z.string().trim().max(40).default(''),
  refRange: z.string().trim().max(120).default(''),
  /** May be left empty when the test is completed. */
  optional: z.boolean().default(false),
});
export type LabTestLine = z.infer<typeof labTestLineSchema>;

export const labTestInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the test name').max(120),
  pricePaise: z.number({ error: 'Enter the price' }).int().min(0).max(10_000_000),
  /** The heading it prints under, e.g. "DEPARTMENT OF HEMATOLOGY". */
  department: z.string().trim().min(1).max(120).optional(),
  /** The result lines. Given on an edit, it is the whole list: lines left out are removed. */
  parameters: z.array(labTestLineSchema).min(1, 'Add at least one result line').max(60).optional(),
});
export type LabTestInput = z.infer<typeof labTestInputSchema>;

/** A test with its result lines, for the edit form. */
export interface LabTestDetail {
  id: number;
  name: string;
  pricePaise: number;
  department: string;
  kind: 'panel' | 'card';
  parameters: Required<LabTestLine>[];
}

export interface LabTest {
  id: number;
  name: string;
  pricePaise: number;
  department: string;
  kind: 'panel' | 'card';
  parameterCount: number;
}

/** Tests and/or packages to order; at least one of them. (The base, without the check, can be extended.) */
export const labOrderBaseSchema = z.object({ testIds: z.array(z.number().int().positive()).max(100).default([]), packageIds: z.array(z.number().int().positive()).max(20).default([]) });
const someTest = (d: { testIds: number[]; packageIds: number[] }) => d.testIds.length + d.packageIds.length > 0;
export const labOrderInputSchema = labOrderBaseSchema.refine(someTest, { message: 'Choose at least one test', path: ['testIds'] });
export const directLabSchema = labOrderBaseSchema.extend({ doctorUserId: z.number().int().positive().nullable().optional(), referredBy: z.string().trim().max(120).nullable().optional() }).refine(someTest, { message: 'Choose at least one test', path: ['testIds'] });

/** A package of tests at one price (Fever profile...). */
export const labPackageSchema = z.object({
  name: z.string().trim().min(2, 'Give the package a name').max(80),
  pricePaise: z.number({ error: 'Enter the price' }).int().min(0).max(100_000_00),
  testIds: z.array(z.number().int().positive()).min(2, 'Pick at least two tests').max(30),
});
export type LabPackageInput = z.infer<typeof labPackageSchema>;
export interface LabPackage extends LabPackageInput {
  id: number;
  /** What the tests cost one by one (to show the saving). */
  testsPaise: number;
}
/** Which doctor a lab-only or bill-only visit is counted under in the reports (null = none). */
export const directVisitSchema = z.object({ doctorUserId: z.number().int().positive().nullable().optional() });
/** What a visit made by "Direct lab test" (no doctor) carries as its complaint. */
export const DIRECT_LAB_COMPLAINT = 'Lab test only';
/** The same for a visit made by "Create bill": only charges (a dressing, an injection), no consultation fee. */
export const DIRECT_BILL_COMPLAINT = 'Bill only';

export const LAB_ORDER_STATUSES = ['ordered', 'sample_collected', 'completed', 'cancelled'] as const;
export type LabOrderStatus = (typeof LAB_ORDER_STATUSES)[number];

export interface LabOrder {
  id: number;
  visitId: number;
  testId: number;
  testName: string;
  pricePaise: number;
  status: LabOrderStatus;
  createdAt: string;
  sampleCollectedAt: string | null;
  completedAt: string | null;
}

/** Save results for one order; complete=true marks the test done (report can be printed). */
export const labResultsSchema = z.object({
  results: z.array(z.object({ parameterId: z.number().int().positive(), value: z.string().trim().max(120) })).max(200),
  complete: z.boolean().optional(),
  /** Lines the lab unticked "Required" on for this one result: they may stay empty when completing. */
  notRequired: z.array(z.number().int().positive()).max(200).optional(),
});

export interface LabReportParameter {
  id: number;
  name: string;
  method: string;
  unit: string;
  refRange: string;
  type: 'number' | 'text';
  options: string[];
  noFlag: boolean;
  /** May be left empty when the test is completed. */
  optional: boolean;
  value: string;
  flag: '' | 'H' | 'L' | '!';
}

export interface LabReportTest {
  orderId: number;
  testId: number;
  name: string;
  department: string;
  kind: 'panel' | 'card';
  status: LabOrderStatus;
  sampleCollectedAt: string | null;
  completedAt: string | null;
  parameters: LabReportParameter[];
}

/** Everything the results screen and the printed report need for one visit. */
export interface LabReport {
  visit: { id: number; opNo: string; visitDate: string; doctorName: string | null; labNote: string | null; referredBy: string | null };
  patient: { id: number; name: string; uhid: string; gender: string | null; age: number | null; phone: string | null };
  tests: LabReportTest[];
  header: PrintHeader;
  billNo: string | null;
  /** When the (first) bill of these tests was made, UTC ISO; null until billed. */
  billedAt: string | null;
  /** Lab charges paid? Printing needs paid or an admin release. */
  payment?: { paid: boolean; released: boolean; releaseReason: string | null; duePaise: number; printAllowed: boolean };
}

// ---------------------------------------------------------------------------
// Print header (per branch): used on lab reports and bills
// ---------------------------------------------------------------------------

/** A small image as a data URL (PNG/JPEG/WebP), at most ~300 KB. */
const imageDataUrl = z
  .string()
  .max(400_000, 'Image is too large (max 300 KB)')
  .refine((v) => v === '' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v), 'Use a PNG, JPG or WebP image')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

const headerText = (max: number) => z.string().trim().max(max).default('');

export const printHeaderSchema = z.object({
  title: headerText(80),
  address: headerText(200),
  phone: headerText(60),
  logo: imageDataUrl,
  doctors: z
    .array(z.object({ name: headerText(60), degree: headerText(60), role: headerText(80) }))
    .max(3)
    .default([]),
  leftSignName: headerText(60),
  leftSignTitle: headerText(60),
  leftSignImage: imageDataUrl,
  rightSignName: headerText(60),
  rightSignTitle: headerText(60),
  rightSignImage: imageDataUrl,
  /** Print the logo large and faint behind the results of the lab report. */
  watermark: z.boolean().default(false),
  /** Printed at the end of the lab report, under the signatures (timings, a disclaimer...). */
  footer: headerText(300),
});
export type PrintHeaderInput = z.input<typeof printHeaderSchema>;
export type PrintHeader = z.output<typeof printHeaderSchema>;

export const EMPTY_PRINT_HEADER: PrintHeader = {
  title: '',
  address: '',
  phone: '',
  logo: null,
  doctors: [],
  leftSignName: '',
  leftSignTitle: 'Lab Technician',
  leftSignImage: null,
  rightSignName: '',
  rightSignTitle: '',
  rightSignImage: null,
  watermark: false,
  footer: '',
};

export * from './lab-catalog.js';

export interface LabQueueEntry extends LabOrder {
  opNo: string;
  patientId: number;
  patientName: string;
  patientUhid: string;
  doctorName: string | null;
  /** The doctor's note to the lab for this visit. */
  labNote: string | null;
  /** Where the patient is now ('at_lab' = sent to the lab and not back with the doctor yet). */
  visitStatus: string;
  /** The visit's lab charges are paid (or an admin released the report). */
  paid: boolean;
}

/** One lab order on the patient's Lab tab (all visits, newest first). */
export interface PatientLabOrder extends LabOrder {
  opNo: string;
  token: number | null;
  visitDate: string;
  /** Lab charges of its visit: paid, or released by an admin. The report prints when printAllowed. */
  paid: boolean;
  released: boolean;
  printAllowed: boolean;
}

// ---------------------------------------------------------------------------
// Clinic: patients (checked in the browser AND again by the API)
// ---------------------------------------------------------------------------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

/** 'female child' / 'male child': written F/Ch and M/Ch on paper. */
export const GENDERS = ['female', 'male', 'female child', 'male child', 'other'] as const;
export const GENDER_LABEL: Record<(typeof GENDERS)[number], string> = { female: 'Female', male: 'Male', 'female child': 'FCH', 'male child': 'MCH', other: 'Other' };

/** Below this age a patient is shown as a child. */
export const CHILD_BELOW_YEARS = 18;
/**
 * A patient's age for reading: "3 months" / "12 days" for a baby (needs the date of birth), else "24 yrs".
 * `child`: under CHILD_BELOW_YEARS, or registered as FCH / MCH. null when neither date of birth nor age is known.
 */
export function ageInfo(p: { dob: string | null; ageYears: number | null; gender?: string | null }, today = new Date()): { text: string; years: number; child: boolean } | null {
  let years = p.ageYears;
  let text: string | null = null;
  if (p.dob && /^\d{4}-\d{2}-\d{2}$/.test(p.dob)) {
    const [y, m, d] = p.dob.split('-').map(Number) as [number, number, number];
    const now = new Date(today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00Z');
    let months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
    if (now.getUTCDate() < d) months--;
    years = Math.floor(months / 12);
    if (months < 1) text = `${Math.max(0, Math.round((now.getTime() - Date.UTC(y, m - 1, d)) / 86_400_000))} days`;
    else if (months < 12) text = `${months} month${months === 1 ? '' : 's'}`;
  }
  if (years == null || years < 0) return null;
  return { text: text ?? `${years} yrs`, years, child: years < CHILD_BELOW_YEARS || /child/.test(p.gender ?? '') };
}

/** A dose pattern for reading: "0.5-0-0.75" -> "½-0-¾". */
export const prettyDose = (dose: string) => dose.replace(/(?<![\d.])0\.25(?!\d)/g, '¼').replace(/(?<![\d.])0\.5(?!\d)/g, '½').replace(/(?<![\d.])0\.75(?!\d)/g, '¾');

/** Indian mobile number, typed any way ("98765 43210", "+91…", "0…"); stored as +91XXXXXXXXXX. */
const mobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .transform((d) => (d.length > 10 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d))
  .refine((d) => d === '' || /^[6-9]\d{9}$/.test(d), 'Enter a 10-digit mobile number')
  .transform((d) => (d === '' ? null : `+91${d}`))
  .nullable()
  .optional();

export const patientInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  phone: mobile,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  dob: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use a valid date')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  ageYears: z.number().int().min(0).max(130).nullable().optional(),
  bloodGroup: optionalText(5),
  weightKg: z.number({ error: 'Enter the weight in kg' }).min(0.5, 'Check the weight').max(400, 'Check the weight').nullable().optional(),
  heightCm: z.number({ error: 'Enter the height in cm' }).min(20, 'Check the height').max(260, 'Check the height').nullable().optional(),
  address: optionalText(500),
  /** Long-term conditions, comma-separated (see splitConditions). */
  conditions: optionalText(300),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: mobile,
});
export const patientDeactivateSchema = z.object({ reason: z.string().trim().min(3, 'Say why, in a few words').max(300) });

/** What the form holds (before the transforms). */
export type PatientFormValues = z.input<typeof patientInputSchema>;
/** What the API stores (after the transforms). */
export type PatientInput = z.output<typeof patientInputSchema>;

/** Long-term conditions offered as one-click choices; anything else is typed. */
export const COMMON_CONDITIONS = ['Diabetes (Sugar)', 'Hypertension (BP)', 'Heart disease', 'Asthma', 'Thyroid', 'Kidney disease', 'Cancer', 'Epilepsy', 'TB'] as const;
/** "Diabetes, Asthma" -> ['Diabetes', 'Asthma'] (how patient.conditions is stored). */
export const splitConditions = (conditions: string | null | undefined): string[] =>
  (conditions ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export interface Patient {
  id: number;
  /** Set while the patient is deactivated: nothing new can be made for them until someone activates them again. */
  deactivatedAt: string | null;
  deactivatedReason: string | null;
  /** Only in the patients list: the balance still due on this patient's bills. */
  duePaise?: number;
  /** Only in the patients list: the newest visit that was not cancelled. */
  lastVisit?: { date: string; at: string; complaint: string | null } | null;
  /** Unique Health ID, e.g. AH000001 (unique across the organization). */
  uhid: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: (typeof GENDERS)[number] | null;
  dob: string | null;
  ageYears: number | null;
  bloodGroup: string | null;
  weightKg: number | null;
  heightCm: number | null;
  address: string | null;
  conditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Clinic: OP (out-patient) visits
// ---------------------------------------------------------------------------

/**
 * Where the patient is: waiting -> with_doctor -> (at_lab -> back to with_doctor)* -> at_counter -> completed; or cancelled.
 * with_doctor: inside now, at most one per doctor. at_lab: sent for tests. at_counter: at the pharmacy / billing counter.
 */
export const VISIT_STATUSES = ['waiting', 'with_doctor', 'at_lab', 'at_counter', 'completed', 'cancelled'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];
/** What editing a visit may set directly; the other steps go through "call next" and "send". */
export const VISIT_EDIT_STATUSES = ['waiting', 'completed', 'cancelled'] as const;

/** A vital sign: empty = not measured; otherwise a number within a sane range. */
const vital = (min: number, max: number, label: string, int = true) =>
  (int ? z.number().int(`${label}: whole number`) : z.number())
    .min(min, `${label}: check the value`)
    .max(max, `${label}: check the value`)
    .nullable()
    .optional();

export const visitInputSchema = z.object({
  doctorUserId: z.number().int().positive().nullable().optional(),
  complaint: optionalText(500),
  notes: optionalText(2000),
  /** Doctor's note to the pharmacy / to the lab for this visit. */
  pharmacyNote: optionalText(500),
  labNote: optionalText(500),
  /** An outside doctor who sent the patient (printed on the lab report). */
  referredBy: optionalText(120),
  bpSystolic: vital(50, 260, 'BP (upper)'),
  bpDiastolic: vital(30, 160, 'BP (lower)'),
  pulse: vital(20, 250, 'Pulse'),
  temperatureF: vital(90, 110, 'Temperature', false),
  spo2: vital(50, 100, 'SpO₂'),
  weightKg: vital(0.5, 400, 'Weight', false),
  heightCm: vital(20, 260, 'Height', false),
});
/** The doctor's fee for one visit; null = back to the branch's standard fee. */
export const visitFeeSchema = z.object({ consultationFeePaise: z.number({ error: 'Enter the fee' }).int().min(0, 'Enter the fee').max(100_000_00, 'Check the fee').nullable() });
/** GET /visits/:id: what this visit's consultation costs and whether it can still be changed. */
export interface VisitFee {
  /** What the patient is charged: the bill's fee once billed, else the visit's own fee, else the standard fee. */
  consultationFeePaise: number;
  /** The branch's standard fee (Settings). */
  standardFeePaise: number;
  /** A payment was taken on the bill that carries the fee: it can no longer be changed. */
  locked: boolean;
}

export const visitUpdateSchema = visitInputSchema.extend({
  status: z.enum(VISIT_EDIT_STATUSES, { error: 'Use "Call next" or the "What next?" buttons to move the patient' }).optional(),
});

/** Call the next patient in. No visitId = the server picks (back from the lab with results first, then the lowest token). */
export const visitCallNextSchema = z.object({
  /** Whose queue. Left out = the caller if they are a doctor here, else all doctors; null = all doctors. */
  doctorUserId: z.number().int().positive().nullable().optional(),
  visitId: z.number().int().positive().optional(),
});
/** The doctor's "what next?" for the patient inside; callNext also calls that doctor's next patient in. */
export const visitSendSchema = z.object({ to: z.enum(['lab', 'counter', 'waiting'], { error: 'Choose where the patient goes' }), callNext: z.boolean().optional() });
export type VisitSendTo = z.infer<typeof visitSendSchema>['to'];
export type VisitInput = z.output<typeof visitInputSchema>;
export type VisitFormValues = z.input<typeof visitInputSchema>;

/** The queue token: the day's running number at the end of the OP no. ("OP-261003-009" -> 9). null if the OP no. has another shape. */
export function opToken(opNo: string): number | null {
  const m = /^OP-\d{6}-(\d+)$/.exec(opNo);
  return m ? Number(m[1]) : null;
}

export interface OpVisit {
  id: number;
  /** OP number, e.g. OP-261002-001 (date + that day's sequence in the branch). */
  opNo: string;
  /** Token for the day (see opToken). */
  token: number | null;
  patientId: number;
  visitDate: string;
  status: VisitStatus;
  doctorUserId: number | null;
  doctorName: string | null;
  complaint: string | null;
  /** An outside doctor who sent the patient. */
  referredBy?: string | null;
  notes: string | null;
  pharmacyNote: string | null;
  labNote: string | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulse: number | null;
  temperatureF: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
  createdAt: string;
  /** Who started the visit; null for visits from before this was shown, or when that person is gone. */
  createdByName?: string | null;
  /** This visit's lab tests by status (cancelled ones are not counted). */
  lab: VisitLabSummary;
  /** Has lab tests and every one is completed: the patient goes back in before the next token. */
  labReady: boolean;
  /** Medicines on the prescription (removed ones are not counted). */
  medicineCount: number;
}

export interface VisitLabSummary {
  ordered: number;
  sampleCollected: number;
  completed: number;
}

export interface Doctor {
  userId: number;
  name: string;
}

/** GET /doctors: everyone who sees patients in this branch, and who new OP visits go to by default. */
export interface DoctorsResponse {
  doctors: Doctor[];
  defaultDoctorUserId: number | null;
}

/** Settings → Doctors: who (besides the Doctor-role staff) sees patients in this branch, and the default doctor. */
export const doctorSettingsSchema = z.object({
  doctorUserIds: z.array(z.number().int().positive()).max(500),
  defaultDoctorUserId: z.number().int().positive().nullable(),
});
export type DoctorSettingsInput = z.infer<typeof doctorSettingsSchema>;

/** Someone who can open the branch (the owner or an active member). */
export interface DoctorSettingsPerson {
  userId: number;
  name: string;
  roleName: string;
  isOwner: boolean;
  /** Has the Doctor role here: a doctor without being ticked. */
  isDoctorRole: boolean;
  isDoctor: boolean;
  /** Holds prescription.write here; only then can they be ticked. */
  canPrescribe: boolean;
}

export interface DoctorSettings {
  people: DoctorSettingsPerson[];
  defaultDoctorUserId: number | null;
}

/** A visit with the patient's name, for lists. */
export interface OpVisitRow extends OpVisit {
  patientName: string;
  patientUhid: string;
  patientConditions: string | null;
}

/** Why a patient was called in: back from the lab with results, the next token, or picked by hand. */
export type VisitCallReason = 'lab_ready' | 'next_token' | 'chosen';

/** The doctor's queue right now (today only), for the banner on the OP visits page. Same rule as "call next". */
export interface VisitQueue {
  /** Whose queue this is; null = all doctors of the branch. */
  doctorUserId: number | null;
  withDoctor: OpVisitRow[];
  next: { visit: OpVisitRow; reason: VisitCallReason } | null;
  /** At the lab with every result ready, token order. */
  labReady: OpVisitRow[];
}

/** POST /visits/call-next. previous = who was inside and went back to waiting (normally nobody). */
export interface VisitCallNextResponse {
  visit: OpVisitRow;
  previous: OpVisitRow | null;
  reason: VisitCallReason;
}

/** POST /visits/:id/send. next is there only with callNext, and null when nobody is waiting. */
export interface VisitSendResponse {
  visit: OpVisitRow;
  next: { visit: OpVisitRow; reason: VisitCallReason } | null;
}

/** Every API error has this shape. */
export interface ApiErrorBody {
  error: string;
  code: string;
  fields?: Record<string, string[]>;
}
export * from './billing.js';
export * from './purchase-import.js';

// ---------------------------------------------------------------------------
// Platform (you, hosting many customers): customers = organizations
// ---------------------------------------------------------------------------

export const newCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Enter the hospital / clinic name').max(120),
  idPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,4}$/, '2–4 letters, e.g. AH'),
  branchName: z.string().trim().min(2, 'Enter the first branch name').max(80),
  branchSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,30}$/, '2–30 lowercase letters, numbers or dashes'),
  ownerName: z.string().trim().min(2, 'Enter the owner name').max(120),
  ownerMobile: loginMobileSchema,
  ownerPassword: z.string().min(8, 'Use at least 8 characters').max(200),
});
export type NewCustomerInput = z.input<typeof newCustomerSchema>;

export interface Customer {
  id: number;
  name: string;
  idPrefix: string;
  isActive: boolean;
  createdAt: string;
  branches: number;
  staff: number;
  patients: number;
  ownerName: string | null;
  ownerMobile: string | null;
}

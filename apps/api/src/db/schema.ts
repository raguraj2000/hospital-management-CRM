// Clinic tables. Every one is branch-scoped (branchColumns) -- nothing is shared between branches.
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { branch, branchColumns, timestamps, user } from '@platform/core/schema';

export * from '@platform/core/schema';

export const patient = sqliteTable(
  'patient',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    /** UHID, e.g. AH000001. (Stored in the original "code" column.) */
    uhid: text('code').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    gender: text('gender', { enum: ['female', 'male', 'other'] }),
    dob: text('dob'),
    ageYears: integer('age_years'),
    bloodGroup: text('blood_group'),
    weightKg: real('weight_kg'),
    address: text('address'),
    /** Long-term conditions (Diabetes, Hypertension …), comma-separated: shown wherever the patient is seen. */
    conditions: text('conditions'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [
    uniqueIndex('ux_patient_code').on(t.branchId, t.uhid),
    index('ix_patient_name').on(t.branchId, t.name),
    index('ix_patient_phone').on(t.branchId, t.phone),
  ],
);

/** OP (out-patient) visit. opNo = OP-YYMMDD-NNN, the day's running number in this branch. */
export const opVisit = sqliteTable(
  'op_visit',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    patientId: integer('patient_id')
      .notNull()
      .references(() => patient.id),
    opNo: text('op_no').notNull(),
    /** Local date of the visit (YYYY-MM-DD). */
    visitDate: text('visit_date').notNull(),
    status: text('status', { enum: ['waiting', 'with_doctor', 'at_lab', 'at_counter', 'completed', 'cancelled'] })
      .notNull()
      .default('waiting'),
    /** Doctor seeing the patient (one of this branch's doctors: Doctor role, or listed in branch_doctor). */
    doctorUserId: integer('doctor_user_id').references(() => user.id),
    complaint: text('complaint'),
    notes: text('notes'),
    /** The doctor's notes to the counters: shown at the pharmacy and in the lab for this visit. */
    pharmacyNote: text('pharmacy_note'),
    labNote: text('lab_note'),
    /** The doctor's fee for THIS visit; null = the branch's standard fee (clinic_setting). */
    consultationFeePaise: integer('consultation_fee_paise'),
    // Vitals taken at this visit (all optional).
    bpSystolic: integer('bp_systolic'),
    bpDiastolic: integer('bp_diastolic'),
    pulse: integer('pulse'),
    temperatureF: real('temperature_f'),
    spo2: integer('spo2'),
    weightKg: real('weight_kg'),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [
    uniqueIndex('ux_op_visit_no').on(t.branchId, t.opNo),
    index('ix_op_visit_doctor').on(t.branchId, t.doctorUserId, t.visitDate),
    index('ix_op_visit_day').on(t.branchId, t.visitDate),
    index('ix_op_visit_patient').on(t.branchId, t.patientId),
  ],
);

// ---------------------------------------------------------------------------
// Pharmacy & inventory (all branch-scoped). Money is whole paise.
// ---------------------------------------------------------------------------

export const medicine = sqliteTable(
  'medicine',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    name: text('name').notNull(),
    form: text('form', { enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'other'] }).notNull(),
    strength: text('strength'),
    /** Selling price for ONE unit (tablet, bottle, ...), in paise. */
    pricePaise: integer('price_paise').notNull(),
    reorderLevel: integer('reorder_level').notNull().default(10),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_medicine_name').on(t.branchId, t.name)],
);

/** A delivery of stock. quantity = what is left; dispensing takes the earliest expiry first (FEFO). */
export const medicineBatch = sqliteTable(
  'medicine_batch',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    medicineId: integer('medicine_id')
      .notNull()
      .references(() => medicine.id),
    batchNo: text('batch_no').notNull(),
    expiryDate: text('expiry_date').notNull(),
    quantity: integer('quantity').notNull(),
    receivedQty: integer('received_qty').notNull(),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
  },
  (t) => [index('ix_batch_fefo').on(t.branchId, t.medicineId, t.expiryDate)],
);

export const prescriptionItem = sqliteTable(
  'prescription_item',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    medicineId: integer('medicine_id')
      .notNull()
      .references(() => medicine.id),
    dose: text('dose').notNull(),
    days: integer('days').notNull(),
    quantity: integer('quantity').notNull(),
    instructions: text('instructions'),
    /** Given in the hospital by a nurse, dose by dose (see treatment_dose), instead of taken at home. */
    givenHere: integer('given_here', { mode: 'boolean' }).notNull().default(false),
    /** pending -> dispensed (sold) or declined (patient didn't buy). */
    status: text('status', { enum: ['pending', 'dispensed', 'declined'] })
      .notNull()
      .default('pending'),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_rx_visit').on(t.branchId, t.visitId), index('ix_rx_status').on(t.branchId, t.status)],
);

/**
 * One dose of a medicine that is given in the hospital: made from the prescription line (dose pattern × days),
 * ticked by the nurse when given.
 */
export const treatmentDose = sqliteTable(
  'treatment_dose',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    prescriptionItemId: integer('prescription_item_id')
      .notNull()
      .references(() => prescriptionItem.id),
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    patientId: integer('patient_id')
      .notNull()
      .references(() => patient.id),
    /** Local day the dose is due (YYYY-MM-DD). */
    dueDate: text('due_date').notNull(),
    /** Order within the day: 1 = morning, 2 = afternoon, 3 = night (or the nth dose of a 4-a-day pattern). */
    slotNo: integer('slot_no').notNull(),
    slot: text('slot').notNull(),
    /** Units at this dose, as written in the pattern ("1", "0.5"); null for a typed dose. */
    amount: text('amount'),
    givenAt: text('given_at'),
    givenBy: integer('given_by').references(() => user.id),
    note: text('note'),
    ...timestamps,
  },
  (t) => [uniqueIndex('ux_treatment_dose').on(t.prescriptionItemId, t.dueDate, t.slotNo), index('ix_treatment_dose_day').on(t.branchId, t.dueDate)],
);

export const pharmacySale = sqliteTable(
  'pharmacy_sale',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    saleNo: text('sale_no').notNull(),
    visitId: integer('visit_id').references(() => opVisit.id),
    patientId: integer('patient_id').references(() => patient.id),
    totalPaise: integer('total_paise').notNull(),
    paymentMode: text('payment_mode', { enum: ['cash', 'upi', 'card'] }).notNull(),
    createdBy: integer('created_by').references(() => user.id),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex('ux_sale_no').on(t.branchId, t.saleNo), index('ix_sale_day').on(t.branchId, t.createdAt)],
);

export const pharmacySaleLine = sqliteTable(
  'pharmacy_sale_line',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    saleId: integer('sale_id')
      .notNull()
      .references(() => pharmacySale.id),
    prescriptionItemId: integer('prescription_item_id').references(() => prescriptionItem.id),
    medicineId: integer('medicine_id')
      .notNull()
      .references(() => medicine.id),
    batchId: integer('batch_id')
      .notNull()
      .references(() => medicineBatch.id),
    quantity: integer('quantity').notNull(),
    unitPricePaise: integer('unit_price_paise').notNull(),
    amountPaise: integer('amount_paise').notNull(),
  },
  (t) => [index('ix_sale_line_sale').on(t.saleId)],
);

// ---------------------------------------------------------------------------
// Lab (branch-scoped)
// ---------------------------------------------------------------------------

export const labTest = sqliteTable(
  'lab_test',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    name: text('name').notNull(),
    pricePaise: integer('price_paise').notNull(),
    department: text('department').notNull().default('OTHER TESTS'),
    /** 'panel' prints on the lab report, 'card' on the card-test report. */
    kind: text('kind', { enum: ['panel', 'card'] }).notNull().default('panel'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_lab_test_name').on(t.branchId, t.name)],
);

export const labOrder = sqliteTable(
  'lab_order',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    patientId: integer('patient_id')
      .notNull()
      .references(() => patient.id),
    testId: integer('test_id')
      .notNull()
      .references(() => labTest.id),
    /** Price when ordered (later price changes don't alter old orders). */
    pricePaise: integer('price_paise').notNull(),
    status: text('status', { enum: ['ordered', 'sample_collected', 'completed', 'cancelled'] })
      .notNull()
      .default('ordered'),
    orderedBy: integer('ordered_by').references(() => user.id),
    sampleCollectedAt: text('sample_collected_at'),
    completedAt: text('completed_at'),
    completedBy: integer('completed_by').references(() => user.id),
    ...timestamps,
  },
  (t) => [index('ix_lab_order_status').on(t.branchId, t.status), index('ix_lab_order_visit').on(t.branchId, t.visitId)],
);

/** What a test measures (e.g. CBC -> Haemoglobin, WBC ...), with method, unit and normal range. */
export const labTestParameter = sqliteTable(
  'lab_test_parameter',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    testId: integer('test_id')
      .notNull()
      .references(() => labTest.id),
    name: text('name').notNull(),
    method: text('method').notNull().default(''),
    unit: text('unit').notNull().default(''),
    refRange: text('ref_range').notNull().default(''),
    valueType: text('value_type', { enum: ['number', 'text'] })
      .notNull()
      .default('number'),
    /** JSON array of quick-pick values, e.g. ["Nil","+","++"]. */
    options: text('options'),
    noFlag: integer('no_flag', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_lab_param_test').on(t.branchId, t.testId)],
);

/** One result value per order + parameter. flag: H / L / ! (abnormal) or empty. */
export const labResult = sqliteTable(
  'lab_result',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    orderId: integer('order_id')
      .notNull()
      .references(() => labOrder.id),
    parameterId: integer('parameter_id')
      .notNull()
      .references(() => labTestParameter.id),
    value: text('value').notNull(),
    flag: text('flag').notNull().default(''),
    enteredBy: integer('entered_by').references(() => user.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('ux_lab_result').on(t.orderId, t.parameterId)],
);

// ---------------------------------------------------------------------------
// Vendors: purchase bills add stock; payments to vendors (branch-scoped)
// ---------------------------------------------------------------------------

export const vendor = sqliteTable(
  'vendor',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    gstNo: text('gst_no'),
    creditDays: integer('credit_days').notNull().default(0),
    notes: text('notes'),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_vendor_name').on(t.branchId, t.name)],
);

export const purchaseBill = sqliteTable(
  'purchase_bill',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    vendorId: integer('vendor_id')
      .notNull()
      .references(() => vendor.id),
    /** The vendor's own bill number, as printed on their paper. */
    vendorBillNo: text('vendor_bill_no'),
    billDate: text('bill_date').notNull(),
    dueDate: text('due_date').notNull(),
    totalPaise: integer('total_paise').notNull(),
    notes: text('notes'),
    createdBy: integer('created_by').references(() => user.id),
    createdAt: timestamps.createdAt,
    /** Entered by mistake: cancelled (never deleted), only while unused and unpaid. */
    cancelledAt: text('cancelled_at'),
    cancelledBy: integer('cancelled_by').references(() => user.id),
    cancelReason: text('cancel_reason'),
  },
  (t) => [index('ix_purchase_bill_vendor').on(t.branchId, t.vendorId, t.billDate)],
);

export const purchaseLine = sqliteTable(
  'purchase_line',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    billId: integer('bill_id')
      .notNull()
      .references(() => purchaseBill.id),
    medicineId: integer('medicine_id')
      .notNull()
      .references(() => medicine.id),
    batchId: integer('batch_id')
      .notNull()
      .references(() => medicineBatch.id),
    /** Loose units that went into stock: (packs bought + free packs) × pack size. */
    quantity: integer('quantity').notNull(),
    /** What one unit really cost: the line amount spread over those units. */
    unitCostPaise: integer('unit_cost_paise').notNull(),
    /** What the vendor charges for the line: packs bought × rate, plus GST. */
    amountPaise: integer('amount_paise').notNull(),
    // As printed on the vendor's invoice. (Lines entered before these existed: pack size 1, no free, no GST.)
    /** Units in one pack: 10 for a strip of 10, 1 for a vial or a tube. */
    packSize: integer('pack_size').notNull().default(1),
    /** Packs charged for. null on old lines (= quantity). */
    packQty: integer('pack_qty'),
    /** Packs received free on top. */
    freeQty: integer('free_qty').notNull().default(0),
    /** Rate per pack before GST. null on old lines (= unit cost). */
    ratePaise: integer('rate_paise'),
    /** Printed MRP per pack. */
    mrpPaise: integer('mrp_paise'),
    gstPercent: real('gst_percent').notNull().default(0),
  },
  (t) => [index('ix_purchase_line_bill').on(t.billId)],
);

export const vendorPayment = sqliteTable(
  'vendor_payment',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    billId: integer('bill_id')
      .notNull()
      .references(() => purchaseBill.id),
    amountPaise: integer('amount_paise').notNull(),
    mode: text('mode', { enum: ['cash', 'upi', 'cheque', 'bank'] }).notNull(),
    reference: text('reference'),
    paidBy: integer('paid_by').references(() => user.id),
    paidAt: timestamps.createdAt,
  },
  (t) => [index('ix_vendor_payment_bill').on(t.billId)],
);

// ---------------------------------------------------------------------------
// Patient billing: OP bill = consultation + lab tests + other - discount
// ---------------------------------------------------------------------------

export const opBill = sqliteTable(
  'op_bill',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    billNo: text('bill_no').notNull(),
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    patientId: integer('patient_id')
      .notNull()
      .references(() => patient.id),
    consultationFeePaise: integer('consultation_fee_paise').notNull().default(0),
    otherChargesPaise: integer('other_charges_paise').notNull().default(0),
    otherChargesLabel: text('other_charges_label'),
    discountPaise: integer('discount_paise').notNull().default(0),
    /** Kept in step with the lines and fees on every change. */
    totalPaise: integer('total_paise').notNull().default(0),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('ux_op_bill_no').on(t.branchId, t.billNo), index('ix_op_bill_visit').on(t.branchId, t.visitId)],
);

/** A lab test on a bill. A lab order is billed at most once. */
export const opBillLine = sqliteTable(
  'op_bill_line',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    billId: integer('bill_id')
      .notNull()
      .references(() => opBill.id),
    labOrderId: integer('lab_order_id').references(() => labOrder.id),
    description: text('description').notNull(),
    amountPaise: integer('amount_paise').notNull(),
  },
  (t) => [index('ix_bill_line_bill').on(t.billId), uniqueIndex('ux_bill_line_lab').on(t.labOrderId)],
);

export const billPayment = sqliteTable(
  'bill_payment',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    billId: integer('bill_id')
      .notNull()
      .references(() => opBill.id),
    amountPaise: integer('amount_paise').notNull(),
    mode: text('mode', { enum: ['cash', 'upi', 'card'] }).notNull(),
    receivedBy: integer('received_by').references(() => user.id),
    receivedAt: timestamps.createdAt,
  },
  (t) => [index('ix_bill_payment_bill').on(t.billId), index('ix_bill_payment_day').on(t.branchId, t.receivedAt)],
);

/** Lab report printed before payment: allowed by the owner/branch admin with a reason. */
export const labRelease = sqliteTable(
  'lab_release',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    reason: text('reason').notNull(),
    releasedBy: integer('released_by').references(() => user.id),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('ix_lab_release_visit').on(t.branchId, t.visitId)],
);

/** Per-branch clinic settings. */
export const clinicSetting = sqliteTable('clinic_setting', {
  branchId: integer('branch_id')
    .primaryKey()
    .references(() => branch.id),
  consultationFeePaise: integer('consultation_fee_paise').notNull().default(0),
  /** Doctor given to new OP visits. Ignored once that person is no longer a doctor of this branch. */
  defaultDoctorUserId: integer('default_doctor_user_id').references(() => user.id),
  updatedAt: timestamps.updatedAt,
});

/**
 * People who also see patients as a doctor in this branch, whatever their role (the owner, a branch admin...).
 * Staff with the Doctor role are doctors without a row here.
 */
export const branchDoctor = sqliteTable(
  'branch_doctor',
  {
    ...branchColumns,
    userId: integer('user_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.branchId, t.userId] })],
);

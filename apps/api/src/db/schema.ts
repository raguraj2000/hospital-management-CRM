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
    gender: text('gender', { enum: ['female', 'male', 'female child', 'male child', 'other'] }),
    dob: text('dob'),
    ageYears: integer('age_years'),
    bloodGroup: text('blood_group'),
    weightKg: real('weight_kg'),
    heightCm: real('height_cm'),
    address: text('address'),
    /** Long-term conditions (Diabetes, Hypertension …), comma-separated: shown wherever the patient is seen. */
    conditions: text('conditions'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    createdBy: integer('created_by').references(() => user.id),
    /** Deactivated: everyone still sees the record, but nothing new is made for the patient (no visit, test, bill). */
    deactivatedAt: text('deactivated_at'),
    deactivatedReason: text('deactivated_reason'),
    deactivatedBy: integer('deactivated_by').references(() => user.id),
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
    /** An outside doctor who sent the patient (printed on the lab report as "Referred By"). */
    referredBy: text('referred_by'),
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
    heightCm: real('height_cm'),
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
    /** How the doctor usually writes it (filled in when it is picked; the doctor can change it): "1-0-1". */
    defaultDose: text('default_dose'),
    defaultInstructions: text('default_instructions'),
    defaultDays: integer('default_days'),
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
    /** The doctor's order (dragged); 0 = not placed yet: after the placed ones, in the order they were added. */
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_rx_visit').on(t.branchId, t.visitId), index('ix_rx_status').on(t.branchId, t.status)],
);

/**
 * A line of the doctor's between the medicines of a prescription: a note ("Stop if the fever goes") or an
 * instruction ("Check BP tomorrow"). Never sold or billed. It sits after one medicine (null = at the top).
 */
export const prescriptionNote = sqliteTable(
  'prescription_note',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    kind: text('kind', { enum: ['note', 'instruction'] }).notNull(),
    text: text('text').notNull(),
    afterItemId: integer('after_item_id').references(() => prescriptionItem.id),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_rx_note_visit').on(t.branchId, t.visitId)],
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
    /** Direct sale: added so the customer pays a round figure; already inside totalPaise. 0 for prescription sales. */
    roundOffPaise: integer('round_off_paise').notNull().default(0),
    paymentMode: text('payment_mode', { enum: ['cash', 'upi', 'card'] }).notNull(),
    createdBy: integer('created_by').references(() => user.id),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex('ux_sale_no').on(t.branchId, t.saleNo), index('ix_sale_day').on(t.branchId, t.createdAt), index('ix_sale_visit').on(t.branchId, t.visitId)],
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
    /** May be left empty when the test is completed (e.g. one of several sugar readings). Not set = required. */
    optional: integer('optional', { mode: 'boolean' }).notNull().default(false),
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
  (t) => [uniqueIndex('ux_op_bill_no').on(t.branchId, t.billNo), index('ix_op_bill_visit').on(t.branchId, t.visitId), index('ix_op_bill_patient').on(t.branchId, t.patientId)],
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
  /** JSON: ready-made extra charges, [{ name, amountPaise }] (Dressing, IV fluids...). */
  chargePresets: text('charge_presets'),
  /** JSON: consultation fee by time of day, [{ from: '22:00', to: '06:00', feePaise }]; the standard fee the rest of the day. */
  feeSlots: text('fee_slots'),
  /** The numbers next to the side menu (how many are waiting on each page). Off = no computer asks for them. */
  navCounts: integer('nav_counts', { mode: 'boolean' }).notNull().default(true),
  updatedAt: timestamps.updatedAt,
});

/**
 * An extra charge (dressing, IV...) put on a visit before its bill exists, by the doctor or the counter.
 * The first bill of the visit takes these as its charge lines (billId is then set).
 */
export const visitCharge = sqliteTable(
  'visit_charge',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    description: text('description').notNull(),
    amountPaise: integer('amount_paise').notNull(),
    billId: integer('bill_id').references(() => opBill.id),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_visit_charge_visit').on(t.branchId, t.visitId)],
);

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

/**
 * A bookmark: a ready-made treatment (e.g. "Dengue") -- medicines with dose, days and instructions, and
 * instructions to carry out. Stored once per branch and applied to any patient's visit.
 */
export const treatmentBookmark = sqliteTable(
  'treatment_bookmark',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    name: text('name').notNull(),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_bookmark_name').on(t.branchId, t.name)],
);

/** One line of a bookmark: a medicine (by id: its name and price are not repeated here) or an instruction (text). */
export const treatmentBookmarkLine = sqliteTable(
  'treatment_bookmark_line',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    bookmarkId: integer('bookmark_id')
      .notNull()
      .references(() => treatmentBookmark.id),
    kind: text('kind', { enum: ['medicine', 'instruction'] }).notNull(),
    // A medicine line:
    medicineId: integer('medicine_id').references(() => medicine.id),
    dose: text('dose'),
    days: integer('days'),
    /** null = dose x days, as on a prescription. */
    quantity: integer('quantity'),
    instructions: text('instructions'),
    givenHere: integer('given_here', { mode: 'boolean' }).notNull().default(false),
    // An instruction line:
    text: text('text'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('ix_bookmark_line').on(t.branchId, t.bookmarkId)],
);

/**
 * An instruction on one patient's visit (copied from a bookmark when it is applied: the doctor may have unticked
 * some, and the bookmark may change later). Ticked when carried out: who and when.
 */
export const visitInstruction = sqliteTable(
  'visit_instruction',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    text: text('text').notNull(),
    /** The bookmark it came from, as it was named then. */
    bookmarkName: text('bookmark_name'),
    doneAt: text('done_at'),
    doneBy: integer('done_by').references(() => user.id),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_visit_instruction').on(t.branchId, t.visitId)],
);

/** Money spent on things that are not medicine stock (a keyboard, a chair, a repair), from a listed vendor or any shop. */
export const expense = sqliteTable(
  'expense',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    /** Day of the purchase (YYYY-MM-DD). */
    expenseDate: text('expense_date').notNull(),
    description: text('description').notNull(),
    vendorId: integer('vendor_id').references(() => vendor.id),
    /** The shop's name when it is not a vendor of the list. */
    vendorName: text('vendor_name'),
    amountPaise: integer('amount_paise').notNull(),
    mode: text('mode', { enum: ['cash', 'upi', 'cheque', 'bank'] }).notNull().default('cash'),
    notes: text('notes'),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_expense_day').on(t.branchId, t.expenseDate)],
);

/** A lab package: several tests ordered together at one price (Fever profile...). Prices of the tests are scaled to it. */
export const labPackage = sqliteTable(
  'lab_package',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    name: text('name').notNull(),
    pricePaise: integer('price_paise').notNull(),
    /** JSON: the lab_test ids, in order. */
    testIds: text('test_ids').notNull(),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_lab_package').on(t.branchId)],
);

/**
 * A treatment course: one complaint treated over several sittings (dengue: IV morning and evening for 3 days,
 * platelet counts, a doctor review). Paid sitting by sitting, or all on day one (pay_mode).
 * Frozen after two missed sittings; closed a day later if the patient still does not come (credit = what was
 * paid on day one and not given).
 */
export const treatmentCourse = sqliteTable(
  'treatment_course',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    patientId: integer('patient_id')
      .notNull()
      .references(() => patient.id),
    /** The visit the doctor started it on. */
    visitId: integer('visit_id')
      .notNull()
      .references(() => opVisit.id),
    name: text('name').notNull(),
    payMode: text('pay_mode', { enum: ['per_sitting', 'day_one'] }).notNull().default('per_sitting'),
    status: text('status', { enum: ['active', 'frozen', 'closed'] }).notNull().default('active'),
    doctorUserId: integer('doctor_user_id').references(() => user.id),
    frozenAt: text('frozen_at'),
    closedAt: text('closed_at'),
    closedReason: text('closed_reason'),
    closedBy: integer('closed_by').references(() => user.id),
    /** Paid on day one and never given, when the course closed after missed sittings. */
    creditPaise: integer('credit_paise').notNull().default(0),
    /** Day 1 of the course (India date, YYYY-MM-DD), picked when it is started; null = its first sitting's day. */
    startDay: text('start_day'),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_course_patient').on(t.branchId, t.patientId), index('ix_course_status').on(t.branchId, t.status)],
);

/** One sitting of a course: when, what kind, and the visit it became. */
export const courseSitting = sqliteTable(
  'course_sitting',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    courseId: integer('course_id')
      .notNull()
      .references(() => treatmentCourse.id),
    /** When it is due (UTC ISO). */
    dueAt: text('due_at').notNull(),
    /** nurse: injections, IV, dressing (no token) · review: the doctor sees the patient · lab: tests only. */
    kind: text('kind', { enum: ['nurse', 'review', 'lab'] }).notNull(),
    /** Review only: the doctor's fee for this review; null = no fee. */
    reviewFeePaise: integer('review_fee_paise'),
    status: text('status', { enum: ['planned', 'started', 'done', 'missed', 'cancelled'] }).notNull().default('planned'),
    visitId: integer('visit_id').references(() => opVisit.id),
    doneAt: text('done_at'),
    /** The doctor's notes for this sitting ("Check platelets before the drip"). */
    note: text('note'),
    ...timestamps,
  },
  (t) => [index('ix_sitting_course').on(t.branchId, t.courseId), index('ix_sitting_due').on(t.branchId, t.dueAt)],
);

/** What is given or done at a sitting: a medicine (with quantity), a lab test, or a charge (IV set, dressing...). */
export const courseItem = sqliteTable(
  'course_item',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    sittingId: integer('sitting_id')
      .notNull()
      .references(() => courseSitting.id),
    /** note: a line of the doctor's between the others ("Give slowly"), never given or billed. */
    kind: text('kind', { enum: ['medicine', 'test', 'charge', 'note'] }).notNull(),
    medicineId: integer('medicine_id').references(() => medicine.id),
    testId: integer('test_id').references(() => labTest.id),
    description: text('description').notNull(),
    /** Place in the sitting, as the doctor put them. */
    sortOrder: integer('sort_order').notNull().default(0),
    quantity: integer('quantity').notNull().default(1),
    /** Charges: the amount. Medicines and tests: the price when it was paid on day one (locked). */
    pricePaise: integer('price_paise').notNull().default(0),
    /** Paid on day one (nothing to bill at the sitting). */
    prepaid: integer('prepaid', { mode: 'boolean' }).notNull().default(false),
    givenAt: text('given_at'),
    givenBy: integer('given_by').references(() => user.id),
    ...timestamps,
  },
  (t) => [index('ix_course_item_sitting').on(t.branchId, t.sittingId)],
);

/**
 * A course template ("Dengue", like a bookmark): the usual sittings by day and part of the day, picked in one
 * click to start a patient's course. JSON in `sittings`: [{ day, part, kind, reviewFeePaise, items: [...] }].
 */
export const courseTemplate = sqliteTable(
  'course_template',
  {
    id: integer('id').primaryKey(),
    ...branchColumns,
    name: text('name').notNull(),
    sittings: text('sittings').notNull(),
    createdBy: integer('created_by').references(() => user.id),
    ...timestamps,
    deletedAt: text('deleted_at'),
  },
  (t) => [index('ix_course_template').on(t.branchId)],
);

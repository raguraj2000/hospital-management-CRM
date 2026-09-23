export type Role = 'admin' | 'manager' | 'doctor' | 'pharmacist' | 'front_desk';

export type PatientStatus = 'active' | 'inactive' | 'deceased' | 'merged';

export type FollowUpStatus = 'open' | 'completed' | 'cancelled';

export type StockAdjustmentReason =
  | 'spoilage'
  | 'breakage'
  | 'stock_take_correction'
  | 'expired_writeoff'
  | 'other';

export interface PatientDTO {
  id: number;
  customerCode: string;
  currentName: string;
  dob: string | null;
  ageYearsAtRegistration: number | null;
  weightKg: number | null;
  gender: string | null;
  bloodGroup: string | null;
  aadharNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: PatientStatus;
  isProvisional: boolean;
  mergedIntoId: number | null;
}

export interface MedicineDTO {
  id: number;
  name: string;
  baseUnit: string;
  packSize: number;
  conversionFactor: number;
  priceCents: number;
  minimumStock: number;
  reorderPoint: number;
  preferredSupplierId: number | null;
}

export interface DispenseRequest {
  patientId: number;
  medicineId: number;
  quantity: number;
  visitEventId: number;
  prescriptionLineId?: number | null;
  prescribingDoctorId?: number | null;
}

export interface DispenseAllocation {
  batchId: number;
  quantityTaken: number;
}

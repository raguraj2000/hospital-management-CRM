import type { Role } from './types.js';

export type Permission =
  | 'patient.view'
  | 'patient.create'
  | 'patient.edit'
  | 'patient.editMedicalInstructions'
  | 'patient.changeStatus'
  | 'patient.merge'
  | 'dispense.create'
  | 'dispense.void'
  | 'inventory.view'
  | 'inventory.adjust'
  | 'medicine.manage'
  | 'supplier.manage'
  | 'auditLog.view'
  | 'user.manage'
  | 'backup.configure'
  | 'invoice.view'
  | 'invoice.manage';

// Every permission, in the order the Settings > Roles & permissions grid
// shows them.
export const ALL_PERMISSIONS: Permission[] = [
  'patient.view',
  'patient.create',
  'patient.edit',
  'patient.editMedicalInstructions',
  'patient.changeStatus',
  'patient.merge',
  'dispense.create',
  'dispense.void',
  'inventory.view',
  'inventory.adjust',
  'medicine.manage',
  'supplier.manage',
  'invoice.view',
  'invoice.manage',
  'auditLog.view',
  'user.manage',
  'backup.configure',
];

// Plain-English labels for the permission grid, so the person ticking boxes
// doesn't have to decode dotted identifiers.
export const PERMISSION_LABELS: Record<Permission, string> = {
  'patient.view': 'See patients',
  'patient.create': 'Register new patients',
  'patient.edit': 'Edit patient details',
  'patient.editMedicalInstructions': 'Prescribe / edit medical records & lab reports',
  'patient.changeStatus': 'Change patient status',
  'patient.merge': 'Merge and delete patients',
  'dispense.create': 'Dispense medicine & sell at the pharmacy counter',
  'dispense.void': 'Cancel a dispense or pharmacy sale',
  'inventory.view': 'See medicine inventory',
  'inventory.adjust': 'Receive stock / adjust quantities',
  'medicine.manage': 'Add, edit and delete medicines',
  'supplier.manage': 'Manage suppliers',
  'invoice.view': 'See invoices',
  'invoice.manage': 'Create, edit and delete invoices',
  'auditLog.view': 'See the audit log',
  'user.manage': 'Manage staff accounts',
  'backup.configure': 'Manage backups and server settings',
};

// Admin is fixed: it always has everything, and is never read from (or
// editable in) the role_permission table. This is what stops the clinic from
// locking itself out of its own system.
export const ADMIN_ROLE: Role = 'admin';

export const EDITABLE_ROLES: Role[] = ['manager', 'doctor', 'pharmacist', 'front_desk'];

// The DEFAULTS each role starts with. These seeded the role_permission table
// (migration 0013); from then on the live answer for non-admin roles comes
// from that table via the server's permission service, so Settings > Roles &
// permissions can change them. This stays as the fallback used before a
// session's permissions are known, and as the source of truth for admin.
export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  front_desk: ['patient.view', 'patient.create', 'patient.edit', 'inventory.view', 'invoice.view', 'invoice.manage'],
  pharmacist: [
    'patient.view',
    'dispense.create',
    'dispense.void',
    'inventory.view',
    'inventory.adjust',
    'invoice.view',
    'invoice.manage',
  ],
  doctor: [
    'patient.view',
    'patient.editMedicalInstructions',
    'patient.changeStatus',
    'inventory.view',
    'invoice.view',
  ],
  manager: [
    'patient.view',
    'patient.create',
    'patient.edit',
    'patient.changeStatus',
    'patient.merge',
    'dispense.create',
    'dispense.void',
    'inventory.view',
    'inventory.adjust',
    'medicine.manage',
    'supplier.manage',
    'auditLog.view',
    'invoice.view',
    'invoice.manage',
  ],
  // Always everything, by construction -- a new permission added to
  // ALL_PERMISSIONS is automatically an admin permission and can never be
  // accidentally left off.
  admin: ALL_PERMISSIONS,
};

/**
 * Default answer, used for admin (always everything) and as the fallback
 * when a live permission set isn't available. The live check for non-admin
 * roles goes through the server's permission service, which reads the
 * editable role_permission table.
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  if (role === ADMIN_ROLE) return true;
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

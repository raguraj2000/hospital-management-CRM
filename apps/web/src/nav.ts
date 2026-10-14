import { Bookmark, Building2, CircleHelp, ClipboardList, FlaskConical, LayoutDashboard, Package, Pill, Receipt, Settings, Syringe, Users, type LucideIcon } from 'lucide-react';
import type { Permission } from '@platform/shared';

/** One list drives the sidebar, the phone bottom bar AND the route guards. */
export interface NavItem {
  path: string; // under /:branch
  label: string;
  icon: LucideIcon;
  permission: Permission;
  group: 'Overview' | 'Clinic' | 'Manage';
  /** In the phone bottom bar (max 4); the rest go under "More". */
  primary?: boolean;
  /** Not built yet: shown with a "Soon" tag. */
  soon?: boolean;
  /** Not in the menu for someone who has this permission: the page is a tab of another page for them. */
  foldedWith?: Permission;
}

export const NAV: NavItem[] = [
  { path: '', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view', group: 'Overview', primary: true },
  { path: 'visits', label: 'OP visits', icon: ClipboardList, permission: 'patient.view', group: 'Clinic', primary: true },
  { path: 'patients', label: 'Patients', icon: Users, permission: 'patient.view', group: 'Clinic', primary: true },
  { path: 'billing', label: 'Billing', icon: Receipt, permission: 'billing.receive', group: 'Clinic', primary: true },
  { path: 'pharmacy', label: 'Pharmacy', icon: Pill, permission: 'pharmacy.sell', group: 'Clinic' },
  { path: 'lab', label: 'Lab', icon: FlaskConical, permission: 'lab.view', group: 'Clinic' },
  { path: 'treatments', label: 'Doses to give', icon: Syringe, permission: 'treatment.give', group: 'Clinic' },
  // Settings > Bookmarks for whoever has Settings; a doctor without Settings keeps it in the menu.
  { path: 'bookmarks', label: 'Bookmarks', icon: Bookmark, permission: 'prescription.write', group: 'Clinic', foldedWith: 'settings.manage' },
  { path: 'inventory', label: 'Inventory', icon: Package, permission: 'inventory.view', group: 'Manage' },
  // Inventory > Vendors & purchases for whoever sees Inventory.
  { path: 'vendors', label: 'Vendors', icon: Building2, permission: 'vendor.manage', group: 'Manage', foldedWith: 'inventory.view' },
  { path: 'settings', label: 'Settings', icon: Settings, permission: 'settings.manage', group: 'Manage' },
  { path: 'help', label: 'How HMS works', icon: CircleHelp, permission: 'settings.manage', group: 'Manage' },
];

export const NAV_GROUPS = ['Overview', 'Clinic', 'Manage'] as const;

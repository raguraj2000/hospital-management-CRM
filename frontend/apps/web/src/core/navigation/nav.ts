import {
  Bookmark,
  Building2,
  CircleHelp,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Package,
  Pill,
  Receipt,
  Settings,
  Syringe,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey, Permission } from '@platform/shared';

/** Navigation item specification driving the sidebar, phone bottom bar, and route resolution. */
export interface NavItem {
  path: string; // Relative path under /:branch (' ' = dashboard index)
  label: string;
  icon: LucideIcon;
  permission: Permission;
  group: 'Overview' | 'Clinic' | 'Manage';
  /** Optional module key that must be enabled for this item to appear */
  moduleKey?: ModuleKey;
  /** Primary item in the mobile bottom bar */
  primary?: boolean;
  /** Marked as coming soon */
  soon?: boolean;
  /** Hidden if user has this other permission because it is folded into another page */
  foldedWith?: Permission;
  /** Custom count badge key matching nav-counts payload, defaults to path */
  countKey?: string;
}

export const NAV: NavItem[] = [
  { path: '', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view', group: 'Overview', primary: true },
  { path: 'visits', label: 'OP visits', icon: ClipboardList, permission: 'patient.view', group: 'Clinic', primary: true },
  { path: 'patients', label: 'Patients', icon: Users, permission: 'patient.view', group: 'Clinic', primary: true },
  { path: 'billing', label: 'Billing', icon: Receipt, permission: 'billing.receive', group: 'Clinic', primary: true },
  { path: 'pharmacy', label: 'Pharmacy', icon: Pill, permission: 'pharmacy.sell', group: 'Clinic' },
  { path: 'lab', label: 'Lab', icon: FlaskConical, permission: 'lab.view', group: 'Clinic', moduleKey: 'lab' },
  { path: 'treatments', label: "Today's treatments", icon: Syringe, permission: 'treatment.give', group: 'Clinic', moduleKey: 'courses' },
  // Settings > Bookmarks for whoever has Settings; a doctor without Settings keeps it in the menu.
  { path: 'bookmarks', label: 'Bookmarks', icon: Bookmark, permission: 'prescription.write', group: 'Clinic', foldedWith: 'settings.manage' },
  { path: 'inventory', label: 'Inventory', icon: Package, permission: 'inventory.view', group: 'Manage' },
  // Inventory > Vendors & purchases for whoever sees Inventory.
  { path: 'vendors', label: 'Vendors', icon: Building2, permission: 'vendor.manage', group: 'Manage', foldedWith: 'inventory.view' },
  // Standalone Reports module
  { path: 'reports', label: 'Reports', icon: FileText, permission: 'reports.view', group: 'Manage' },
  { path: 'settings', label: 'Settings', icon: Settings, permission: 'settings.manage', group: 'Manage' },
  { path: 'help', label: 'How HMS works', icon: CircleHelp, permission: 'settings.manage', group: 'Manage' },
];

export const NAV_GROUPS = ['Overview', 'Clinic', 'Manage'] as const;


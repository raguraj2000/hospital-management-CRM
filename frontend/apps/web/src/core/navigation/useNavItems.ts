import type { MeBranch, ModuleKey } from '@platform/shared';
import { NAV, type NavItem } from './nav';

/**
 * Filters the master navigation configuration dynamically based on:
 * 1. Branch-level permissions of the authenticated user
 * 2. Organization-level disabled modules (modulesOff)
 * 3. Menu folding rules (e.g. Vendors folded under Inventory for users who see both)
 */
export function useNavItems(
  branch: MeBranch | null,
  modulesOff: ModuleKey[] = [],
): NavItem[] {
  if (!branch) return [];

  return NAV.filter((item) => {
    // 1. Permission authorization check
    if (!branch.permissions.includes(item.permission)) {
      return false;
    }

    // 2. Organization module entitlement check
    if (item.moduleKey && modulesOff.includes(item.moduleKey)) {
      return false;
    }

    // 3. Sub-tab folding rule
    if (item.foldedWith && branch.permissions.includes(item.foldedWith)) {
      return false;
    }

    return true;
  });
}


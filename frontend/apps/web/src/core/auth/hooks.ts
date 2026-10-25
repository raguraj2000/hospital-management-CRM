// Centralized auth hooks and user context.
// Who is signed in comes from the server (GET /auth/me) and lives in the
// TanStack Query cache -- no token is ever stored in client storage.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ALL_PERMISSIONS, type LoginInput, type MeBranch, type MeResponse, type ModuleKey, type Permission } from '@platform/shared';
import { api, ApiError } from '@/core/api/client';
import { clearAllDrafts } from '@/components/drafts';

export const ME_KEY = ['me'] as const;

export function normalizeMeResponse(raw: any): MeResponse {
  const data = raw && typeof raw === 'object' ? raw : {};
  const user = data.user || {};
  const isPlatformAdmin = Boolean(user.isPlatformAdmin ?? user.is_platform_admin);
  const isOwner = Boolean(user.isOwner ?? user.is_owner ?? data.membership?.is_owner);

  const branches: MeBranch[] = Array.isArray(data.branches) && data.branches.length > 0
    ? data.branches.map((b: any) => ({
        slug: b.slug || 'main',
        name: b.name || 'Main Branch',
        roleName: b.roleName || (isOwner ? 'Owner' : 'Staff'),
        permissions: (b.permissions ?? ALL_PERMISSIONS) as Permission[],
      }))
    : [
        {
          slug: 'main',
          name: 'Main Branch',
          roleName: isOwner ? 'Owner' : 'Staff',
          permissions: ALL_PERMISSIONS as unknown as Permission[],
        },
      ];

  const organization = data.organization || {
    id: data.membership?.company_id ?? 1,
    name: 'Hospital Organization',
    modulesOff: [],
    maxBranches: null,
    maxStaff: null,
    plan: { paidUntil: null, graceDays: 7 },
  };

  return {
    user: {
      id: user.id ?? 1,
      name: user.name || '',
      mobile: user.mobile || user.phone || '',
      isOwner,
      isPlatformAdmin,
    },
    organization,
    branches,
  };
}

export function useMe(options?: { enabled?: boolean }) {
  const isLoginPage = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/');
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        const raw = await api.get<MeResponse>('/auth/me');
        return normalizeMeResponse(raw);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null; // signed out
        throw err;
      }
    },
    enabled: options?.enabled ?? !isLoginPage,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const raw = await api.post<MeResponse>('/auth/login', input);
      return normalizeMeResponse(raw);
    },
    onSuccess: (me) => qc.setQueryData(ME_KEY, me),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearAllDrafts(); // Drafts typed in forms stay with the person who typed them
      qc.clear(); // Drop every cached record of the old session
      qc.setQueryData(ME_KEY, null);
    },
  });
}

/** The active branch in the URL, verified against user's permitted branches. */
export function useBranch(): MeBranch | null {
  const { branch } = useParams();
  const { data } = useMe();
  return data?.branches?.find((b) => b.slug === branch) ?? data?.branches?.[0] ?? null;
}

/** Check if a module is switched on for this hospital organization. */
export function useModuleOn(key: ModuleKey): boolean {
  const { data } = useMe();
  return !(data?.organization.modulesOff ?? []).includes(key);
}

/** Check if the active branch role possesses the required permission. */
export function useCan(permission: Permission): boolean {
  return useBranch()?.permissions.includes(permission) ?? false;
}


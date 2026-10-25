// Centralized auth hooks and user context.
// Who is signed in comes from the server (GET /auth/me) and lives in the
// TanStack Query cache -- no token is ever stored in client storage.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import type { LoginInput, MeBranch, MeResponse, ModuleKey, Permission } from '@platform/shared';
import { api, ApiError } from '@/core/api/client';
import { clearAllDrafts } from '@/components/drafts';

export const ME_KEY = ['me'] as const;

export function useMe(options?: { enabled?: boolean }) {
  const isLoginPage = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/');
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api.get<MeResponse>('/auth/me');
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
    mutationFn: (input: LoginInput) => api.post<MeResponse>('/auth/login', input),
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
  return data?.branches.find((b) => b.slug === branch) ?? null;
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


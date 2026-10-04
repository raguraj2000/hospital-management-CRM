// Who is signed in comes from the server (GET /auth/me) and lives in the
// TanStack Query cache -- no token is ever stored in the browser.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import type { LoginInput, MeBranch, MeResponse, Permission } from '@platform/shared';
import { api, ApiError } from '@/api/client';

export const ME_KEY = ['me'] as const;

export function useMe() {
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
      qc.clear(); // drop every cached record of the old session
      qc.setQueryData(ME_KEY, null);
    },
  });
}

/** The branch in the URL, if the signed-in user may open it. */
export function useBranch(): MeBranch | null {
  const { branch } = useParams();
  const { data } = useMe();
  return data?.branches.find((b) => b.slug === branch) ?? null;
}

/** UI-only check (hide what you can't use). The server re-checks every request. */
export function useCan(permission: Permission): boolean {
  return useBranch()?.permissions.includes(permission) ?? false;
}

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { User } from '@shared/types';
import { api } from '../lib/api';

export interface AuthConfig {
  oidcEnabled: boolean;
  localEnabled: boolean;
  autoRedirect: boolean;
  roleSync: 'always' | 'on_creation' | 'never';
  balanceWarnThreshold: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
}

export function useAuth(): AuthState {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async (): Promise<User | null> => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json() as Promise<User>;
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isModerator: user?.role === 'admin' || user?.role === 'moderator',
  };
}

export function useAuthConfig(): UseQueryResult<AuthConfig> {
  return useQuery<AuthConfig>({
    queryKey: ['auth', 'config'],
    queryFn: () => api.get<AuthConfig>('/api/auth/config'),
    staleTime: Infinity,
  });
}

export function useLogout(): () => Promise<void> {
  const qc = useQueryClient();
  return async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    qc.setQueryData(['auth', 'me'], null);
    qc.clear();
    window.location.href = '/login';
  };
}

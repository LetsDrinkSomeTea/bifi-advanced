import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PublicProfile } from '@shared/types';

export type { PublicProfile };

export function usePublicProfile(userId: string | undefined): UseQueryResult<PublicProfile> {
  return useQuery<PublicProfile>({
    queryKey: ['profile', userId],
    queryFn: () => api.get<PublicProfile>(`/api/users/${userId}/profile`),
    enabled: !!userId,
  });
}

export function useUpdateProfile(): UseMutationResult<
  void,
  Error,
  {
    displayName?: string;
    username?: string | null;
    avatarUrl?: string | null;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      displayName?: string;
      username?: string | null;
      avatarUrl?: string | null;
    }) => api.patch('/api/users/me', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

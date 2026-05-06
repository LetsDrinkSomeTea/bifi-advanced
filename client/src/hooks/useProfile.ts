import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type { PublicProfile } from '@shared/types';

export type { PublicProfile };

export function usePublicProfile(userId: string | undefined): UseQueryResult<PublicProfile> {
  return useQuery<PublicProfile>({
    queryKey: ['profile', userId],
    queryFn: () => api.get<PublicProfile>(`/api/users/${userId}/profile`),
    enabled: !!userId,
  });
}

export function useUploadAvatar(): UseMutationResult<{ avatarUrl: string }, Error, File> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      interface UploadResponse { avatarUrl: string; error?: string; code?: string; }
      const data = await res.json() as UploadResponse;
      if (!res.ok) throw new ApiError(data.error ?? res.statusText, data.code, res.status);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
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

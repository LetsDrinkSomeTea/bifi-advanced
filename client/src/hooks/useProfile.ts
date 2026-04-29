import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { PublicProfile } from '@shared/types'

export type { PublicProfile }

export function usePublicProfile(userId: string | undefined) {
  return useQuery<PublicProfile>({
    queryKey: ['profile', userId],
    queryFn: () => api.get<PublicProfile>(`/api/users/${userId}/profile`),
    enabled: !!userId,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { displayName?: string; username?: string | null; avatarUrl?: string | null }) =>
      api.patch('/api/users/me', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

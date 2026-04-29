import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Friend, FriendRequest } from '@shared/types'

interface UserSearchResult {
  id: string
  displayName: string
  avatarUrl: string | null
}

export function useUserSearch(q: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', q],
    queryFn: () => api.get<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 10_000,
  })
}

export function useFriends() {
  return useQuery<Friend[]>({
    queryKey: ['friends'],
    queryFn: () => api.get<Friend[]>('/api/friends'),
  })
}

export function useFriendRequests() {
  return useQuery<FriendRequest[]>({
    queryKey: ['friends', 'requests'],
    queryFn: () => api.get<FriendRequest[]>('/api/friends/requests'),
  })
}

function invalidateAfter(userId: string, qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['profile', userId] })
  qc.invalidateQueries({ queryKey: ['friends'] })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/friends/${userId}/request`, {}),
    onSuccess: (_, userId) => invalidateAfter(userId, qc),
  })
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/friends/${userId}/accept`, {}),
    onSuccess: (_, userId) => invalidateAfter(userId, qc),
  })
}

export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/api/friends/${userId}`),
    onSuccess: (_, userId) => invalidateAfter(userId, qc),
  })
}

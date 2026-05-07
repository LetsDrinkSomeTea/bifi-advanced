import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Friend, FriendRequest } from '@shared/types';

interface UserSearchResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export function useUserSearch(q: string): UseQueryResult<UserSearchResult[]> {
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', q],
    queryFn: () => api.get<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 10_000,
  });
}

export function useFriends(): UseQueryResult<Friend[]> {
  return useQuery<Friend[]>({
    queryKey: ['friends'],
    queryFn: () => api.get<Friend[]>('/api/friends'),
  });
}

export function useFriendRequests(): UseQueryResult<FriendRequest[]> {
  return useQuery<FriendRequest[]>({
    queryKey: ['friends', 'requests'],
    queryFn: () => api.get<FriendRequest[]>('/api/friends/requests'),
  });
}

export function useSentFriendRequests(): UseQueryResult<FriendRequest[]> {
  return useQuery<FriendRequest[]>({
    queryKey: ['friends', 'requests', 'sent'],
    queryFn: () => api.get<FriendRequest[]>('/api/friends/requests/sent'),
  });
}

async function invalidateAfter(
  userId: string,
  qc: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await qc.invalidateQueries({ queryKey: ['profile', userId] });
  await qc.invalidateQueries({ queryKey: ['friends'] });
  await qc.invalidateQueries({ queryKey: ['friends', 'requests', 'sent'] });
}

export function useSendFriendRequest(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/friends/${userId}/request`, {}),
    onSuccess: (_, userId) => {
      void invalidateAfter(userId, qc);
    },
  });
}

export function useAcceptFriendRequest(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/friends/${userId}/accept`, {}),
    onSuccess: (_, userId) => {
      void invalidateAfter(userId, qc);
    },
  });
}

export function useRemoveFriend(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/api/friends/${userId}`),
    onSuccess: (_, userId) => {
      void invalidateAfter(userId, qc);
    },
  });
}

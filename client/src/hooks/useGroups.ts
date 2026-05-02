import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';

export type GroupRole = 'owner' | 'member';

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string | null;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  myRole: GroupRole;
}

export interface GroupMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupDetail extends GroupSummary {
  members: GroupMember[];
}

export function useGroups(): UseQueryResult<GroupSummary[]> {
  return useQuery<GroupSummary[]>({
    queryKey: ['groups'],
    queryFn: () => api.get<GroupSummary[]>('/api/groups'),
  });
}

export function useGroupDetail(id: string | undefined): UseQueryResult<GroupDetail> {
  return useQuery<GroupDetail>({
    queryKey: ['groups', id],
    queryFn: () => api.get<GroupDetail>(`/api/groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateGroup(): UseMutationResult<
  GroupSummary,
  Error,
  { name: string; description?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      api.post<GroupSummary>('/api/groups', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useJoinGroup(): UseMutationResult<GroupSummary, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => api.post<GroupSummary>('/api/groups/join', { inviteCode }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useLeaveGroup(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.post(`/api/groups/${groupId}/leave`, {}),
    onSuccess: (_, groupId) => {
      void qc.invalidateQueries({ queryKey: ['groups'] });
      void qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

export function useRemoveMember(): UseMutationResult<
  void,
  Error,
  { groupId: string; userId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.delete(`/api/groups/${groupId}/members/${userId}`),
    onSuccess: (_, { groupId }) => {
      void qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

export function useDeleteGroup(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.delete(`/api/groups/${groupId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useRefreshInviteCode(): UseMutationResult<{ inviteCode: string }, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      api.patch<{ inviteCode: string }>(`/api/groups/${groupId}/invite-code`, {}),
    onSuccess: (_, groupId) => {
      void qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

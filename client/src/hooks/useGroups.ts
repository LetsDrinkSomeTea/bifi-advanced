import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string | null;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  myRole: 'owner' | 'member';
}

export interface GroupMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface GroupDetail extends GroupSummary {
  members: GroupMember[];
}

export function useGroups() {
  return useQuery<GroupSummary[]>({
    queryKey: ['groups'],
    queryFn: () => api.get<GroupSummary[]>('/api/groups'),
  });
}

export function useGroupDetail(id: string | undefined) {
  return useQuery<GroupDetail>({
    queryKey: ['groups', id],
    queryFn: () => api.get<GroupDetail>(`/api/groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      api.post<GroupSummary>('/api/groups', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => api.post<GroupSummary>('/api/groups/join', { inviteCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.post(`/api/groups/${groupId}/leave`, {}),
    onSuccess: (_, groupId) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.delete(`/api/groups/${groupId}/members/${userId}`),
    onSuccess: (_, { groupId }) => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.delete(`/api/groups/${groupId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useRefreshInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      api.patch<{ inviteCode: string }>(`/api/groups/${groupId}/invite-code`, {}),
    onSuccess: (_, groupId) => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

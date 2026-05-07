import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';

export type GroupRole = 'owner' | 'member';

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
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

export function useJoinGroup(): UseMutationResult<GroupSummary, ApiError, string> {
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

export function useUploadGroupImage(
  groupId: string,
): UseMutationResult<{ imageUrl: string }, Error, File> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`/api/upload/groups/${groupId}/image`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      interface UploadResponse {
        imageUrl: string;
        error?: string;
        code?: string;
      }
      const data = (await res.json()) as UploadResponse;
      if (!res.ok) throw new ApiError(data.error ?? res.statusText, data.code, res.status);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] });
      void qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

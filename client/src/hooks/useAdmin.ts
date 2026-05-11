import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryResult,
  type UseMutationResult,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  AdminUser,
  BuyableWithVariants,
  SettlementEntry,
  Role,
  AuditLogEntry,
  PaginatedResponse,
} from '@shared/types';
import { type AUDIT_SEVERITIES } from '@shared/schemas';

export function useAdminUsers(): UseQueryResult<AdminUser[]> {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<AdminUser[]>('/api/admin/users'),
  });
}

export function useUpdateUser(): UseMutationResult<
  AdminUser,
  Error,
  {
    id: string;
    role?: Role;
    isActive?: boolean;
    jackpotAllowed?: boolean;
    displayName?: string;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      role?: Role;
      isActive?: boolean;
      jackpotAllowed?: boolean;
      displayName?: string;
    }) => api.patch<AdminUser>(`/api/admin/users/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useCreateUser(): UseMutationResult<
  AdminUser,
  Error,
  {
    email: string;
    username?: string;
    displayName: string;
    password: string;
    role: Role;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      email: string;
      username?: string;
      displayName: string;
      password: string;
      role: Role;
    }) => api.post<AdminUser>('/api/admin/users', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeposit(): UseMutationResult<
  void,
  Error,
  { userId: string; amount: number; note?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount, note }: { userId: string; amount: number; note?: string }) =>
      api.post(`/api/admin/users/${userId}/deposit`, { amount, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'settlement'] });
    },
  });
}

export function useSettlement(): UseQueryResult<SettlementEntry[]> {
  return useQuery<SettlementEntry[]>({
    queryKey: ['admin', 'settlement'],
    queryFn: () => api.get<SettlementEntry[]>('/api/admin/settlement'),
  });
}

export function useSettleDebt(): UseMutationResult<
  void,
  Error,
  { userId: string; amount: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      api.post(`/api/admin/users/${userId}/deposit`, { amount, note: 'Schuldenbegleichung' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'settlement'] });
    },
  });
}

export function useResetPassword(): UseMutationResult<
  void,
  Error,
  { id: string; password: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/api/auth/local/users/${id}/password`, { password }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useRemovePassword(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/auth/local/users/${id}/password`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeleteUser(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/users/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useAllBuyables(): UseQueryResult<BuyableWithVariants[]> {
  return useQuery<BuyableWithVariants[]>({
    queryKey: ['buyables', { all: true }],
    queryFn: () => api.get<BuyableWithVariants[]>('/api/buyables?all=true'),
    staleTime: 60_000,
  });
}

export function useSendReminder(): UseMutationResult<void, Error, string> {
  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/admin/users/${userId}/remind`, {}),
  });
}
export function useUpdateBuyable(): UseMutationResult<
  void,
  Error,
  {
    id: string;
    name?: string;
    category?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      category?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    }) => api.put(`/api/buyables/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['buyables'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] }); // Potentially affects shop visibility
    },
  });
}

export function useCreateBuyable(): UseMutationResult<
  void,
  Error,
  {
    name: string;
    category?: string;
    sortOrder?: number;
    firstVariant: { name: string; price: number };
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      category?: string;
      sortOrder?: number;
      firstVariant: { name: string; price: number };
    }) => api.post('/api/buyables', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

export function useDeleteBuyable(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/buyables/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

export function useCreateVariant(): UseMutationResult<
  void,
  Error,
  { buyableId: string; name: string; price: number; sortOrder?: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      buyableId,
      ...body
    }: {
      buyableId: string;
      name: string;
      price: number;
      sortOrder?: number;
    }) => api.post(`/api/buyables/${buyableId}/variants`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

export function useUpdateVariant(): UseMutationResult<
  void,
  Error,
  {
    buyableId: string;
    variantId: string;
    name?: string;
    price?: number;
    isActive?: boolean;
    sortOrder?: number;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      buyableId,
      variantId,
      ...body
    }: {
      buyableId: string;
      variantId: string;
      name?: string;
      price?: number;
      isActive?: boolean;
      sortOrder?: number;
    }) => api.put(`/api/buyables/${buyableId}/variants/${variantId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

export interface AuditLogFilters {
  action?: string;
  resourceType?: string;
  actorId?: string;
  severity?: (typeof AUDIT_SEVERITIES)[number];
}

export function useAuditLog(
  filters: AuditLogFilters = {},
): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<AuditLogEntry>>> {
  return useInfiniteQuery<PaginatedResponse<AuditLogEntry>>({
    queryKey: ['admin', 'audit-log', filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (typeof pageParam === 'string') params.set('cursor', pageParam);
      if (filters.action) params.set('action', filters.action);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.actorId) params.set('actorId', filters.actorId);
      if (filters.severity) params.set('severity', filters.severity);
      const qs = params.toString();
      return api.get<PaginatedResponse<AuditLogEntry>>(
        `/api/admin/audit-logs${qs ? `?${qs}` : ''}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

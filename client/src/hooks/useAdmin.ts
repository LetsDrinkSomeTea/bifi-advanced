import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AdminUser, BuyableWithVariants, SettlementEntry, Role } from '@shared/types';

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
    imageUrl?: string | null;
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
      imageUrl?: string | null;
      category?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    }) => api.put(`/api/buyables/${id}`, body),
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

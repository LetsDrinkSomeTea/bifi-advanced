import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { AdminUser, BuyableWithVariants, SettlementEntry } from '@shared/types'

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<AdminUser[]>('/api/admin/users'),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: string; isActive?: boolean; jackpotAllowed?: boolean; displayName?: string }) =>
      api.patch<AdminUser>(`/api/admin/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; username?: string; displayName: string; password: string; role: string }) =>
      api.post<AdminUser>('/api/admin/users', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, amount, note }: { userId: string; amount: number; note?: string }) =>
      api.post(`/api/admin/users/${userId}/deposit`, { amount, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'settlement'] })
    },
  })
}

export function useSettlement() {
  return useQuery<SettlementEntry[]>({
    queryKey: ['admin', 'settlement'],
    queryFn: () => api.get<SettlementEntry[]>('/api/admin/settlement'),
  })
}

export function useResetPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/api/auth/local/users/${id}/password`, { password }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAllBuyables() {
  return useQuery<BuyableWithVariants[]>({
    queryKey: ['buyables', { all: true }],
    queryFn: () => api.get<BuyableWithVariants[]>('/api/buyables?all=true'),
    staleTime: 60_000,
  })
}

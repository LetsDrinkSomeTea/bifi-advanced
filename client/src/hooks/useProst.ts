import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface ProstVoucher {
  id: string
  fromUserId: string
  variantId: string
  buyableName: string
  variantName: string
  amount: number
  createdAt: string
}

export function useProstVouchers() {
  return useQuery<ProstVoucher[]>({
    queryKey: ['prost', 'vouchers'],
    queryFn: () => api.get<ProstVoucher[]>('/api/prost/vouchers'),
  })
}

export function useVoucherSet(): Set<string> {
  const { data } = useProstVouchers()
  return new Set(data?.map((v) => v.variantId) ?? [])
}

export function useSendProst() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ toUserId, variantId }: { toUserId: string; variantId: string }) =>
      api.post('/api/prost', { toUserId, variantId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

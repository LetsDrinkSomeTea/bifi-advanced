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

export function useVoucherMap(): Map<string, number> {
  const { data } = useProstVouchers()
  const map = new Map<string, number>()
  for (const v of data ?? []) {
    map.set(v.variantId, (map.get(v.variantId) ?? 0) + 1)
  }
  return map
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

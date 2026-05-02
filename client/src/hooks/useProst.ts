import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ProstVoucher {
  id: string;
  fromUserId: string;
  variantId: string;
  buyableName: string;
  variantName: string;
  amount: number;
  createdAt: string;
}

export function useProstVouchers(): UseQueryResult<ProstVoucher[]> {
  return useQuery<ProstVoucher[]>({
    queryKey: ['prost', 'vouchers'],
    queryFn: () => api.get<ProstVoucher[]>('/api/prost/vouchers'),
  });
}

export function useVoucherMap(): Map<string, number> {
  const { data } = useProstVouchers();
  const map = new Map<string, number>();
  for (const v of data ?? []) {
    map.set(v.variantId, (map.get(v.variantId) ?? 0) + 1);
  }
  return map;
}

export function useSendProst(): UseMutationResult<
  void,
  Error,
  { toUserId: string; variantId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ toUserId, variantId }: { toUserId: string; variantId: string }) =>
      api.post('/api/prost', { toUserId, variantId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

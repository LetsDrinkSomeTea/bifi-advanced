import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { BuyableWithVariants } from '@shared/types';

export function useBuyables(): UseQueryResult<BuyableWithVariants[]> {
  return useQuery<BuyableWithVariants[]>({
    queryKey: ['buyables'],
    queryFn: () => api.get<BuyableWithVariants[]>('/api/buyables'),
    staleTime: 60_000,
  });
}

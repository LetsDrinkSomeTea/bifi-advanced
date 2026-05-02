import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { BuyableWithVariants } from '@shared/types';

export function useBuyables() {
  return useQuery<BuyableWithVariants[]>({
    queryKey: ['buyables'],
    queryFn: () => api.get<BuyableWithVariants[]>('/api/buyables'),
    staleTime: 2 * 60_000,
  });
}

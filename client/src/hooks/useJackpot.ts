import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';

export interface JackpotEligibility {
  eligible: boolean;
  reason: 'disabled' | 'not_allowed' | null;
}

export interface SpinResult {
  transactionId: string;
  multiplierPct: number;
  multiplierDecimal: number;
  variantPrice: number;
  pricePaid: number;
  productName: string;
  variantName: string;
}

export function useJackpotEligibility(): UseQueryResult<JackpotEligibility> {
  return useQuery<JackpotEligibility>({
    queryKey: ['jackpot', 'eligibility'],
    queryFn: () => api.get<JackpotEligibility>('/api/jackpot/eligibility'),
  });
}

export function useSpinJackpot(): UseMutationResult<
  SpinResult,
  Error,
  { buyableId: string; variantId: string }
> {
  const queryClient = useQueryClient();
  return useMutation<SpinResult, Error, { buyableId: string; variantId: string }>({
    mutationFn: (body) => api.post<SpinResult>('/api/jackpot/spin', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

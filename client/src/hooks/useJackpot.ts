import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type JackpotEligibility = {
  eligible: boolean;
  reason: 'disabled' | 'not_allowed' | null;
};

export type SpinResult = {
  transactionId: string;
  multiplierPct: number;
  multiplierDecimal: number;
  variantPrice: number;
  pricePaid: number;
  productName: string;
  variantName: string;
};

export function useJackpotEligibility() {
  return useQuery<JackpotEligibility>({
    queryKey: ['jackpot', 'eligibility'],
    queryFn: () => api.get<JackpotEligibility>('/api/jackpot/eligibility'),
  });
}

export function useSpinJackpot() {
  const queryClient = useQueryClient();
  return useMutation<SpinResult, Error, { buyableId: string; variantId: string }>({
    mutationFn: (body) => api.post<SpinResult>('/api/jackpot/spin', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

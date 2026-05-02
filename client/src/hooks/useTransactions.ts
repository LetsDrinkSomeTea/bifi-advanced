import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PaginatedResponse, TransactionWithItems } from '@shared/types';

export function useTransactionHistory() {
  return useInfiniteQuery<PaginatedResponse<TransactionWithItems>>({
    queryKey: ['transactions'],
    queryFn: ({ pageParam }) =>
      api.get<PaginatedResponse<TransactionWithItems>>(
        `/api/transactions${pageParam ? `?cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

interface PurchaseItem {
  buyableId: string;
  variantId?: string;
  quantity: number;
}

interface PurchaseBody {
  items: PurchaseItem[];
  groupId?: string;
  note?: string;
}

export interface PurchaseResult {
  id: string;
  voucherRedeemed: boolean;
}

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PurchaseBody) =>
      api.post<PurchaseResult>('/api/transactions/purchase', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['prost', 'vouchers'] });
    },
  });
}

export function useCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

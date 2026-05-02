import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PaginatedResponse, TransactionWithItems } from '@shared/types';

export function useTransactionHistory(): UseInfiniteQueryResult<
  InfiniteData<PaginatedResponse<TransactionWithItems>>
> {
  return useInfiniteQuery<PaginatedResponse<TransactionWithItems>>({
    queryKey: ['transactions'],
    queryFn: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : '';
      return api.get<PaginatedResponse<TransactionWithItems>>(
        `/api/transactions${cursor !== '' ? `?cursor=${cursor}` : ''}`,
      );
    },
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

export function usePurchase(): UseMutationResult<PurchaseResult, Error, PurchaseBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PurchaseBody) =>
      api.post<PurchaseResult>('/api/transactions/purchase', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['prost', 'vouchers'] });
    },
  });
}

export function useCancelTransaction(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/transactions/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

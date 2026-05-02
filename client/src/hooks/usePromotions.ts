import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Promotion {
  id: string;
  name: string;
  discountPercent: number | null;
  discountFixedCents: number | null;
  startTime: string | null;
  endTime: string | null;
  appliesTo: {
    buyableId?: string;
    variantId?: string;
    categoryIds?: string[];
  } | null;
  isActive: boolean;
  quantityLimit: number | null;
  quantityUsed: number;
  createdAt: string;
}

export function usePromotions(): UseQueryResult<Promotion[]> {
  return useQuery<Promotion[]>({
    queryKey: ['admin', 'promotions'],
    queryFn: () => api.get<Promotion[]>('/api/admin/promotions'),
  });
}

export function useCreatePromotion(): UseMutationResult<
  Promotion,
  Error,
  Omit<Promotion, 'id' | 'createdAt' | 'quantityUsed'>
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Promotion, 'id' | 'createdAt' | 'quantityUsed'>) =>
      api.post<Promotion>('/api/admin/promotions', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
  });
}

export function useUpdatePromotion(): UseMutationResult<
  Promotion,
  Error,
  { id: string } & Partial<Omit<Promotion, 'id' | 'createdAt' | 'quantityUsed'>>
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & Partial<Omit<Promotion, 'id' | 'createdAt' | 'quantityUsed'>>) =>
      api.patch<Promotion>(`/api/admin/promotions/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      void qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

export function useDeletePromotion(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/promotions/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      void qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

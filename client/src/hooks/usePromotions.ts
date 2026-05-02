import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function usePromotions() {
  return useQuery<Promotion[]>({
    queryKey: ['admin', 'promotions'],
    queryFn: () => api.get<Promotion[]>('/api/admin/promotions'),
  });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Promotion, 'id' | 'createdAt'>) =>
      api.post<Promotion>('/api/admin/promotions', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
  });
}

export function useUpdatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Omit<Promotion, 'id' | 'createdAt'>>) =>
      api.patch<Promotion>(`/api/admin/promotions/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/promotions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      qc.invalidateQueries({ queryKey: ['buyables'] });
    },
  });
}

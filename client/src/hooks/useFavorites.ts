import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Favorite } from '@shared/types';

export function useFavorites() {
  return useQuery<Favorite[]>({
    queryKey: ['favorites'],
    queryFn: () => api.get<Favorite[]>('/api/favorites'),
    staleTime: 60_000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, isFav }: { variantId: string; isFav: boolean }) =>
      isFav ? api.delete(`/api/favorites/${variantId}`) : api.post(`/api/favorites/${variantId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

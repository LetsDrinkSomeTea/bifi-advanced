import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Favorite } from '@shared/types';

export function useFavorites(): UseQueryResult<Favorite[]> {
  return useQuery<Favorite[]>({
    queryKey: ['favorites'],
    queryFn: () => api.get<Favorite[]>('/api/favorites'),
  });
}

export function useToggleFavorite(): UseMutationResult<
  void,
  Error,
  { variantId: string; isFav: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, isFav }: { variantId: string; isFav: boolean }) =>
      isFav
        ? api.delete(`/api/favorites/${variantId}`)
        : api.post(`/api/favorites/${variantId}`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AchievementMetaResponse } from '@shared/achievements';

export function useAchievementMeta(): UseQueryResult<AchievementMetaResponse> {
  return useQuery<AchievementMetaResponse>({
    queryKey: ['achievements', 'meta'],
    queryFn: () => api.get<AchievementMetaResponse>('/api/achievements/meta'),
    staleTime: Infinity, // Meta data doesn't change often
  });
}

import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { AchievementDef } from '@shared/achievements'

export function useAchievementMeta() {
  return useQuery({
    queryKey: ['achievements', 'meta'],
    queryFn: () => api.get<AchievementDef[]>('/api/achievements/meta'),
    staleTime: Infinity, // Meta data doesn't change often
  })
}

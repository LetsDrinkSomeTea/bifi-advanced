import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { LeaderboardEntry } from '@shared/types'

type LeaderboardType = 'total_spent' | 'total_purchases' | 'achievements' | 'prost_sent'
type LeaderboardPeriod = 'week' | 'month' | 'alltime'

export function useLeaderboard(type: LeaderboardType, period: LeaderboardPeriod) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', type, period],
    queryFn: () => api.get<LeaderboardEntry[]>(`/api/leaderboard?type=${type}&period=${period}`),
  })
}

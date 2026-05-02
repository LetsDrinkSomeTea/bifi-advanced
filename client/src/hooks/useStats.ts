import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface UserStats {
  finances: {
    totalSpent: number;
    avgPerMonth: number;
    avgPerTransaction: number;
    biggestPurchase: number;
    currentBalance: number;
    totalSaved: number;
    discountedItemCount: number;
  } | null;
  consumption: {
    topItems: { name: string; count: number }[];
    categories: { category: string; count: number }[];
    weekdayCounts: Record<string, number>;
    hourCounts: Record<string, number>;
    totalPurchases: number;
  } | null;
  social: {
    prostSent: number;
    prostReceived: number;
    nudgeSent: number;
    nudgeReceived: number;
    topRecipient: { displayName: string; count: number } | null;
    topSender: { displayName: string; count: number } | null;
  } | null;
  jackpot: {
    totalSpins: number;
    balance: number;
    wins: number;
    losses: number;
    avgMultiplier: number;
  } | null;
}

export interface SystemStats {
  totalUsers: number;
  totalTransactions: number;
  totalNudges: number;
  totalGroups: number;
  totalRevenue: number;
  avgTransactionAmount: number;
  avgRevenuePerMember: number;
  totalDrinksConsumed: number;
  mostPopularItem: { name: string; count: number } | null;
  biggestPurchase: number;
  allTimeJackpotSpins: number;
  systemJackpotBalance: number;
  allTimeProstSent: number;
  totalSystemSaved: number;
  totalDiscountedItems: number;
}

export function useUserStats(userId: string | undefined, period?: string) {
  return useQuery<UserStats>({
    queryKey: ['stats', 'user', userId, period],
    queryFn: () =>
      api.get<UserStats>(`/api/stats/user/${userId}${period ? `?period=${period}` : ''}`),
    enabled: !!userId,
  });
}

export function useSystemStats(period?: string) {
  return useQuery<SystemStats>({
    queryKey: ['stats', 'system', period],
    queryFn: () => api.get<SystemStats>(`/api/stats/system${period ? `?period=${period}` : ''}`),
  });
}

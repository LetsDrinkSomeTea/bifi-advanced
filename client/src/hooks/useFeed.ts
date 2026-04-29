import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { PaginatedResponse } from '@shared/types'

export interface FeedEntry {
  id: string
  type: string
  userId: string
  targetUserId: string | null
  targetGroupId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; displayName: string; avatarUrl: string | null }
  targetUser: { id: string; displayName: string; avatarUrl: string | null } | null
}

export function useFeed() {
  return useInfiniteQuery<PaginatedResponse<FeedEntry>>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) =>
      api.get<PaginatedResponse<FeedEntry>>(
        `/api/feed${pageParam ? `?cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

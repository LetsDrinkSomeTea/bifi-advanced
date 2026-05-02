import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PaginatedResponse, FeedEntry } from '@shared/types';

export type { FeedEntry };

export function useFeed(): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<FeedEntry>>> {
  return useInfiniteQuery<PaginatedResponse<FeedEntry>>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : '';
      return api.get<PaginatedResponse<FeedEntry>>(
        `/api/feed${cursor !== '' ? `?cursor=${cursor}` : ''}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

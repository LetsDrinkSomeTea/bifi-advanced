import { useFeed } from '../../hooks/useFeed';
import { FeedTimeline } from '../../components/FeedTimeline';
import type { FeedEntry } from '@shared/types';

export function VerlaufFeed(): React.JSX.Element {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();
  const entries: FeedEntry[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <FeedTimeline
      entries={entries}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      fetchNextPage={() => {
        void fetchNextPage();
      }}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}

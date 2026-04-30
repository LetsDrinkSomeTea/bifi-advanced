import { Layout } from '../components/layout/Layout'
import { FeedTimeline } from '../components/FeedTimeline'
import { useFeed } from '../hooks/useFeed'

export function Feed() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed()
  const entries = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-5">Feed</h1>
        <FeedTimeline
          entries={entries}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      </div>
    </Layout>
  )
}

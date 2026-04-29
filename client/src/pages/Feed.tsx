import { Layout } from '../components/layout/Layout'
import { FeedItem } from '../components/FeedItem'
import { useFeed } from '../hooks/useFeed'

export function Feed() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed()

  const entries = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Feed</h1>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-16">
            <p className="text-2xl mb-2">📭</p>
            <p>Noch keine Aktivitäten</p>
          </div>
        )}

        <div className="space-y-2">
          {entries.map((entry) => (
            <FeedItem key={entry.id} entry={entry} />
          ))}
        </div>

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full mt-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Laden…' : 'Mehr anzeigen'}
          </button>
        )}
      </div>
    </Layout>
  )
}

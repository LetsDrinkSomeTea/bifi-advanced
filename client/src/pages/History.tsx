import { Layout } from '../components/layout/Layout'
import { TransactionList } from '../components/TransactionList'
import { useTransactionHistory } from '../hooks/useTransactions'

export function History() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTransactionHistory()

  const allTxns = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Meine Käufe</h1>

        <TransactionList transactions={allTxns} isLoading={isLoading} />

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

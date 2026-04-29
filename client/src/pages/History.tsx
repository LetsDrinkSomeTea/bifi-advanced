import { RotateCcw } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { useTransactionHistory, useCancelTransaction } from '../hooks/useTransactions'
import { useAuth } from '../hooks/useAuth'
import { formatCents, formatRelative, cn } from '../lib/utils'

const TYPE_LABEL: Record<string, string> = {
  purchase: 'Kauf',
  deposit: 'Einzahlung',
  correction: 'Korrektur',
  jackpot: 'Jackpot 🎰',
  prost: 'Prost 🍺',
}

export function History() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTransactionHistory()
  const { mutate: cancel, isPending: cancelling } = useCancelTransaction()
  const { isModerator } = useAuth()

  const allTxns = data?.pages.flatMap((p) => p.data) ?? []

  const canCancel = (txn: { createdAt: string; type: string; cancelledAt: string | null }) => {
    if (txn.cancelledAt) return false
    if (txn.type === 'jackpot' && !isModerator) return false
    const ageMs = Date.now() - new Date(txn.createdAt).getTime()
    return ageMs <= 5 * 60 * 1000 || isModerator
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Meine Käufe</h1>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && allTxns.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">
            Noch keine Transaktionen
          </p>
        )}

        <div className="space-y-2">
          {allTxns.map((txn) => {
            const label = txn.items.length > 0
              ? txn.items.map((i) => `${i.quantity}× ${i.variantName ? `${i.buyableName} (${i.variantName})` : i.buyableName}`).join(', ')
              : TYPE_LABEL[txn.type] ?? txn.type

            const isCancelled = !!txn.cancelledAt
            const showCancelBtn = canCancel(txn as { createdAt: string; type: string; cancelledAt: string | null })

            return (
              <div
                key={txn.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border',
                  isCancelled ? 'border-border opacity-50 bg-muted/30' : 'border-border bg-card',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', isCancelled && 'line-through')}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelative(txn.createdAt)}
                    {isCancelled && ' · storniert'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn(
                    'font-semibold text-sm tabular-nums',
                    txn.totalAmount < 0 ? 'text-red-500' : 'text-green-500',
                  )}>
                    {txn.totalAmount < 0 ? '' : '+'}{formatCents(txn.totalAmount)}
                  </span>

                  {showCancelBtn && (
                    <button
                      onClick={() => cancel(txn.id)}
                      disabled={cancelling}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Stornieren"
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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

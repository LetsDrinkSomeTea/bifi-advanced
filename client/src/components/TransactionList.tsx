import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { useCancelTransaction } from '../hooks/useTransactions'
import { useAuth } from '../hooks/useAuth'
import type { TransactionWithItems } from '@shared/types'
import { formatCents, formatRelative, cn } from '../lib/utils'
import { GroupSummary, useGroups } from '@/hooks/useGroups'

const TYPE_LABEL: Record<string, string> = {
  purchase: 'Kauf',
  deposit: 'Einzahlung',
  correction: 'Korrektur',
  jackpot: 'Jackpot 🎰',
  prost: 'Prost 🍺',
}

function txnLabel(txn: TransactionWithItems): string {
  if (txn.items.length > 0) {
    return txn.items
      .map((i) => `${i.quantity}× ${i.variantName ? `${i.buyableName} (${i.variantName})` : i.buyableName}`)
      .join(', ')
  }
  return TYPE_LABEL[txn.type] ?? txn.type
}

function cancelable(txn: TransactionWithItems, isModerator: boolean): boolean {
  if (txn.cancelledAt) return false
  if (txn.type === 'deposit' || txn.type === 'correction') return false
  if (txn.type === 'jackpot' && !isModerator) return false
  const ageMs = Date.now() - new Date(txn.createdAt).getTime()
  return ageMs <= 5 * 60 * 1000
}

interface TransactionListProps {
  transactions: TransactionWithItems[]
  isLoading?: boolean
  skeletonCount?: number
}

export function TransactionList({ transactions, isLoading, skeletonCount = 5 }: TransactionListProps) {
  const { mutate: cancel, isPending: cancelling } = useCancelTransaction()
  const { isModerator } = useAuth()
  const { data: groups } = useGroups()

  const groupMap = useMemo(() => {
    const map = new Map<string, GroupSummary>()
    if (groups) {
      groups.forEach(g => map.set(g.id, g))
    }
    return map
  }, [groups])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-8">
        Noch keine Transaktionen
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((txn) => {
        const isCancelled = !!txn.cancelledAt
        const canCancel = cancelable(txn, isModerator)
        const groupSummary = (txn.groupId !== undefined && txn.groupId !== null)
          ? groupMap.get(txn.groupId)
          : null

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
                {txnLabel(txn)}
                {txn.groupId && <span className="ml-1.5 text-sm text-muted-foreground">{groupSummary ? groupSummary.name : "Gruppeneinkauf"}</span>}
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

              {canCancel && (
                <button
                  onClick={() => cancel(txn.id)}
                  disabled={cancelling}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title="Stornieren"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

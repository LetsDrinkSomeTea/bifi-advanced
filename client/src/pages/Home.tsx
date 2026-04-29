import { useState } from 'react'
import { Star } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { useFavorites } from '../hooks/useFavorites'
import { usePurchase } from '../hooks/useTransactions'
import type { Favorite } from '@shared/types'
import { formatCents, cn } from '../lib/utils'

type CardState = { variantId: string; status: 'buying' | 'done' | 'error' } | null

export function Home() {
  const { data: favorites, isLoading } = useFavorites()
  const { mutate: purchase } = usePurchase()
  const [cardState, setCardState] = useState<CardState>(null)

  const handleBuy = (fav: Favorite) => {
    if (cardState || !fav.isAvailable) return
    setCardState({ variantId: fav.variantId, status: 'buying' })
    purchase(
      { items: [{ buyableId: fav.buyableId, variantId: fav.variantId, quantity: 1 }] },
      {
        onSuccess: () => {
          setCardState({ variantId: fav.variantId, status: 'done' })
          setTimeout(() => setCardState(null), 900)
        },
        onError: () => {
          setCardState({ variantId: fav.variantId, status: 'error' })
          setTimeout(() => setCardState(null), 1200)
        },
      },
    )
  }

  return (
    <Layout>
      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">

        {/* Favorites */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Favoriten
          </h2>

          {isLoading && (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && (!favorites || favorites.length === 0) && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
              <Star size={28} className="mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                Noch keine Favoriten
              </p>
              <p className="text-xs text-muted-foreground opacity-70">
                Im Shop ★ neben einer Variante antippen
              </p>
            </div>
          )}

          {favorites && favorites.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((fav) => {
                const state = cardState?.variantId === fav.variantId ? cardState.status : null

                return (
                  <button
                    key={fav.variantId}
                    onClick={() => handleBuy(fav)}
                    disabled={!!cardState || !fav.isAvailable}
                    className={cn(
                      'relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all',
                      fav.isAvailable && 'active:scale-95',
                      state === 'done' && 'border-green-500 bg-green-500/10',
                      state === 'error' && 'border-destructive bg-destructive/10',
                      !state && fav.isAvailable && 'border-border bg-card hover:bg-accent',
                      !fav.isAvailable && 'border-border bg-muted/30 opacity-60 cursor-default',
                      fav.isAvailable && !!cardState && !state && 'opacity-50',
                    )}
                  >
                    {fav.category && (
                      <span className="text-xs text-muted-foreground">{fav.category}</span>
                    )}
                    <span className="font-semibold text-sm leading-tight">
                      {fav.buyableName}
                    </span>
                    <div className="flex items-end justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{fav.variantName}</span>
                      <span className={cn('text-sm font-bold', !fav.isAvailable && 'text-muted-foreground')}>
                        {!fav.isAvailable
                          ? 'Nicht verfügbar'
                          : state === 'buying' ? '…'
                          : state === 'done' ? '✓'
                          : state === 'error' ? '✕'
                          : formatCents(fav.price)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Feed preview — Phase 4 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Aktivität
          </h2>
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
            Feed kommt in Phase 4
          </div>
        </section>
      </div>
    </Layout>
  )
}

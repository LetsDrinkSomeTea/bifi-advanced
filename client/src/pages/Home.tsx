import React, { useState } from 'react';
import { Star, ChevronRight, X } from 'lucide-react';
import { Link } from 'wouter';
import { Layout } from '../components/layout/Layout';
import { TransactionList } from '../components/TransactionList';
import { FeedTimeline } from '../components/FeedTimeline';
import { groupEntries } from '../lib/feed';
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites';
import { useFeed } from '../hooks/useFeed';
import { usePurchase, useTransactionHistory } from '../hooks/useTransactions';
import { useVoucherMap } from '../hooks/useProst';
import type { Favorite } from '@shared/types';
import { formatCents, cn } from '../lib/utils';
import { CATEGORY_LABELS } from '@shared/schemas';

type CardState = { variantId: string; status: 'buying' | 'done' | 'error' } | null;

function HomeFeedPreview(): React.JSX.Element {
  const { data, isLoading } = useFeed();
  const entries = groupEntries(data?.pages[0]?.data ?? []).slice(0, 3);

  return <FeedTimeline entries={entries} isLoading={isLoading} preGrouped />;
}

export function Home(): React.JSX.Element {
  const { data: favorites, isLoading } = useFavorites();
  const { data: txnData, isLoading: txnLoading } = useTransactionHistory();
  const { mutate: purchase } = usePurchase();
  const { mutate: toggleFav } = useToggleFavorite();
  const voucherMap = useVoucherMap();
  const [cardState, setCardState] = useState<CardState>(null);

  const recentTxns = (txnData?.pages[0]?.data ?? []).slice(0, 3);

  const handleBuy = (fav: Favorite): void => {
    if (cardState !== null || !fav.isAvailable) return;
    setCardState({ variantId: fav.variantId, status: 'buying' });
    purchase(
      { items: [{ buyableId: fav.buyableId, variantId: fav.variantId, quantity: 1 }] },
      {
        onSuccess: () => {
          setCardState({ variantId: fav.variantId, status: 'done' });
          setTimeout(() => {
            setCardState(null);
          }, 900);
        },
        onError: () => {
          setCardState({ variantId: fav.variantId, status: 'error' });
          setTimeout(() => {
            setCardState(null);
          }, 1200);
        },
      },
    );
  };

  return (
    <Layout>
      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">
        {/* Favorites */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Favoriten
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : null}

          {!isLoading && (!favorites || favorites.length === 0) && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
              <Star size={28} className="mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Noch keine Favoriten</p>
              <p className="text-xs text-muted-foreground opacity-70">
                Im Shop ★ neben einer Variante antippen
              </p>
            </div>
          )}

          {favorites && favorites.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((fav) => {
                const state = cardState?.variantId === fav.variantId ? cardState.status : null;

                return (
                  <div key={fav.variantId} className="relative group">
                    <button
                      key={fav.variantId}
                      onClick={() => {
                        handleBuy(fav);
                      }}
                      disabled={!!cardState || !fav.isAvailable}
                      className={cn(
                        'w-full h-full relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all overflow-hidden',
                        fav.isAvailable && 'active:scale-95',
                        state === 'done' && 'border-green-500 bg-green-500/10',
                        state === 'error' && 'border-destructive bg-destructive/10',
                        !state && fav.isAvailable && 'border-border bg-card hover:bg-accent',
                        !fav.isAvailable && 'border-border bg-muted/30 opacity-60 cursor-default',
                        fav.isAvailable && !!cardState && !state && 'opacity-50',
                      )}
                    >
                      {fav.isAvailable && fav.activeDiscount && !state ? (
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg pointer-events-none uppercase tracking-tighter text-center leading-tight">
                          <div>
                            {fav.activeDiscount.type === 'percent'
                              ? `-${fav.activeDiscount.value}%`
                              : 'SALE'}
                          </div>
                          {fav.activeDiscount.quantityRemaining !== null && (
                            <div className="normal-case">
                              noch {fav.activeDiscount.quantityRemaining}x
                            </div>
                          )}
                        </div>
                      ) : null}
                      {fav.category ? (
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[fav.category]}
                        </span>
                      ) : null}
                      <span className="font-semibold text-sm leading-tight pr-4">
                        {fav.buyableName}
                      </span>
                      <div className="flex items-end justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{fav.variantName}</span>
                        <div className="flex items-center gap-1">
                          {fav.isAvailable && voucherMap.has(fav.variantId) && !state ? (
                            <span className="text-sm">🎁</span>
                          ) : null}
                          <span
                            className={cn(
                              'text-sm font-bold tabular-nums',
                              !fav.isAvailable && 'text-muted-foreground',
                              fav.isAvailable && fav.activeDiscount && !state && 'text-orange-500',
                              voucherMap.has(fav.variantId) &&
                                !state &&
                                'line-through text-muted-foreground opacity-50',
                            )}
                          >
                            {!fav.isAvailable
                              ? 'Nicht verfügbar'
                              : state === 'buying'
                                ? '…'
                                : state === 'done'
                                  ? '✓'
                                  : state === 'error'
                                    ? '✕'
                                    : formatCents(
                                        fav.activeDiscount ? fav.discountedPrice : fav.price,
                                      )}
                          </span>
                          {fav.isAvailable &&
                          fav.activeDiscount &&
                          !state &&
                          !voucherMap.has(fav.variantId) ? (
                            <span className="text-[10px] text-muted-foreground line-through decoration-muted-foreground/30 font-normal">
                              {formatCents(fav.price)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    {/* Remove Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav({ variantId: fav.variantId, isFav: true });
                      }}
                      className={cn(
                        'absolute -top-1 -right-1 p-1 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all opacity-0 group-hover:opacity-100 shadow-sm z-10',
                        !fav.isAvailable && 'opacity-100',
                      )}
                      title="Aus Favoriten entfernen"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Recent purchases */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Letzte Käufe
            </h2>
            <Link
              href="/history"
              className="flex items-center gap-0.5 text-xs text-primary hover:underline"
            >
              Alle <ChevronRight size={13} />
            </Link>
          </div>

          <TransactionList transactions={recentTxns} isLoading={txnLoading} skeletonCount={3} />
        </section>

        {/* Feed preview */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Aktivität
            </h2>
            <Link
              href="/social?tab=activity"
              className="flex items-center gap-0.5 text-xs text-primary hover:underline"
            >
              Alle <ChevronRight size={13} />
            </Link>
          </div>
          <HomeFeedPreview />
        </section>
      </div>
    </Layout>
  );
}

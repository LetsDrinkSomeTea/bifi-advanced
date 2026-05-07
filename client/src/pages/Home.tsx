import React, { useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { Layout } from '../components/layout/Layout';
import { TransactionList } from '../components/TransactionList';
import { FeedTimeline } from '../components/FeedTimeline';
import { groupEntries } from '../lib/feed';
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites';
import { useFeed } from '../hooks/useFeed';
import { usePurchase, useTransactionHistory } from '../hooks/useTransactions';
import { useVoucherMap } from '../hooks/useProst';
import { useAuth, useAuthConfig } from '../hooks/useAuth';
import type { Favorite } from '@shared/types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { BuyableVariantCard } from '../components/BuyableVariantCard';
import { Button } from '../components/ui/Button';
import { BalanceWarningBanner } from '../components/BalanceWarningBanner';

type CardState = { variantId: string; status: 'buying' | 'done' | 'error' } | null;

function HomeFeedPreview(): React.JSX.Element {
  const { data, isLoading } = useFeed();
  const entries = groupEntries(data?.pages[0]?.data ?? []).slice(0, 3);

  return <FeedTimeline entries={entries} isLoading={isLoading} preGrouped />;
}

export function Home(): React.JSX.Element {
  const { user } = useAuth();
  const { data: authConfig } = useAuthConfig();
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
        onError: (err) => {
          setCardState({ variantId: fav.variantId, status: 'error' });
          toast.error(err instanceof Error ? err.message : 'Fehler beim Kauf');
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
        {/* Banners */}
        {!!(user && authConfig) && (
          <BalanceWarningBanner
            balance={user.balance}
            threshold={authConfig.balanceWarnThreshold}
          />
        )}

        {/* Favorites */}
        <section>
          <SectionHeader>Favoriten</SectionHeader>

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
              {favorites.map((fav) => (
                <BuyableVariantCard
                  key={fav.variantId}
                  buyableName={fav.buyableName}
                  variantName={fav.variantName}
                  price={fav.price}
                  discountedPrice={fav.discountedPrice}
                  category={fav.category}
                  isAvailable={fav.isAvailable}
                  activeDiscount={fav.activeDiscount}
                  hasVoucher={voucherMap.has(fav.variantId)}
                  onBuy={() => {
                    handleBuy(fav);
                  }}
                  onRemoveFavorite={() => {
                    toggleFav({ variantId: fav.variantId, isFav: true });
                  }}
                  status={cardState?.variantId === fav.variantId ? cardState.status : null}
                  compact
                />
              ))}
            </div>
          ) : null}
        </section>

        {/* Recent purchases */}
        <section>
          <SectionHeader
            rightElement={
              <Link href="/verlauf/transaktionen">
                <Button variant="ghost" size="sm" className="h-7 gap-0.5 text-primary">
                  Alle <ChevronRight size={13} />
                </Button>
              </Link>
            }
          >
            Letzte Käufe
          </SectionHeader>

          <TransactionList transactions={recentTxns} isLoading={txnLoading} skeletonCount={3} />
        </section>

        {/* Feed preview */}
        <section>
          <SectionHeader
            rightElement={
              <Link href="/verlauf">
                <Button variant="ghost" size="sm" className="h-7 gap-0.5 text-primary">
                  Alle <ChevronRight size={13} />
                </Button>
              </Link>
            }
          >
            Aktivität
          </SectionHeader>
          <HomeFeedPreview />
        </section>
      </div>
    </Layout>
  );
}

import React from 'react';
import { Star, X, Gift } from 'lucide-react';
import { cn } from '../lib/utils';
import { CATEGORY_LABELS } from '@shared/schemas';
import { Badge } from './ui/Badge';
import { PriceDisplay } from './ui/PriceDisplay';
import type { BuyableCategory } from '@shared/schemas';

export interface BuyableVariantCardProps {
  buyableName: string;
  variantName: string;
  price: number;
  discountedPrice: number | null;
  category: BuyableCategory | null;
  isAvailable: boolean;
  activeDiscount?: {
    type: 'percent' | 'fixed';
    value: number;
    quantityRemaining: number | null;
  } | null;
  isFavorite?: boolean;
  hasVoucher?: boolean;
  onBuy?: () => void;
  onToggleFavorite?: () => void;
  onRemoveFavorite?: () => void;
  status?: 'buying' | 'done' | 'error' | null;
  className?: string;
  compact?: boolean;
}

export function BuyableVariantCard({
  buyableName,
  variantName,
  price,
  discountedPrice,
  category,
  isAvailable,
  activeDiscount,
  isFavorite,
  hasVoucher,
  onBuy,
  onToggleFavorite,
  onRemoveFavorite,
  status,
  className,
  compact = false,
}: BuyableVariantCardProps): React.JSX.Element {
  return (
    <div className={cn('relative group', className)}>
      <button
        onClick={onBuy}
        disabled={!!status || !isAvailable}
        className={cn(
          'w-full h-full relative flex flex-col justify-between rounded-2xl border text-left transition-all overflow-hidden',
          compact ? 'p-4' : 'p-3',
          isAvailable && 'active:scale-95',
          status === 'done' && 'border-confirm-strong bg-confirm-soft',
          status === 'error' && 'border-destructive-strong bg-destructive-soft',
          !status &&
            isAvailable &&
            'border-border bg-card hover:bg-primary-soft hover:text-primary-strong',
          !isAvailable && 'border-border bg-muted/30 cursor-default',
        )}
      >
        {!!(isAvailable && activeDiscount && !status) && (
          <div className="absolute top-0 right-0 pointer-events-none">
            <Badge
              variant="accent"
              className={cn(
                'rounded-none rounded-bl-lg px-1.5 py-0.5 text-[8px] leading-tight flex flex-col items-center',
              )}
            >
              <span>
                {activeDiscount.type === 'percent' ? `-${activeDiscount.value}%` : 'SALE'}
              </span>
              {activeDiscount.quantityRemaining !== null && (
                <span className="normal-case font-medium">
                  noch {activeDiscount.quantityRemaining}x
                </span>
              )}
            </Badge>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {!!category && (
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
              {CATEGORY_LABELS[category]}
            </span>
          )}

          <span className={cn('font-bold leading-tight pr-4', compact ? 'text-sm' : 'text-base')}>
            {buyableName}
          </span>
        </div>

        <div className="flex items-end justify-between mt-2">
          <div className="flex-1 min-w-0 mr-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs text-muted-foreground font-medium truncate">
                {variantName}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isAvailable ? (
                  <span className="text-[10px] font-black uppercase text-muted-foreground/60">
                    N/V
                  </span>
                ) : status === 'buying' ? (
                  <span className="text-sm font-bold tabular-nums animate-pulse">…</span>
                ) : status === 'done' ? (
                  <span className="text-sm font-bold tabular-nums text-confirm-strong">✓</span>
                ) : status === 'error' ? (
                  <span className="text-sm font-bold tabular-nums text-destructive-strong">✕</span>
                ) : (
                  <PriceDisplay
                    price={price}
                    discountedPrice={hasVoucher ? 0 : activeDiscount ? discountedPrice : null}
                    size="sm"
                  />
                )}
                {!!(isAvailable && hasVoucher && !status) && (
                  <span className="text-sm">
                    <Gift size={14} className="text-accent-strong" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {!!onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                'p-1 rounded-full transition-colors flex-shrink-0',
                isFavorite
                  ? 'text-accent-strong hover:bg-accent-soft/50'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Star
                size={16}
                fill={isFavorite ? 'currentColor' : 'none'}
                strokeWidth={isFavorite ? 1.5 : 2}
              />
            </button>
          )}
        </div>
      </button>

      {!!onRemoveFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFavorite();
          }}
          className={cn(
            'absolute -top-1 -right-1 p-1 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all shadow-sm z-10',
            isAvailable
              ? 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
              : 'opacity-60 hover:opacity-100',
          )}
          title="Aus Favoriten entfernen"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

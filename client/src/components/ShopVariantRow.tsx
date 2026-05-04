import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/Badge';
import { PriceDisplay } from './ui/PriceDisplay';
import { Button } from './ui/Button';

export interface ShopVariantRowProps {
  name: string;
  price: number;
  discountedPrice: number | null;
  isAvailable: boolean;
  activeDiscount?: {
    type: 'percent' | 'fixed';
    value: number;
    quantityRemaining: number | null;
  } | null;
  isFavorite: boolean;
  voucherCount: number;
  onOpenBuySheet: () => void;
  onToggleFavorite: () => void;
}

export function ShopVariantRow({
  name,
  price,
  discountedPrice,
  isAvailable,
  activeDiscount,
  isFavorite,
  voucherCount,
  onOpenBuySheet,
  onToggleFavorite,
}: ShopVariantRowProps): React.JSX.Element {
  const hasVoucher = voucherCount > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-primary-soft/50 transition-colors group">
      <button
        onClick={onOpenBuySheet}
        disabled={!isAvailable}
        className="flex-1 min-w-0 flex items-center gap-3 text-left disabled:opacity-50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{name}</span>
            {hasVoucher ? (
              <Badge variant="accent-soft" className="h-5 px-1.5">
                {voucherCount}x 🎁
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <PriceDisplay
              price={price}
              discountedPrice={activeDiscount ? discountedPrice : hasVoucher ? 0 : null}
              size="md"
              showDiscount={!!activeDiscount}
            />
            {!!activeDiscount && (
              <>
                <span className="text-[10px] font-black text-accent-strong uppercase tracking-tighter">
                  {activeDiscount.type === 'percent' ? `-${activeDiscount.value}%` : 'Aktion'}
                </span>
                {activeDiscount.quantityRemaining !== null ? (
                  <span className="text-[10px] font-medium text-primary-strong">
                    noch {activeDiscount.quantityRemaining}x
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={cn(
            'transition-all h-9 w-9',
            isFavorite
              ? 'text-accent-strong hover:text-accent-hover hover:bg-accent-soft/30'
              : 'text-muted-foreground hover:text-primary-strong hover:bg-primary-soft/50',
          )}
          title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          <Star
            size={18}
            fill={isFavorite ? 'currentColor' : 'none'}
            strokeWidth={isFavorite ? 1.5 : 2}
          />
        </Button>
      </div>
    </div>
  );
}

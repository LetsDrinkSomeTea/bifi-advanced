import * as React from 'react';
import { formatCents, cn } from '../../lib/utils';

interface PriceDisplayProps {
  price: number;
  discountedPrice?: number | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showDiscount?: boolean;
}

export function PriceDisplay({
  price,
  discountedPrice,
  className,
  size = 'md',
  showDiscount = true,
}: PriceDisplayProps): React.JSX.Element {
  const isDiscounted =
    discountedPrice !== undefined &&
    discountedPrice !== null &&
    discountedPrice < price &&
    discountedPrice >= 0;

  const currentPrice = isDiscounted ? discountedPrice : price;

  const sizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-2xl',
  };

  const oldSizeClasses = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
    '2xl': 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'font-bold tabular-nums',
          sizeClasses[size],
          isDiscounted ? 'text-accent-strong' : 'text-foreground',
        )}
      >
        {formatCents(currentPrice)}
      </span>
      {isDiscounted && showDiscount ? (
        <span
          className={cn(
            'text-muted-foreground line-through decoration-muted-foreground/30 font-normal',
            oldSizeClasses[size],
          )}
        >
          {formatCents(price)}
        </span>
      ) : null}
    </div>
  );
}

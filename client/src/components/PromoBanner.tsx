import React, { useMemo } from 'react';
import { Sparkles, Tag } from 'lucide-react';
import type { BuyableWithVariants } from '@shared/types';
import { formatTimeLeft } from '../lib/utils';
import { Badge } from './ui/Badge';

export function PromoBanner({ items }: { items: BuyableWithVariants[] }): React.JSX.Element | null {
  const { title, summary, badge } = useMemo(() => {
    const discountedLabels: string[] = [];
    let earliestEnd: number | null = null;
    let minQuantityRemaining: number | null = null;

    items.forEach((item) => {
      const discountedVariants = item.variants.filter((v) => v.activeDiscount);

      if (discountedVariants.length === 1 && discountedVariants[0]) {
        discountedLabels.push(`${item.name} (${discountedVariants[0].name})`);
      } else if (discountedVariants.length > 1) {
        discountedLabels.push(item.name);
      }

      discountedVariants.forEach((v) => {
        if (
          v.activeDiscount?.quantityRemaining !== null &&
          v.activeDiscount?.quantityRemaining !== undefined
        ) {
          if (
            minQuantityRemaining === null ||
            v.activeDiscount.quantityRemaining < minQuantityRemaining
          ) {
            minQuantityRemaining = v.activeDiscount.quantityRemaining;
          }
        } else if (v.activeDiscount?.endTime) {
          const time = new Date(v.activeDiscount.endTime).getTime();
          if (earliestEnd === null || time < earliestEnd) earliestEnd = time;
        }
      });
    });

    if (discountedLabels.length === 0) return { title: '', summary: '', badge: '' };

    let summaryStr = '';
    if (discountedLabels.length <= 2) {
      summaryStr = discountedLabels.join(' & ') + ' reduziert';
    } else {
      summaryStr = `${discountedLabels.length} Produkte reduziert`;
    }

    let badgeText = '';
    if (typeof minQuantityRemaining === 'number') {
      badgeText = `noch ${String(minQuantityRemaining)}x`;
    } else if (typeof earliestEnd === 'number') {
      badgeText = formatTimeLeft(new Date(earliestEnd).toISOString()) ?? '';
    } else {
      badgeText = 'Aktion';
    }

    return {
      title: discountedLabels.length > 1 ? 'Angebote' : 'Angebot',
      summary: summaryStr,
      badge: badgeText,
    };
  }, [items]);

  if (!summary) return null;

  return (
    <div className="bg-primary rounded-2xl p-4 text-primary-foreground shadow-lg shadow-primary/10 flex items-center gap-4 overflow-hidden relative group transition-all">
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Sparkles size={100} />
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Tag size={24} className="animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-black text-lg leading-tight uppercase tracking-tighter italic">
            {title}
          </h3>
          {badge !== '' ? (
            <Badge
              variant="outline"
              className="bg-white/10 border-white/20 text-white font-bold h-5"
            >
              {badge}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm font-medium opacity-90 truncate">{summary}</p>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Sparkles, Tag } from 'lucide-react';
import type { BuyableWithVariants } from '@shared/types';
import { formatCents, formatTimeLeft } from '../lib/utils';
import { Badge } from './ui/Badge';
import { InfoSheet } from './InfoSheet';

export function PromoBanner({ items }: { items: BuyableWithVariants[] }): React.JSX.Element | null {
  const [sheetOpen, setSheetOpen] = useState(false);

  const { title, summary, badge, discountedRows } = useMemo(() => {
    const rows: {
      productName: string;
      variantName: string;
      originalPrice: number;
      discountedPrice: number;
      quantityRemaining: number | null;
      endTime: string | null;
    }[] = [];
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
        if (!v.activeDiscount) return;

        rows.push({
          productName: item.name,
          variantName: v.name,
          originalPrice: v.price,
          discountedPrice: v.discountedPrice,
          quantityRemaining: v.activeDiscount.quantityRemaining,
          endTime: v.activeDiscount.endTime,
        });

        if (v.activeDiscount.quantityRemaining !== null) {
          if (minQuantityRemaining === null || v.activeDiscount.quantityRemaining < minQuantityRemaining) {
            minQuantityRemaining = v.activeDiscount.quantityRemaining;
          }
        } else if (v.activeDiscount.endTime) {
          const time = new Date(v.activeDiscount.endTime).getTime();
          if (earliestEnd === null || time < earliestEnd) earliestEnd = time;
        }
      });
    });

    if (discountedLabels.length === 0) return { title: '', summary: '', badge: '', discountedRows: [] };

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
      discountedRows: rows,
    };
  }, [items]);

  if (!summary) return null;

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="w-full text-left bg-primary rounded-2xl p-4 text-primary-foreground shadow-lg shadow-primary/10 flex items-center gap-4 overflow-hidden relative group transition-all active:scale-[0.98]"
      >
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
      </button>

      <InfoSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={discountedRows.length > 1 ? 'Aktuelle Angebote' : 'Aktuelles Angebot'}
      >
        <div className="flex flex-col gap-2">
          {discountedRows.map((row, i) => {
            const pct = Math.round((1 - row.discountedPrice / row.originalPrice) * 100);
            const timeLeft = row.endTime ? formatTimeLeft(row.endTime) : null;

            return (
              <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-tight">
                    {row.productName}
                    {row.variantName !== row.productName ? (
                      <span className="text-muted-foreground font-normal"> · {row.variantName}</span>
                    ) : null}
                  </p>
                  {row.quantityRemaining !== null ? (
                    <p className="text-xs text-muted-foreground mt-0.5">noch {row.quantityRemaining}x verfügbar</p>
                  ) : timeLeft !== null ? (
                    <p className="text-xs text-muted-foreground mt-0.5">endet in {timeLeft}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs text-muted-foreground line-through leading-none">
                    {formatCents(row.originalPrice)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-sm text-confirm-strong">
                      {formatCents(row.discountedPrice)}
                    </span>
                    <span className="text-[10px] font-semibold bg-confirm/15 text-confirm-strong rounded px-1 py-0.5 leading-none">
                      -{pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </InfoSheet>
    </>
  );
}

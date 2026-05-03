import { useMemo, useState } from 'react';
import { Search, Star, Sparkles, Tag } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { BuySheet } from '../components/BuySheet';
import { useBuyables } from '../hooks/useBuyables';
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites';
import type { BuyableWithVariants } from '@shared/types';
import { formatCents, cn } from '../lib/utils';
import { BUYABLE_CATEGORIES, CATEGORY_LABELS, type BuyableCategory } from '@shared/schemas';
import { useVoucherMap } from '@/hooks/useProst';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { HorizontalScroll } from '../components/ui/HorizontalScroll';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

function formatTimeLeft(endTime: string | null): string | null {
  if (!endTime) return null;
  endTime = new Date(endTime).toISOString();
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'beendet';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `noch ${days} ${days === 1 ? 'Tag' : 'Tage'}`;
  if (hours > 0) return `noch ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
  return `noch ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
}

function PromoBanner({ items }: { items: BuyableWithVariants[] }): React.JSX.Element | null {
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

    let badge = '';
    if (typeof minQuantityRemaining === 'number') {
      badge = `noch ${String(minQuantityRemaining)}x`;
    } else if (typeof earliestEnd === 'number') {
      badge = formatTimeLeft(new Date(earliestEnd).toISOString()) ?? '';
    } else {
      badge = 'zeitlich unbegrenzt';
    }

    return {
      title: discountedLabels.length > 1 ? 'Rabatte verfügbar' : 'Rabatt verfügbar',
      summary: summaryStr,
      badge,
    };
  }, [items]);

  if (!summary) return null;

  return (
    <div className="bg-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20 flex items-center gap-4 overflow-hidden relative group transition-all active:scale-[0.98]">
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Sparkles size={100} />
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Tag size={24} className="animate-bounce" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-black text-lg leading-tight uppercase tracking-tighter italic">
            {title}
          </h3>
          {badge !== '' ? (
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-bold whitespace-nowrap">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium opacity-95 truncate">{summary}</p>
      </div>
    </div>
  );
}

export function Shop(): React.JSX.Element {
  const { data: items, isLoading } = useBuyables();
  const { data: favorites } = useFavorites();
  const { mutate: toggleFav } = useToggleFavorite();

  const [selected, setSelected] = useState<BuyableWithVariants | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const voucherMap = useVoucherMap();

  const favoriteIds = useMemo(() => new Set(favorites?.map((f) => f.variantId) ?? []), [favorites]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items?.forEach((i) => {
      if (i.category) cats.add(i.category);
    });
    return BUYABLE_CATEGORIES.filter((cat) => cats.has(cat));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items ?? [];
    if (activeCategory) list = list.filter((i) => i.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.variants.some((v) => v.name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [items, activeCategory, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, BuyableWithVariants[]>();
    for (const item of filtered) {
      const key = item.category ?? 'other';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return BUYABLE_CATEGORIES.filter((cat) => map.has(cat)).map((cat) => {
      const prods = map.get(cat);
      if (!prods) throw new Error(`Category ${cat} missing in map`);
      return [cat, prods] as [string, BuyableWithVariants[]];
    });
  }, [filtered]);

  const openSheet = (item: BuyableWithVariants, variantId: string): void => {
    setSelected(item);
    setSelectedVariantId(variantId);
  };

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Promo Banner */}
        {!isLoading && items ? <PromoBanner items={items} /> : null}

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Produkt oder Variante suchen…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl h-auto"
          />
        </div>

        {/* Category filter */}
        {categories.length > 0 ? (
          <HorizontalScroll>
            <div className="flex gap-2 pb-2">
              <Button
                onClick={() => {
                  setActiveCategory(null);
                }}
                variant={!activeCategory ? 'default' : 'secondary'}
                className="rounded-full flex-shrink-0"
                size="sm"
              >
                Alle
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat === activeCategory ? null : cat);
                  }}
                  variant={activeCategory === cat ? 'default' : 'secondary'}
                  className="rounded-full flex-shrink-0"
                  size="sm"
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
          </HorizontalScroll>
        ) : null}

        {/* Skeleton */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                {[1, 2].map((j) => (
                  <div key={j} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {/* Product groups */}
        {!isLoading &&
          grouped.map(([category, products]) => (
            <section key={category}>
              {!activeCategory ? (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[category as BuyableCategory]}
                </h2>
              ) : null}
              <div className="space-y-3">
                {products.map((item) => {
                  const activeVariants = item.variants.filter((v) => v.isActive);
                  const firstCategoryChar = (
                    item.category ? CATEGORY_LABELS[item.category] : null
                  )?.[0];

                  return (
                    <Card key={item.id} className="rounded-2xl overflow-hidden">
                      <CardHeader className="p-0">
                        <div className="px-4 py-3 bg-muted/30 flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover bg-muted flex-shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shadow-sm">
                              {firstCategoryChar ?? '📦'}
                            </div>
                          )}
                          <h3 className="font-bold text-base">{item.name}</h3>
                        </div>
                      </CardHeader>

                      <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                          {activeVariants.map((v) => {
                            const isFav = favoriteIds.has(v.id);
                            const voucherCount = voucherMap.get(v.id) ?? 0;
                            const hasVoucher = voucherCount > 0;

                            return (
                              <div
                                key={v.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group"
                              >
                                <Button
                                  onClick={() => {
                                    openSheet(item, v.id);
                                  }}
                                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm truncate">
                                        {v.name}
                                      </span>
                                      {hasVoucher ? (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                          {voucherCount}x 🎁
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {v.activeDiscount !== null ? (
                                        <>
                                          <span className="text-sm font-bold text-orange-500">
                                            {formatCents(v.discountedPrice)}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground line-through decoration-muted-foreground/50">
                                            {formatCents(v.price)}
                                          </span>
                                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter">
                                            {v.activeDiscount.type === 'percent'
                                              ? `-${v.activeDiscount.value}%`
                                              : 'Aktion'}
                                          </span>
                                          {v.activeDiscount.quantityRemaining !== null ? (
                                            <span className="text-[10px] font-medium text-blue-500">
                                              noch {v.activeDiscount.quantityRemaining}x
                                            </span>
                                          ) : null}
                                        </>
                                      ) : (
                                        <span className="text-sm font-medium text-foreground/80">
                                          {formatCents(v.price)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </Button>

                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFav({ variantId: v.id, isFav });
                                    }}
                                    className={cn(
                                      'transition-all',
                                      isFav
                                        ? 'text-yellow-500 hover:text-yellow-500/80'
                                        : 'text-muted-foreground hover:text-yellow-500',
                                    )}
                                    title={
                                      isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'
                                    }
                                  >
                                    <Star
                                      size={18}
                                      fill={isFav ? 'currentColor' : 'none'}
                                      strokeWidth={isFav ? 1.5 : 2}
                                    />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}

        {!isLoading && filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">Keine Produkte gefunden</p>
        ) : null}
      </div>

      <BuySheet
        buyable={selected}
        initialVariantId={selectedVariantId}
        onClose={() => {
          setSelected(null);
          setSelectedVariantId(null);
        }}
      />
    </Layout>
  );
}

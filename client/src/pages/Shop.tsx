import { useMemo, useState } from 'react';
import { Search, Sparkles, Tag } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { BuySheet } from '../components/BuySheet';
import { useBuyables } from '../hooks/useBuyables';
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites';
import type { BuyableWithVariants } from '@shared/types';
import { BUYABLE_CATEGORIES, CATEGORY_LABELS, type BuyableCategory } from '@shared/schemas';
import { useVoucherMap } from '@/hooks/useProst';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { HorizontalScroll } from '../components/ui/HorizontalScroll';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SectionHeader } from '../components/ui/SectionHeader';

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

import { ShopVariantRow } from '../components/ShopVariantRow';

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
      badge = 'Aktion';
    }

    return {
      title: discountedLabels.length > 1 ? 'Angebote' : 'Angebot',
      summary: summaryStr,
      badge,
    };
  }, [items]);

  if (!summary) return null;

  return (
    <div className="bg-primary rounded-2xl p-4 text-primary-foreground shadow-lg shadow-primary/10 flex items-center gap-4 overflow-hidden relative group transition-all active:scale-[0.98]">
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
                <SectionHeader className="mb-2">
                  {CATEGORY_LABELS[category as BuyableCategory]}
                </SectionHeader>
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
                          {activeVariants.map((v) => (
                            <ShopVariantRow
                              key={v.id}
                              name={v.name}
                              price={v.price}
                              discountedPrice={v.discountedPrice}
                              isAvailable={v.isActive}
                              activeDiscount={v.activeDiscount}
                              isFavorite={favoriteIds.has(v.id)}
                              voucherCount={voucherMap.get(v.id) ?? 0}
                              onOpenBuySheet={() => {
                                openSheet(item, v.id);
                              }}
                              onToggleFavorite={() => {
                                toggleFav({ variantId: v.id, isFav: favoriteIds.has(v.id) });
                              }}
                            />
                          ))}
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

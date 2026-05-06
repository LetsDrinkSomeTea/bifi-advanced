import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
import { SectionHeader } from '../components/ui/SectionHeader';

import { PromoBanner } from '../components/PromoBanner';
import { ShopVariantRow } from '../components/ShopVariantRow';

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
                  const singleVariant = activeVariants.length === 1 ? activeVariants[0] : null;

                  if (singleVariant) {
                    return (
                      <Card key={item.id} className="rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                          <ShopVariantRow
                            name={item.name}
                            price={singleVariant.price}
                            discountedPrice={singleVariant.discountedPrice}
                            isAvailable={singleVariant.isActive}
                            activeDiscount={singleVariant.activeDiscount}
                            isFavorite={favoriteIds.has(singleVariant.id)}
                            voucherCount={voucherMap.get(singleVariant.id) ?? 0}
                            onOpenBuySheet={() => { openSheet(item, singleVariant.id); }}
                            onToggleFavorite={() => { toggleFav({ variantId: singleVariant.id, isFav: favoriteIds.has(singleVariant.id) }); }}
                          />
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card key={item.id} className="rounded-2xl overflow-hidden">
                      <CardHeader className="p-0">
                        <div className="px-4 py-3 bg-muted/30">
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
                              onOpenBuySheet={() => { openSheet(item, v.id); }}
                              onToggleFavorite={() => { toggleFav({ variantId: v.id, isFav: favoriteIds.has(v.id) }); }}
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

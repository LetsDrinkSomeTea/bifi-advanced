import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Star } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { BuySheet } from '../components/BuySheet'
import { useBuyables } from '../hooks/useBuyables'
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites'
import type { BuyableWithVariants } from '@shared/types'
import { formatCents, cn } from '../lib/utils'
import { BUYABLE_CATEGORIES, CATEGORY_LABELS, type BuyableCategory } from '@shared/schemas'
import { useVoucherMap } from '@/hooks/useProst'

export function Shop() {
  const { data: items, isLoading } = useBuyables()
  const { data: favorites } = useFavorites()
  const { mutate: toggleFav } = useToggleFavorite()

  const [selected, setSelected] = useState<BuyableWithVariants | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const voucherMap = useVoucherMap()

  const favoriteIds = useMemo(
    () => new Set(favorites?.map((f) => f.variantId) ?? []),
    [favorites],
  )

  const categories = useMemo(() => {
    const cats = new Set<string>()
    items?.forEach((i) => { if (i.category) cats.add(i.category) })
    return BUYABLE_CATEGORIES.filter(cat => cats.has(cat))
  }, [items])

  const filtered = useMemo(() => {
    let list = items ?? []
    if (activeCategory) list = list.filter((i) => i.category === activeCategory)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.variants.some((v) => v.name.toLowerCase().includes(q)),
      )
    }
    return list
  }, [items, activeCategory, search])

  const grouped = useMemo(() => {
    const map = new Map<string, BuyableWithVariants[]>()
    for (const item of filtered) {
      const key = item.category ?? 'other'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return BUYABLE_CATEGORIES
      .filter(cat => map.has(cat))
      .map(cat => [cat, map.get(cat)!] as [string, BuyableWithVariants[]])
  }, [filtered])

  const filterRef = useRef<HTMLDivElement>(null)
  const [leftFade, setLeftFade] = useState(false)
  const [rightFade, setRightFade] = useState(false)

  useEffect(() => {
    const el = filterRef.current
    if (!el) return
    const update = () => {
      setLeftFade(el.scrollLeft > 0)
      setRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [categories])

  const openSheet = (item: BuyableWithVariants, variantId: string) => {
    setSelected(item)
    setSelectedVariantId(variantId)
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Produkt oder Variante suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="relative">
            {leftFade && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-background to-transparent z-10" />
            )}
            {rightFade && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-background to-transparent z-10" />
            )}
            <div ref={filterRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin-x">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  !activeCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                Alle
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {CATEGORY_LABELS[cat as BuyableCategory]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton */}
        {isLoading && (
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
        )}

        {/* Product groups */}
        {!isLoading && grouped.map(([category, products]) => (
          <section key={category}>
            {!activeCategory && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category as BuyableCategory] ?? category}
              </h2>
            )}
            <div className="space-y-3">
              {products.map((item) => {
                const activeVariants = item.variants.filter((v) => v.isActive)
                return (
                  <div key={item.id} className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover bg-muted flex-shrink-0"
                        />
                      ) : null}
                      <p className="font-semibold text-sm">{item.name}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {activeVariants.map((v) => {
                        const isFav = favoriteIds.has(v.id)
                        const hasVoucher = voucherMap.has(v.id)
                        return (
                          <div
                            key={v.id}
                            className="flex items-center gap-1 rounded-lg border border-border bg-background"
                          >
                            <button
                              onClick={() => openSheet(item, v.id)}
                              className="pl-3 pr-2 py-1.5 text-sm text-left"
                            >
                              {hasVoucher && <span>🎁</span>}
                              <span className="ml-1.5 font-medium">{v.name}</span>
                              <span className={hasVoucher ? "ml-1.5 text-muted-foreground line-through" : "ml-1.5 text-muted-foreground"}>{formatCents(v.price)}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFav({ variantId: v.id, isFav })
                              }}
                              className={cn(
                                'pr-2.5 py-1.5 transition-colors',
                                isFav ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500',
                              )}
                              title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                            >
                              <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Keine Produkte gefunden</p>
        )}
      </div>

      <BuySheet
        buyable={selected}
        initialVariantId={selectedVariantId}
        onClose={() => { setSelected(null); setSelectedVariantId(null) }}
      />
    </Layout>
  )
}

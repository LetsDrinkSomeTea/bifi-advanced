import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Star, Dices, Tag, Plus } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { BuySheet } from '../components/BuySheet'
import { useBuyables } from '../hooks/useBuyables'
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites'
import type { BuyableWithVariants } from '@shared/types'
import { formatCents, cn } from '../lib/utils'
import { BUYABLE_CATEGORIES, CATEGORY_LABELS, type BuyableCategory } from '@shared/schemas'
import { useVoucherMap } from '@/hooks/useProst'
import type { ActiveDiscount } from '@shared/types'

function PromoBanner({ items }: { items: BuyableWithVariants[] }) {
  const activePromosCount = useMemo(() => {
    const promoTypes = new Set<string>()
    items.forEach(item => {
      item.variants.forEach(v => {
        if (v.activeDiscount) {
          promoTypes.add(`${v.activeDiscount.type}-${v.activeDiscount.value}`)
        }
      })
    })
    return promoTypes.size
  }, [items])

  if (activePromosCount === 0) return null

  return (
    <div className="bg-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20 flex items-center gap-4 overflow-hidden relative group">
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Dices size={100} />
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
        <Tag size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-lg leading-tight uppercase tracking-tighter italic">Happy Hour & Deals!</h3>
        <p className="text-sm font-medium opacity-90 truncate">
          {activePromosCount === 1
            ? 'Aktuell sind Sonderpreise verfügbar. Schlag jetzt zu!'
            : `Es gibt verschiedene Aktionen im Shop. Schlag jetzt zu!`}
        </p>
      </div>
    </div>
  )
}

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

        {/* Promo Banner */}
        {!isLoading && items && <PromoBanner items={items} />}

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
                  <div key={item.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                    {/* Product Header */}
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-xl object-cover bg-muted flex-shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shadow-sm">
                          {CATEGORY_LABELS[item.category as BuyableCategory]?.[0] ?? '📦'}
                        </div>
                      )}
                      <h3 className="font-bold text-base">{item.name}</h3>
                    </div>

                    {/* Variants List */}
                    <div className="divide-y divide-border/50">
                      {activeVariants.map((v) => {
                        const isFav = favoriteIds.has(v.id)
                        const voucherCount = voucherMap.get(v.id) ?? 0
                        const hasVoucher = voucherCount > 0
                        const hasDiscount = v.activeDiscount != null

                        return (
                          <div
                            key={v.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group"
                          >
                            <button
                              onClick={() => openSheet(item, v.id)}
                              className="flex-1 min-w-0 flex items-center gap-3 text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm truncate">{v.name}</span>
                                  {hasVoucher && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                      {voucherCount}x 🎁
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {hasDiscount ? (
                                    <>
                                      <span className="text-sm font-bold text-orange-500">
                                        {formatCents(v.discountedPrice)}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground line-through decoration-muted-foreground/50">
                                        {formatCents(v.price)}
                                      </span>
                                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter">
                                        {v.activeDiscount!.type === 'percent' ? `-${v.activeDiscount!.value}%` : 'Aktion'}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-sm font-medium text-foreground/80">
                                      {formatCents(v.price)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFav({ variantId: v.id, isFav })
                                }}
                                className={cn(
                                  'p-2 rounded-lg transition-all active:scale-90',
                                  isFav ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/5',
                                )}
                                title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                              >
                                <Star size={16} fill={isFav ? 'currentColor' : 'none'} strokeWidth={isFav ? 1.5 : 2} />
                              </button>
                              <button
                                onClick={() => openSheet(item, v.id)}
                                className="p-2 rounded-lg text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-all"
                              >
                                <Plus size={20} />
                              </button>
                            </div>
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

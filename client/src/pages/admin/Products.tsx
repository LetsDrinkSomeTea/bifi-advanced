import { useState, useMemo } from 'react';
import { Plus, Pencil, ChevronDown, ChevronUp, Package, Search } from 'lucide-react';
import { Modal } from '../../components/Modal';
import {
  useAllBuyables,
  useCreateBuyable,
  useUpdateBuyable,
  useCreateVariant,
  useUpdateVariant,
} from '../../hooks/useAdmin';
import type { BuyableWithVariants, BuyableCategory } from '@shared/types';
import { formatCents, cn } from '../../lib/utils';
import { CATEGORY_LABELS } from '@shared/schemas';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';

// ─── Modals ───────────────────────────────────────────────────────────────────

function ProductModal({
  product,
  open,
  onClose,
}: {
  product?: BuyableWithVariants;
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<BuyableCategory>(product?.category ?? 'other');
  const [firstVariantName, setFirstVariantName] = useState('');
  const [firstVariantPrice, setFirstVariantPrice] = useState('');
  const [error, setError] = useState('');

  const { mutate: create, isPending: isCreating } = useCreateBuyable();
  const { mutate: update, isPending: isUpdating } = useUpdateBuyable();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;

    if (product) {
      update(
        { id: product.id, name: name.trim(), category },
        {
          onSuccess: onClose,
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Fehler');
          },
        },
      );
    } else {
      const priceCents = Math.round(parseFloat(firstVariantPrice) * 100);
      if (isNaN(priceCents) || priceCents < 0) {
        setError('Ungültiger Preis');
        return;
      }
      create(
        {
          name: name.trim(),
          category,
          firstVariant: { name: firstVariantName.trim() || 'Standard', price: priceCents },
        },
        {
          onSuccess: onClose,
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Fehler');
          },
        },
      );
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Produkt bearbeiten' : 'Neues Produkt'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Kategorie</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as BuyableCategory);
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(Object.entries(CATEGORY_LABELS) as [BuyableCategory, string][]).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {!product ? (
          <div className="p-3 rounded-xl border border-dashed border-border space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase">Erste Variante</p>
            <div>
              <label className="block text-sm font-medium mb-1">Varianten-Name (z.B. 0,5l)</label>
              <Input
                type="text"
                value={firstVariantName}
                onChange={(e) => {
                  setFirstVariantName(e.target.value);
                }}
                placeholder="Standard"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preis (€)</label>
              <Input
                type="number"
                step="0.01"
                value={firstVariantPrice}
                onChange={(e) => {
                  setFirstVariantPrice(e.target.value);
                }}
                required
              />
            </div>
          </div>
        ) : null}

        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          disabled={isCreating || isUpdating}
          className="w-full"
        >
          Speichern
        </Button>
      </form>
    </Modal>
  );
}

function VariantModal({
  product,
  variant,
  open,
  onClose,
}: {
  product: BuyableWithVariants;
  variant?: BuyableWithVariants['variants'][number];
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [name, setName] = useState(variant?.name ?? '');
  const [priceEuros, setPriceEuros] = useState(variant ? (variant.price / 100).toFixed(2) : '');
  const [error, setError] = useState('');

  const { mutate: create, isPending: isCreating } = useCreateVariant();
  const { mutate: update, isPending: isUpdating } = useUpdateVariant();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(priceEuros) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      setError('Ungültiger Preis');
      return;
    }

    if (variant) {
      update(
        { buyableId: product.id, variantId: variant.id, name: name.trim(), price: priceCents },
        {
          onSuccess: onClose,
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Fehler');
          },
        },
      );
    } else {
      create(
        { buyableId: product.id, name: name.trim(), price: priceCents },
        {
          onSuccess: onClose,
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Fehler');
          },
        },
      );
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={variant ? 'Variante bearbeiten' : 'Neue Variante'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name (z.B. „0,5l" oder „Kiste")</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Preis (€)</label>
          <Input
            type="number"
            step="0.01"
            value={priceEuros}
            onChange={(e) => {
              setPriceEuros(e.target.value);
            }}
            required
          />
        </div>
        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          disabled={isCreating || isUpdating}
          className="w-full"
        >
          Speichern
        </Button>
      </form>
    </Modal>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function VariantRow({
  variant,
  onEdit,
  onToggleActive,
  isUpdating,
}: {
  variant: BuyableWithVariants['variants'][number];
  onEdit: () => void;
  onToggleActive: () => void;
  isUpdating: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all bg-background/50',
        variant.isActive ? 'border-border' : 'border-dashed opacity-60',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{variant.name}</p>
        <p className="text-sm font-black tabular-nums">{formatCents(variant.price)}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          onClick={onEdit}
          variant="ghost"
          size="icon"
          title="Variante bearbeiten"
        >
          <Pencil size={16} />
        </Button>
        <ToggleSwitch
          active={variant.isActive}
          disabled={isUpdating}
          onToggle={onToggleActive}
          mode="visibility"
          variant="ghost"
          label={variant.isActive ? 'Deaktivieren' : 'Aktivieren'}
        />
      </div>
    </div>
  );
}

// ─── Main Content ──────────────────────────────────────────────────────────────

export function AdminProductsContent(): React.JSX.Element {
  const { data: products, isLoading } = useAllBuyables();
  const { mutate: updateBuyable, isPending: isUpdatingBuyable } = useUpdateBuyable();
  const { mutate: updateVariant, isPending: isUpdatingVariant } = useUpdateVariant();

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [productModal, setProductModal] = useState<{ open: boolean; product?: BuyableWithVariants }>({
    open: false,
  });
  const [variantModal, setVariantModal] = useState<{
    open: boolean;
    product?: BuyableWithVariants;
    variant?: BuyableWithVariants['variants'][number];
  }>({ open: false });

  // Stable sort order for products: only update order when products length or search changes
  const [orderState, setOrderState] = useState<{
    order: string[];
    search: string;
    count: number;
  }>({
    order: [],
    search: '',
    count: 0,
  });

  // Stable sort order for variants: map of buyableId -> variantId order
  const [stableVariantOrders, setStableVariantOrders] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    if (!products) return [];
    const s = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.category && CATEGORY_LABELS[p.category].toLowerCase().includes(s)),
    );
  }, [products, search]);

  // Derive stable order during render if search or count changed
  if (products && (search !== orderState.search || filtered.length !== orderState.count || (orderState.order.length === 0 && filtered.length > 0))) {
    const newOrder = [...filtered]
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((p) => p.id);
    
    setOrderState({
      order: newOrder,
      search,
      count: filtered.length,
    });
  }

  const sortedProducts = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const idxA = orderState.order.indexOf(a.id);
      const idxB = orderState.order.indexOf(b.id);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [filtered, orderState.order]);

  const getSortedVariants = (buyableId: string, variants: BuyableWithVariants['variants']): BuyableWithVariants['variants'] => {
    const existingOrder = stableVariantOrders[buyableId];

    // If we have an order and the count hasn't changed, use it
    if (existingOrder?.length === variants.length) {
      return [...variants].sort((a, b) => {
        const idxA = existingOrder.indexOf(a.id);
        const idxB = existingOrder.indexOf(b.id);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    // Otherwise (new product or count changed), calculate new stable order
    const newOrder = [...variants]
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((v) => v.id);

    setStableVariantOrders(prev => ({ ...prev, [buyableId]: newOrder }));

    return [...variants].sort((a, b) => {
      const idxA = newOrder.indexOf(a.id);
      const idxB = newOrder.indexOf(b.id);
      return idxA - idxB;
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Produkte & Preise
          </h2>
          <Button
            onClick={() => {
              setProductModal({ open: true });
            }}
            size="sm"
            className="h-8 gap-1.5"
          >
            <Plus size={14} /> Neu
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Suchen nach Name oder Kategorie…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedProducts.map((p) => (
            <div
              key={p.id}
              className={cn(
                'rounded-2xl border transition-all overflow-hidden',
                expandedId === p.id ? 'border-primary bg-primary/5' : 'border-border bg-card',
                !p.isActive && expandedId !== p.id && 'opacity-60 grayscale-[0.5]',
              )}
            >
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  setExpandedId(expandedId === p.id ? null : p.id);
                }}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  p.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold truncate", !p.isActive && "text-muted-foreground")}>
                    {p.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {p.category ? CATEGORY_LABELS[p.category] : 'Keine Kategorie'} • {p.variants.length} Varianten
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductModal({ open: true, product: p });
                    }}

                    variant="ghost"
                    size="icon"
                    title="Variante bearbeiten"
                  >
                    <Pencil size={16} />
                  </Button>
                  <ToggleSwitch
                    active={p.isActive}
                    disabled={isUpdatingBuyable}
                    onToggle={() => {
                      updateBuyable({ id: p.id, isActive: !p.isActive });
                    }}
                    mode="visibility"
                    variant="ghost"
                    label={p.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  />
                  <div className="p-1 text-muted-foreground">
                    {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {expandedId === p.id ? (
                <div className="px-4 pb-4 pt-2 border-t border-primary/10 space-y-4">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Varianten
                    </p>
                    <div className="space-y-1.5">
                      {getSortedVariants(p.id, p.variants).map((v) => (
                        <VariantRow
                          key={v.id}
                          variant={v}
                          isUpdating={isUpdatingVariant}
                          onEdit={() => {
                            setVariantModal({ open: true, product: p, variant: v });
                          }}
                          onToggleActive={() => {
                            updateVariant({ buyableId: p.id, variantId: v.id, isActive: !v.isActive });
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setVariantModal({ open: true, product: p });
                      }}
                      className="w-full py-2 rounded-xl border border-dashed border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Variante hinzufügen
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {sortedProducts.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p>Keine Produkte gefunden.</p>
            </div>
          )}
        </div>
      )}

      {productModal.open ? (
        <ProductModal
          open={productModal.open}
          product={productModal.product}
          onClose={() => {
            setProductModal({ open: false });
          }}
        />
      ) : null}
      {variantModal.open && variantModal.product ? (
        <VariantModal
          open={variantModal.open}
          product={variantModal.product}
          variant={variantModal.variant}
          onClose={() => {
            setVariantModal({ open: false });
          }}
        />
      ) : null}
    </div>
  );
}

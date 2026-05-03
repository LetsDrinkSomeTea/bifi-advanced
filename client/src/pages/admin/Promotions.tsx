import { useState, useMemo } from 'react';
import { Plus, Trash2, Tag, Package, Search, Pencil, Calendar } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useAllBuyables } from '../../hooks/useAdmin';
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  type Promotion,
} from '../../hooks/usePromotions';
import { formatCents, formatTimestamp, cn, toLocalISO, fromLocalISO } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { useDialog } from '../../hooks/useDialog';

// ─── Promotion Modal ──────────────────────────────────────────────────────────

function PromotionModal({
  open,
  onClose,
  promotion,
}: {
  open: boolean;
  onClose: () => void;
  promotion?: Promotion | null;
}): React.JSX.Element {
  const { mutate: create, isPending: creating } = useCreatePromotion();
  const { mutate: update, isPending: updating } = useUpdatePromotion();
  const { data: buyables } = useAllBuyables();

  const [name, setName] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [targetBuyableId, setTargetBuyableId] = useState('');
  const [targetVariantId, setTargetVariantId] = useState('');
  const [quantityLimit, setQuantityLimit] = useState('');
  const [error, setError] = useState('');

  // Sync state when promotion or open state changes
  const [lastSyncId, setLastSyncId] = useState<string | null>(null);
  const syncId = open ? (promotion?.id ?? 'new') : null;

  if (syncId !== lastSyncId) {
    setLastSyncId(syncId);
    if (open) {
      setName(promotion?.name ?? '');
      setType(promotion?.discountFixedCents != null ? 'fixed' : 'percent');
      setValue(
        promotion?.discountFixedCents != null
          ? (promotion.discountFixedCents / 100).toString()
          : (promotion?.discountPercent ?? '0').toString(),
      );
      setStartTime(toLocalISO(promotion?.startTime));
      setEndTime(toLocalISO(promotion?.endTime));
      setTargetBuyableId(promotion?.appliesTo?.buyableId ?? '');
      setTargetVariantId(promotion?.appliesTo?.variantId ?? '');
      setQuantityLimit(promotion?.quantityLimit?.toString() ?? '');
      setError('');
    }
  }

  const selectedBuyable = buyables?.find((b) => b.id === targetBuyableId);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    const numericValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numericValue)) {
      setError('Ungültiger Wert');
      return;
    }

    const parsedQty = quantityLimit.trim() ? parseInt(quantityLimit, 10) : null;
    if (parsedQty !== null && (isNaN(parsedQty) || parsedQty < 1)) {
      setError('Kontingent muss eine positive Zahl sein');
      return;
    }

    const body = {
      name: name.trim(),
      discountPercent: type === 'percent' ? Math.round(numericValue) : null,
      discountFixedCents: type === 'fixed' ? Math.round(numericValue * 100) : null,
      startTime: fromLocalISO(startTime),
      endTime: fromLocalISO(endTime),
      appliesTo: targetBuyableId
        ? {
          buyableId: targetBuyableId,
          variantId: targetVariantId || undefined,
        }
        : null,
      isActive: promotion?.isActive ?? true,
      quantityLimit: parsedQty,
    };

    if (promotion) {
      update(
        { id: promotion.id, ...body },
        {
          onSuccess: onClose,
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Fehler');
          },
        },
      );
    } else {
      create(body, {
        onSuccess: onClose,
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Fehler');
        },
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={promotion ? 'Rabatt bearbeiten' : 'Neuer Rabatt'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name (z.B. "Happy Hour")</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder="Happy Hour"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Typ</label>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'percent' | 'fixed');
              }}
            >
              <option value="percent">Prozent (%)</option>
              <option value="fixed">Fixpreis (€)</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {type === 'percent' ? 'Rabatt (%)' : 'Neuer Preis (€)'}
            </label>
            <Input
              type="number"
              step={type === 'percent' ? '1' : '0.01'}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start (optional)</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ende (optional)</label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gilt für...</label>
          <Select
            value={targetBuyableId}
            onChange={(e) => {
              setTargetBuyableId(e.target.value);
              setTargetVariantId('');
            }}
          >
            <option value="">Alle Produkte</option>
            {buyables?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        {targetBuyableId !== '' &&
          selectedBuyable !== undefined &&
          selectedBuyable.variants.length > 0 ? (
          <div>
            <label className="block text-sm font-medium mb-1">Variante (optional)</label>
            <Select
              value={targetVariantId}
              onChange={(e) => {
                setTargetVariantId(e.target.value);
              }}
            >
              <option value="">Alle Varianten von {selectedBuyable.name}</option>
              {selectedBuyable.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({formatCents(v.price)})
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium mb-1">Kontingent (optional)</label>
          <Input
            type="number"
            min="1"
            step="1"
            value={quantityLimit}
            onChange={(e) => {
              setQuantityLimit(e.target.value);
            }}
            placeholder="z.B. 20 (leer = unbegrenzt)"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Gilt global für die ersten N Einheiten.
          </p>
        </div>

        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="submit"
          disabled={creating || updating}
          className="w-full"
        >
          {promotion ? 'Aktualisieren' : 'Rabatt erstellen'}
        </Button>
      </form>
    </Modal>
  );
}

// ─── Main Content ──────────────────────────────────────────────────────────────

export function AdminPromotionsContent(): React.JSX.Element {
  const { data: promotions, isLoading } = usePromotions();
  const { data: buyables } = useAllBuyables();
  const { mutate: updatePromo, isPending: isUpdating } = useUpdatePromotion();
  const { mutate: deletePromo } = useDeletePromotion();
  const dialog = useDialog();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  // Stable sort order: only update order when products length or search changes
  const [orderState, setOrderState] = useState<{
    order: string[];
    search: string;
    count: number;
  }>({
    order: [],
    search: '',
    count: 0,
  });

  const filtered = useMemo(() => {
    if (!promotions) return [];
    const s = search.toLowerCase().trim();
    return promotions.filter((p) => p.name.toLowerCase().includes(s));
  }, [promotions, search]);

  // Derive stable order during render if search or count changed
  if (promotions && (search !== orderState.search || filtered.length !== orderState.count || (orderState.order.length === 0 && filtered.length > 0))) {
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

  const filteredPromotions = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const idxA = orderState.order.indexOf(a.id);
      const idxB = orderState.order.indexOf(b.id);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [filtered, orderState.order]);

  const getScopeLabel = (p: Promotion): string => {
    if (!p.appliesTo) return 'Alle Produkte';
    const buyable = buyables?.find((b) => b.id === p.appliesTo?.buyableId);
    if (!buyable) return 'Unbekanntes Produkt';
    if (!p.appliesTo.variantId) return buyable.name;
    const variant = buyable.variants.find((v) => v.id === p.appliesTo?.variantId);
    return `${buyable.name} (${variant?.name ?? 'Unbekannte Variante'})`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Aktionen & Rabatte
          </h2>
          <Button
            onClick={() => {
              setSelectedPromo(null);
              setCreateOpen(true);
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
            placeholder="Suchen nach Aktionsname…"
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
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <Tag className="mx-auto mb-2 opacity-20" size={32} />
          <p className="text-sm">Keine Aktionen gefunden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPromotions.map((p) => (
            <div
              key={p.id}
              className={cn(
                'rounded-2xl border border-border bg-card p-4 space-y-3 transition-all',
                !p.isActive && 'opacity-60 grayscale-[0.5]',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    p.isActive ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
                  )}>
                    <Tag size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Seit {formatTimestamp(p.createdAt)}
                      </p>
                      {p.endTime ? <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold uppercase">
                        <Calendar size={10} />
                        Bis {formatTimestamp(p.endTime)}
                      </div> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ToggleSwitch
                    active={p.isActive}
                    disabled={isUpdating}
                    onToggle={() => {
                      updatePromo({ id: p.id, isActive: !p.isActive });
                    }}
                    mode="playback"
                    variant="ghost"
                    label={p.isActive ? 'Pausieren' : 'Starten'}
                  />
                  <Button
                    onClick={() => {
                      setSelectedPromo(p);
                      setCreateOpen(true);
                    }}
                    variant='ghost'
                    size='icon'
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    onClick={() => {
                      void (async () => {
                        if (await dialog.confirmDelete('Aktion beenden', `Soll die Aktion "${p.name}" wirklich gelöscht werden?`)) {
                          deletePromo(p.id);
                        }
                      })();
                    }}
                    variant='ghost_destructive'
                    size='icon'
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
                    Anwendbar auf
                  </p>
                  <p className="text-xs font-semibold truncate">
                    {getScopeLabel(p)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
                    Rabatt
                  </p>
                  <p className="text-sm font-black tabular-nums text-primary">
                    {p.discountFixedCents != null
                      ? `Fixpreis ${formatCents(p.discountFixedCents)}`
                      : `-${p.discountPercent}%`}
                  </p>
                </div>
              </div>

              {p.quantityLimit !== null ? (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Package size={12} />
                    <span>
                      Verfügbar: <b>{Math.max(0, p.quantityLimit - p.quantityUsed)}</b> von {p.quantityLimit}
                    </span>
                  </div>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (Math.max(0, p.quantityLimit - p.quantityUsed) / p.quantityLimit) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <PromotionModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setSelectedPromo(null);
        }}
        promotion={selectedPromo}
      />
    </div>
  );
}

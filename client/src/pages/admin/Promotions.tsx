import { useState } from 'react';
import { Plus, Trash2, Play, Square, Edit2, Calendar } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Modal } from '../../components/Modal';
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  type Promotion,
} from '../../hooks/usePromotions';
import { useAllBuyables } from '../../hooks/useAdmin';
import { formatCents, cn, toLocalISO, fromLocalISO, APP_TZ } from '../../lib/utils';

import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

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
  const [value, setValue] = useState('0');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [targetBuyableId, setTargetBuyableId] = useState('');
  const [targetVariantId, setTargetVariantId] = useState('');
  const [quantityLimit, setQuantityLimit] = useState('');
  const [error, setError] = useState('');

  // Sync state when promotion or open state changes without using useEffect for internal resets
  const [lastSyncId, setLastSyncId] = useState<string | null>(null);
  const syncId = open ? (promotion?.id ?? 'new') : null;

  if (syncId !== lastSyncId) {
    setLastSyncId(syncId);
    if (open) {
      setName(promotion?.name ?? '');
      setType(
        promotion?.discountFixedCents !== null && promotion?.discountFixedCents !== undefined
          ? 'fixed'
          : 'percent',
      );
      setValue(
        promotion?.discountFixedCents !== null && promotion?.discountFixedCents !== undefined
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

    interface PromotionPayload {
      name: string;
      discountPercent: number | null;
      discountFixedCents: number | null;
      startTime: string | null;
      endTime: string | null;
      appliesTo: { buyableId: string; variantId?: string } | null;
      isActive: boolean;
      quantityLimit: number | null;
    }

    const body: PromotionPayload = {
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

  const selectedBuyable = buyables?.find((b) => b.id === targetBuyableId);

  return (
    <Modal open={open} onClose={onClose} title={promotion ? 'Rabatt bearbeiten' : 'Neuer Rabatt'}>
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
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Typ</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'percent' | 'fixed');
              }}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
            >
              <option value="percent">Prozent (%)</option>
              <option value="fixed">Fixpreis (€)</option>
            </select>
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
          <label className="block text-sm font-medium mb-1">Ziel-Produkt (optional)</label>
          <select
            value={targetBuyableId}
            onChange={(e) => {
              setTargetBuyableId(e.target.value);
              setTargetVariantId('');
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
          >
            <option value="">Alle Produkte</option>
            {buyables?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {targetBuyableId !== '' &&
        selectedBuyable !== undefined &&
        selectedBuyable.variants.length > 0 ? (
          <div>
            <label className="block text-sm font-medium mb-1">Variante (optional)</label>
            <select
              value={targetVariantId}
              onChange={(e) => {
                setTargetVariantId(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
            >
              <option value="">Alle Varianten von {selectedBuyable.name}</option>
              {selectedBuyable.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
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
            Wenn gesetzt, gilt der Rabatt nur für die ersten N Einheiten global. Danach wird die
            Aktion automatisch deaktiviert.
          </p>
        </div>

        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={creating || updating} className="w-full">
          {promotion !== null && promotion !== undefined ? 'Aktualisieren' : 'Rabatt erstellen'}
        </Button>
      </form>
    </Modal>
  );
}

import { useDialog } from '../../hooks/useDialog';

export function AdminPromotions(): React.JSX.Element {
  const { data: promotions, isLoading } = usePromotions();
  const { mutate: update } = useUpdatePromotion();
  const { mutate: remove } = useDeletePromotion();
  const { data: buyables } = useAllBuyables();
  const dialog = useDialog();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  const handleEdit = (p: Promotion): void => {
    setSelectedPromo(p);
    setModalOpen(true);
  };

  const handleToggle = (p: Promotion): void => {
    update({ id: p.id, isActive: !p.isActive });
  };

  const getTargetLabel = (p: Promotion): string => {
    if (!p.appliesTo) return 'Alle Produkte';
    const b = buyables?.find((b) => b.id === p.appliesTo?.buyableId);
    if (!b) return 'Unbekanntes Produkt';
    if (!p.appliesTo.variantId) return b.name;
    const v = b.variants.find((v) => v.id === p.appliesTo?.variantId);
    return `${b.name} (${v?.name ?? '?'})`;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Rabatte & Aktionen</h1>
          <Button
            onClick={() => {
              setSelectedPromo(null);
              setModalOpen(true);
            }}
            size="sm"
          >
            <Plus size={16} className="mr-1.5" />
            Neu
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {promotions?.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'rounded-2xl border border-border p-4 bg-card transition-opacity',
                  !p.isActive && 'opacity-60',
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold truncate">{p.name}</h3>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider',
                          p.discountFixedCents != null
                            ? 'bg-orange-500/10 text-orange-500'
                            : 'bg-green-500/10 text-green-500',
                        )}
                      >
                        {p.discountFixedCents != null
                          ? `${formatCents(p.discountFixedCents)} Fix`
                          : `-${p.discountPercent}%`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Target:{' '}
                      <span className="text-foreground font-medium">{getTargetLabel(p)}</span>
                    </p>
                    {p.quantityLimit != null && (
                      <div className="flex items-center gap-1.5 text-[10px] mt-1">
                        <span
                          className={cn(
                            'font-semibold',
                            p.quantityUsed >= p.quantityLimit
                              ? 'text-destructive'
                              : 'text-blue-500',
                          )}
                        >
                          {p.quantityUsed >= p.quantityLimit
                            ? 'Kontingent aufgebraucht'
                            : `Kontingent: ${p.quantityLimit - p.quantityUsed} von ${p.quantityLimit} übrig`}
                        </span>
                      </div>
                    )}
                    {p.startTime || p.endTime ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar size={10} />
                        <span>
                          {p.startTime
                            ? new Date(p.startTime).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: APP_TZ,
                              })
                            : '∞'}
                          {' – '}
                          {p.endTime
                            ? new Date(p.endTime).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: APP_TZ,
                              })
                            : '∞'}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        handleToggle(p);
                      }}
                      className={cn(
                        p.isActive
                          ? 'text-orange-500 hover:text-orange-500'
                          : 'text-green-500 hover:text-green-500',
                      )}
                      title={p.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {p.isActive ? <Square size={16} /> : <Play size={16} />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        handleEdit(p);
                      }}
                      title="Bearbeiten"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        void (async () => {
                          if (
                            await dialog.confirmDelete(
                              'Löschen?',
                              'Soll die Aktion wirklich gelöscht werden?',
                            )
                          )
                            remove(p.id);
                        })();
                      }}
                      className="hover:text-destructive"
                      title="Löschen"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {(promotions?.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-2xl">
                Keine Rabatte konfiguriert
              </div>
            ) : null}
          </div>
        )}
      </div>

      <PromotionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPromo(null);
        }}
        promotion={selectedPromo}
      />
    </AdminLayout>
  );
}

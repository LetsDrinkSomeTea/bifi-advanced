import { useState, useEffect } from 'react';
import { X, Users2, Dices } from 'lucide-react';
import type { BuyableWithVariants } from '@shared/types';
import { usePurchase } from '../hooks/useTransactions';
import { useVoucherMap } from '../hooks/useProst';
import { useGroups } from '../hooks/useGroups';
import { useJackpotEligibility } from '../hooks/useJackpot';
import { cn, formatCents } from '../lib/utils';
import { JackpotModal } from './JackpotModal';
import { Button } from './ui/Button';
import { NumericCounter } from './ui/NumericCounter';

interface Props {
  buyable: BuyableWithVariants | null;
  initialVariantId?: string | null;
  onClose: () => void;
}

export function BuySheet({ buyable, initialVariantId, onClose }: Props): React.JSX.Element | null {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [jackpotOpen, setJackpotOpen] = useState(false);
  const [show, setShow] = useState(false);

  const { mutate, isPending } = usePurchase();
  const { data: groups } = useGroups();
  const { data: jackpotEligibility } = useJackpotEligibility();
  const voucherMap = useVoucherMap();

  const variants = buyable?.variants.filter((v) => v.isActive) ?? [];
  const isSingleVariant = variants.length === 1;

  // Sync state when buyable changes without using useEffect for internal resets
  const [lastBuyableId, setLastBuyableId] = useState<string | null>(null);

  const currentBuyableId = buyable?.id ?? null;
  if (currentBuyableId !== lastBuyableId) {
    setLastBuyableId(currentBuyableId);
    if (buyable) {
      const firstVariantId = variants[0]?.id ?? null;
      setVariantId(isSingleVariant ? firstVariantId : (initialVariantId ?? null));
      setQuantity(1);
      setFeedback(null);
      setGroupId(null);
      setJackpotOpen(false);
    }
  }

  useEffect(() => {
    if (!buyable) return;
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, [buyable, buyable?.id]);

  const handleClose = (): void => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  if (!buyable) return null;

  const selectedVariant = variants.find((v) => v.id === variantId);
  const originalUnitPrice = selectedVariant?.price ?? 0;
  const discountedUnitPrice = selectedVariant?.discountedPrice ?? originalUnitPrice;
  const isDiscounted = discountedUnitPrice < originalUnitPrice;

  const quantityRemaining = selectedVariant?.activeDiscount?.quantityRemaining ?? null;
  const discountedQty =
    quantityRemaining !== null ? Math.min(quantity, Math.max(0, quantityRemaining)) : quantity;
  const totalPrice =
    discountedUnitPrice * discountedQty + originalUnitPrice * (quantity - discountedQty);
  const canBuy = !!variantId;

  const voucherCount = !groupId && variantId ? (voucherMap.get(variantId) ?? 0) : 0;
  const vouchersApplied = Math.min(voucherCount, quantity);
  const hasVoucher = vouchersApplied > 0;
  const effectiveTotal = totalPrice - discountedUnitPrice * vouchersApplied;

  const selectedGroup = groups?.find((g) => g.id === groupId);
  const memberCount = selectedGroup?.memberCount ?? 1;
  const pricePerPerson =
    groupId && memberCount > 1 ? Math.ceil(effectiveTotal / memberCount) : effectiveTotal;

  const showJackpot =
    (jackpotEligibility?.eligible ?? false) &&
    !groupId &&
    quantity === 1 &&
    discountedUnitPrice > 0 &&
    !hasVoucher;

  const handleBuy = (): void => {
    if (!variantId) return;
    mutate(
      { items: [{ buyableId: buyable.id, variantId, quantity }], groupId: groupId ?? undefined },
      {
        onSuccess: (data) => {
          setFeedback(data.voucherRedeemed ? 'Gutschein eingelöst! 🎁' : 'Gekauft! ✓');
          setTimeout(handleClose, 1000);
        },
        onError: (err) => {
          setFeedback(err instanceof Error ? err.message : 'Fehler beim Kauf');
        },
      },
    );
  };

  const handleJackpot = (): void => {
    setJackpotOpen(true);
  };

  const priceLabel =
    groupId && memberCount > 1
      ? `${formatCents(pricePerPerson)} / Person · ${memberCount} Personen`
      : formatCents(effectiveTotal);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          show ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleClose}
      />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out',
          show ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-0 right-0 top-3" />
          <h2 className="text-lg font-semibold">{buyable.name}</h2>
          <button
            onClick={handleClose}
            title="Schließen"
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Variant Selection (only if multiple) */}
          {!isSingleVariant && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Variante wählen
              </span>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <Button
                    key={v.id}
                    onClick={() => {
                      setVariantId(v.id);
                    }}
                    variant={variantId === v.id ? 'default' : 'outline'}
                    className="relative"
                  >
                    {v.name}
                    {v.activeDiscount ? (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-bl-full" />
                    ) : null}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Details */}
          {selectedVariant ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Einzelpreis
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black">{formatCents(discountedUnitPrice)}</span>
                    {isDiscounted ? (
                      <span className="text-sm text-muted-foreground line-through decoration-orange-500/40">
                        {formatCents(originalUnitPrice)}
                      </span>
                    ) : null}
                  </div>
                </div>
                {selectedVariant.activeDiscount ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-tighter shadow-sm shadow-orange-500/20">
                      {selectedVariant.activeDiscount.type === 'percent'
                        ? `-${selectedVariant.activeDiscount.value}% Rabatt`
                        : 'Sonderpreis'}
                    </span>
                    {selectedVariant.activeDiscount.quantityRemaining !== null && (
                      <span className="text-[10px] font-semibold text-blue-500">
                        noch {selectedVariant.activeDiscount.quantityRemaining}x verfügbar
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Vouchers Info */}
              {voucherCount > 0 && (
                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-lg">
                      🎁
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        Gutscheine verfügbar
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {voucherCount} Stück in deinem Inventar
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {vouchersApplied}x genutzt
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {/* Quantity Selection */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-lg font-bold">Anzahl</p>
            </div>
            <NumericCounter value={quantity} onChange={setQuantity} />
          </div>

          {/* Group split */}
          {groups && groups.length > 0 ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Users2 size={14} className="text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gruppenzahlung
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setGroupId(null);
                  }}
                  variant={!groupId ? 'default' : 'outline'}
                  size="sm"
                >
                  Nur ich
                </Button>
                {groups.map((g) => (
                  <Button
                    key={g.id}
                    onClick={() => {
                      setGroupId(g.id === groupId ? null : g.id);
                    }}
                    variant={groupId === g.id ? 'default' : 'outline'}
                    size="sm"
                  >
                    {g.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Feedback */}
          {feedback ? (
            <div
              className={cn(
                'p-3 rounded-xl text-sm font-bold text-center animate-in fade-in slide-in-from-bottom-2',
                feedback.includes('✓') || feedback.includes('🎁')
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {feedback}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex pt-2">
            <div
              style={{
                width: showJackpot ? '50%' : '0px',
                paddingRight: showJackpot ? '12px' : '0px',
                overflow: 'hidden',
                flexShrink: 0,
                transition: 'width 300ms ease, padding-right 300ms ease',
              }}
            >
              <Button
                onClick={handleJackpot}
                variant="yellow_dashed"
                className="w-full h-16 active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <Dices size={15} />
                  <span>Jackpot</span>
                </div>
                <span className="text-[10px] font-semibold opacity-70 leading-tight">
                  0 € – {formatCents(2 * discountedUnitPrice)}
                </span>
              </Button>
            </div>

            <Button
              disabled={!canBuy || isPending}
              onClick={handleBuy}
              className={cn(
                'flex-1 min-w-0 h-16 rounded-xl font-black transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-0.5 px-3',
                'disabled:opacity-60',
              )}
            >
              {isPending ? (
                <span className="text-base">Wird gebucht…</span>
              ) : effectiveTotal === 0 ? (
                <span className="text-base">🎁 Wurde dir ausgegeben</span>
              ) : (
                <>
                  <span className="text-base leading-none">Kaufen</span>
                  <span className="text-xs font-semibold opacity-80 leading-tight w-full text-center truncate">
                    {priceLabel}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {variantId && selectedVariant ? (
        <JackpotModal
          open={jackpotOpen}
          onClose={() => {
            setJackpotOpen(false);
            handleClose();
          }}
          buyableId={buyable.id}
          variantId={variantId}
          basePrice={discountedUnitPrice}
          productName={buyable.name}
          variantName={selectedVariant.name}
        />
      ) : null}
    </>
  );
}

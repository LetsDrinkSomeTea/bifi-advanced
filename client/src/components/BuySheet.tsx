import { useEffect, useState } from 'react';
import { Minus, Plus, X, Users2, Dices } from 'lucide-react';
import type { BuyableWithVariants } from '@shared/types';
import { usePurchase } from '../hooks/useTransactions';
import { useVoucherMap } from '../hooks/useProst';
import { useGroups } from '../hooks/useGroups';
import { useJackpotEligibility } from '../hooks/useJackpot';
import { cn, formatCents } from '../lib/utils';
import { JackpotModal } from './JackpotModal';

interface Props {
  buyable: BuyableWithVariants | null;
  initialVariantId?: string | null;
  onClose: () => void;
}

export function BuySheet({ buyable, initialVariantId, onClose }: Props) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [jackpotOpen, setJackpotOpen] = useState(false);

  const { mutate, isPending } = usePurchase();
  const { data: groups } = useGroups();
  const { data: jackpotEligibility } = useJackpotEligibility();
  const voucherMap = useVoucherMap();

  const open = buyable !== null;
  const variants = buyable?.variants.filter((v) => v.isActive) ?? [];
  const isSingleVariant = variants.length === 1;
  const autoSelected = isSingleVariant || !!initialVariantId;

  useEffect(() => {
    if (buyable) {
      if (isSingleVariant) {
        setVariantId(variants[0]!.id);
      } else if (initialVariantId) {
        setVariantId(initialVariantId);
      } else {
        setVariantId(null);
      }
      setQuantity(1);
      setFeedback(null);
      setGroupId(null);
      setJackpotOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyable?.id, initialVariantId]);

  if (!open || !buyable) return null;

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
    jackpotEligibility?.eligible &&
    !groupId &&
    quantity === 1 &&
    discountedUnitPrice > 0 &&
    !hasVoucher;

  const handleBuy = () => {
    if (!variantId) return;
    mutate(
      { items: [{ buyableId: buyable.id, variantId, quantity }], groupId: groupId ?? undefined },
      {
        onSuccess: (data) => {
          setFeedback(data?.voucherRedeemed ? 'Gutschein eingelöst! 🎁' : 'Gekauft! ✓');
          setTimeout(onClose, 1000);
        },
        onError: (err) => {
          setFeedback(err instanceof Error ? err.message : 'Fehler beim Kauf');
        },
      },
    );
  };

  const handleJackpot = () => {
    setJackpotOpen(true);
  };

  const priceLabel =
    groupId && memberCount > 1
      ? `${formatCents(pricePerPerson)} / Person · ${memberCount} Personen`
      : formatCents(effectiveTotal);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-0 right-0 top-3" />
          <h2 className="text-lg font-semibold">{buyable.name}</h2>
          <button
            onClick={onClose}
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
                  <button
                    key={v.id}
                    onClick={() => { setVariantId(v.id); }}
                    className={cn(
                      'px-4 py-2 rounded-xl border text-sm transition-all relative overflow-hidden',
                      variantId === v.id
                        ? 'bg-primary border-primary text-primary-foreground font-bold shadow-md shadow-primary/20'
                        : 'bg-background border-border text-muted-foreground hover:border-muted-foreground',
                    )}
                  >
                    {v.name}
                    {v.activeDiscount && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-bl-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Details */}
          {selectedVariant && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Einzelpreis
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black">{formatCents(discountedUnitPrice)}</span>
                    {isDiscounted && (
                      <span className="text-sm text-muted-foreground line-through decoration-orange-500/40">
                        {formatCents(originalUnitPrice)}
                      </span>
                    )}
                  </div>
                </div>
                {selectedVariant.activeDiscount && (
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
                )}
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
          )}

          {/* Quantity Selection */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-bold">Anzahl</p>
              <p className="text-[10px] text-muted-foreground">Wie viele möchtest du?</p>
            </div>
            <div className="flex items-center gap-4 bg-muted/50 p-1 rounded-2xl border border-border">
              <button
                onClick={() => { setQuantity((q) => Math.max(1, q - 1)); }}
                className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-accent transition-all active:scale-90 shadow-sm"
              >
                <Minus size={18} />
              </button>
              <span className="w-8 text-center font-black text-lg">{quantity}</span>
              <button
                onClick={() => { setQuantity((q) => Math.min(99, q + 1)); }}
                className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-accent transition-all active:scale-90 shadow-sm"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Group split */}
          {groups && groups.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Users2 size={14} className="text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gruppenzahlung
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setGroupId(null); }}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm',
                    !groupId
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background border-border text-muted-foreground hover:border-muted-foreground',
                  )}
                >
                  Nur ich
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setGroupId(g.id === groupId ? null : g.id); }}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm',
                      groupId === g.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:border-muted-foreground',
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              {groupId && memberCount > 1 && (
                <p className="text-[10px] font-medium text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                  Fair-Share: {formatCents(pricePerPerson)} pro Person ({memberCount} Mitglieder)
                </p>
              )}
            </div>
          )}

          {/* Feedback */}
          {feedback && (
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
          )}

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
              <button
                onClick={handleJackpot}
                className="w-full h-16 rounded-2xl border-2 border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 font-black flex flex-col items-center justify-center gap-0.5 hover:bg-amber-500/5 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <Dices size={15} />
                  <span>Jackpot</span>
                </div>
                <span className="text-[10px] font-semibold opacity-70 leading-tight">
                  0 € – {formatCents(2 * discountedUnitPrice)}
                </span>
              </button>
            </div>

            <button
              disabled={!canBuy || isPending}
              onClick={handleBuy}
              className={cn(
                'flex-1 min-w-0 h-16 rounded-xl font-black transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-0.5 px-3',
                canBuy
                  ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/30'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
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
            </button>
          </div>
        </div>
      </div>

      {variantId && selectedVariant && (
        <JackpotModal
          open={jackpotOpen}
          onClose={() => {
            setJackpotOpen(false);
            onClose();
          }}
          buyableId={buyable.id}
          variantId={variantId}
          basePrice={discountedUnitPrice}
          productName={buyable.name}
          variantName={selectedVariant.name}
        />
      )}
    </>
  );
}

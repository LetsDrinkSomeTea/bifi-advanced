import { useEffect, useState } from 'react'
import { Minus, Plus, X, Users2 } from 'lucide-react'
import type { BuyableWithVariants } from '@shared/types'
import { usePurchase } from '../hooks/useTransactions'
import { useVoucherSet } from '../hooks/useProst'
import { useGroups } from '../hooks/useGroups'
import { cn, formatCents } from '../lib/utils'

interface Props {
  buyable: BuyableWithVariants | null
  initialVariantId?: string | null
  onClose: () => void
}

export function BuySheet({ buyable, initialVariantId, onClose }: Props) {
  const [variantId, setVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)
  const { mutate, isPending } = usePurchase()
  const { data: groups } = useGroups()
  const voucherSet = useVoucherSet()

  const open = buyable !== null
  const variants = buyable?.variants.filter((v) => v.isActive) ?? []
  const isSingleVariant = variants.length === 1
  const autoSelected = isSingleVariant || !!initialVariantId

  useEffect(() => {
    if (buyable) {
      if (isSingleVariant) {
        setVariantId(variants[0]!.id)
      } else if (initialVariantId) {
        setVariantId(initialVariantId)
      } else {
        setVariantId(null)
      }
      setQuantity(1)
      setFeedback(null)
      setGroupId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyable?.id, initialVariantId])

  if (!open || !buyable) return null

  const selectedVariant = variants.find((v) => v.id === variantId)
  const unitPrice = selectedVariant?.price ?? 0
  const totalPrice = unitPrice * quantity
  const canBuy = !!variantId
  const hasVoucher = !!variantId && voucherSet.has(variantId) && !groupId

  const selectedGroup = groups?.find((g) => g.id === groupId)
  const memberCount = selectedGroup?.memberCount ?? 1
  const pricePerPerson = groupId && memberCount > 1 ? Math.ceil(totalPrice / memberCount) : totalPrice

  const handleBuy = () => {
    if (!variantId) return
    mutate(
      { items: [{ buyableId: buyable.id, variantId, quantity }], groupId: groupId ?? undefined },
      {
        onSuccess: (data) => {
          setFeedback(data?.voucherRedeemed ? 'Ausgegeben eingelöst! 🎁' : 'Gekauft! ✓')
          setTimeout(onClose, 1000)
        },
        onError: (err) => {
          setFeedback(err instanceof Error ? err.message : 'Fehler beim Kauf')
        },
      },
    )
  }

  const priceLabel = groupId && memberCount > 1
    ? `${formatCents(pricePerPerson)} / Person · ${memberCount} Personen`
    : formatCents(totalPrice)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-0 right-0 top-3" />
          <h2 className="text-lg font-semibold">{buyable.name}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Auto-selected variant label */}
          {autoSelected && selectedVariant && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Variante:</span>
              <span className="text-sm font-medium px-2.5 py-0.5 bg-muted rounded-full">
                {selectedVariant.name}
              </span>
              {voucherSet.has(selectedVariant.id) && (
                <span className="text-sm font-medium px-2.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full">
                  🎁
                </span>
              )}
            </div>
          )}

          {/* Variant picker */}
          {!autoSelected && variants.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Variante wählen</p>
              <div className="grid grid-cols-2 gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      'py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors text-left',
                      variantId === v.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    <span className="block">{v.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs opacity-75">{formatCents(v.price)}</span>
                      {voucherSet.has(v.id) && <span className="text-xs">🎁</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Menge</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Group split */}
          {groups && groups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users2 size={15} className="text-muted-foreground" />
                <span className="text-sm font-medium">Mit Gruppe teilen</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setGroupId(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                    !groupId ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  Nur ich
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGroupId(g.id === groupId ? null : g.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                      groupId === g.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {g.name} ({g.memberCount})
                  </button>
                ))}
              </div>
              {groupId && memberCount > 1 && (
                <p className="text-xs text-muted-foreground">
                  Kosten werden auf {memberCount} Personen aufgeteilt
                </p>
              )}
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <p className={cn('text-sm text-center', feedback.includes('✓') ? 'text-green-500' : 'text-destructive')}>
              {feedback}
            </p>
          )}

          {/* Buy button */}
          <button
            disabled={!canBuy || isPending}
            onClick={handleBuy}
            className={cn(
              'w-full py-3.5 rounded-xl font-semibold text-base transition-colors',
              canBuy ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed',
              'disabled:opacity-60',
            )}
          >
            {isPending
              ? 'Kaufen…'
              : hasVoucher
                ? <span className="inline-flex items-center gap-1.5">
                  Wurde dir ausgegeben ·
                  <span className="line-through opacity-70">{priceLabel}</span>
                </span>
                : `Kaufen · ${priceLabel}`}
          </button>
        </div>
      </div>
    </>
  )
}

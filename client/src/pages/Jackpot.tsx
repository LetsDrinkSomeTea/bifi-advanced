import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Dices } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { useBuyables } from '../hooks/useBuyables'
import { useJackpotEligibility, useSpinJackpot, type SpinResult } from '../hooks/useJackpot'
import type { BuyableWithVariants } from '@shared/types'
import { formatCents, cn } from '../lib/utils'

// 20 values, alternating low/high in 10% steps — EV = 100%
// [0, 200, 10, 190, 20, 180, 30, 170, 40, 160, 50, 150, 60, 140, 70, 130, 80, 120, 90, 110]
const MULTIPLIERS: number[] = [
  0, 200, 10, 190, 20, 180, 30, 170, 40, 160,
  50, 150, 60, 140, 70, 130, 80, 120, 90, 110,
]

const SEGMENT_DEG = 360 / MULTIPLIERS.length // 18°

function segmentColor(val: number): string {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  if (val <= 100) {
    // 0% → deep green, 90% → light green
    const t = val / 90
    return `hsl(142,${lerp(75, 65, t).toFixed(1)}%,${lerp(35, 45, t).toFixed(1)}%)`
  } else {
    // 110% → light red, 200% → deep red
    const t = (val - 110) / 90
    return `hsl(0,${lerp(75, 65, t).toFixed(1)}%,${lerp(35, 45, t).toFixed(1)}%)`
  }
}

function segmentLabel(val: number, basePrice?: number): string {
  if (basePrice == null) return `${val}%`
  const cents = Math.round(basePrice * val / 100)
  return (cents / 100).toFixed(2).replace('.', ',') + '€'
}

function Wheel({ rotationDeg, animating, basePrice }: { rotationDeg: number; animating: boolean; basePrice?: number }) {
  const cx = 200
  const cy = 200
  const r = 185
  const rText = 145
  const toRad = (deg: number) => (deg * Math.PI) / 180

  return (
    <div className="relative w-full max-w-xs mx-auto select-none">
      {/* Pointer arrow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10 drop-shadow-md">
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[22px] border-l-transparent border-r-transparent border-t-white" />
      </div>

      <svg
        viewBox="0 0 400 400"
        style={{
          transform: `rotate(${rotationDeg}deg)`,
          // Brief wind-up at start, fast spin, smooth deceleration
          transition: animating ? 'transform 4s cubic-bezier(0.3, -0.08, 0.1, 1)' : 'none',
          willChange: 'transform',
        }}
      >
        {MULTIPLIERS.map((val, i) => {
          // Segment i starts at the top (-90°) and goes clockwise
          const startDeg = -90 + i * SEGMENT_DEG
          const endDeg = -90 + (i + 1) * SEGMENT_DEG
          const midDeg = startDeg + SEGMENT_DEG / 2

          const x1 = cx + r * Math.cos(toRad(startDeg))
          const y1 = cy + r * Math.sin(toRad(startDeg))
          const x2 = cx + r * Math.cos(toRad(endDeg))
          const y2 = cy + r * Math.sin(toRad(endDeg))
          const xt = cx + rText * Math.cos(toRad(midDeg))
          const yt = cy + rText * Math.sin(toRad(midDeg))

          return (
            <g key={i}>
              <path
                d={`M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`}
                fill={segmentColor(val)}
                stroke="#111827"
                strokeWidth={0.8}
              />
              <text
                x={xt}
                y={yt}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={18}
                fill="white"
                fontWeight="bold"
                // rotate(midDeg) = radial orientation (text points toward/away from center)
                transform={`rotate(${midDeg}, ${xt.toFixed(2)}, ${yt.toFixed(2)})`}
              >
                {segmentLabel(val, basePrice)}
              </text>
            </g>
          )
        })}
        {/* Center hub */}
        <circle cx={cx} cy={cy} r={26} fill="#111827" stroke="#374151" strokeWidth={2} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={16}>
          🎰
        </text>
      </svg>
    </div>
  )
}

type Phase = 'select' | 'ready' | 'spinning' | 'result'

export function Jackpot() {
  const { data: eligibility, isLoading: loadingEligibility } = useJackpotEligibility()
  const { data: buyables, isLoading: loadingBuyables } = useBuyables()
  const { mutateAsync: spin } = useSpinJackpot()
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<Phase>('select')
  const [selectedBuyable, setSelectedBuyable] = useState<BuyableWithVariants | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [totalRotation, setTotalRotation] = useState(0)
  const [animating, setAnimating] = useState(false)

  const selectedVariant = selectedBuyable?.variants.find((v) => v.id === selectedVariantId)

  const handleSelect = (buyable: BuyableWithVariants, variantId: string) => {
    setSelectedBuyable(buyable)
    setSelectedVariantId(variantId)
    setPhase('ready')
  }

  const handleSpin = async () => {
    if (!selectedBuyable || !selectedVariantId) return
    setPhase('spinning')

    try {
      const result = await spin({ buyableId: selectedBuyable.id, variantId: selectedVariantId })
      setSpinResult(result)

      const segmentIndex = MULTIPLIERS.indexOf(result.multiplierPct)
      const segmentCenterDeg = segmentIndex * SEGMENT_DEG + SEGMENT_DEG / 2
      // Rotating clockwise by θ brings the segment originally at (360-θ) to the top.
      // So to land on segmentCenterDeg, the wheel's final angle mod 360 must equal (360 - segmentCenterDeg) % 360.
      const targetMod = (360 - segmentCenterDeg) % 360
      const currentMod = totalRotation % 360
      const delta = (targetMod - currentMod + 360) % 360
      const newRotation = totalRotation + 360 * 6 + delta

      setAnimating(true)
      setTotalRotation(newRotation)

      setTimeout(() => {
        setAnimating(false)
        setPhase('result')
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      }, 4200)
    } catch {
      setPhase('ready')
    }
  }

  const handleAgain = () => {
    setSpinResult(null)
    setPhase('ready')
  }

  const handleChangeProduct = () => {
    setSpinResult(null)
    setSelectedBuyable(null)
    setSelectedVariantId(null)
    setPhase('select')
  }

  if (loadingEligibility) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground text-sm">Laden…</div>
        </div>
      </Layout>
    )
  }

  if (!eligibility?.eligible) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground px-8 text-center">
          <Dices size={40} strokeWidth={1.5} />
          <p className="text-sm">
            {eligibility?.reason === 'disabled'
              ? 'Der Jackpot ist aktuell deaktiviert.'
              : 'Du bist nicht für den Jackpot freigeschaltet.'}
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          {phase !== 'select' && (
            <button onClick={handleChangeProduct} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-bold">Jackpot 🎰</h1>
        </div>

        {phase === 'select' && (
          <ProductPicker buyables={buyables ?? []} loading={loadingBuyables} onSelect={handleSelect} />
        )}

        {phase !== 'select' && selectedBuyable && selectedVariant && (
          <div className="space-y-4">
            {/* Selected product */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{selectedBuyable.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedVariant.name} · {formatCents(selectedVariant.price)}
                </p>
              </div>
              <Dices size={18} className="text-muted-foreground" />
            </div>

            {/* Wheel + result overlay */}
            <div className="relative">
              <Wheel rotationDeg={totalRotation} animating={animating} basePrice={selectedVariant?.price} />

              {phase === 'result' && spinResult && (
                <ResultOverlay result={spinResult} onAgain={handleAgain} onChangeProduct={handleChangeProduct} />
              )}
            </div>

            {/* Spin button */}
            {(phase === 'ready' || phase === 'spinning') && (
              <button
                onClick={handleSpin}
                disabled={phase === 'spinning'}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-lg transition-all',
                  phase === 'spinning'
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground active:scale-95',
                )}
              >
                {phase === 'spinning' ? 'Dreht sich…' : 'Drehen!'}
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

function ResultOverlay({
  result,
  onAgain,
  onChangeProduct,
}: {
  result: SpinResult
  onAgain: () => void
  onChangeProduct: () => void
}) {
  const isFree = result.multiplierPct === 0
  const isDouble = result.multiplierPct === 200
  const isUnder = result.multiplierPct < 100
  const isOver = result.multiplierPct > 100

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-2xl p-5 text-center shadow-xl mx-4 space-y-3 w-full">
        <p className="text-4xl font-black">
          {isFree ? '🍀' : isDouble ? '😬' : isUnder ? '🎉' : '😅'}
        </p>
        <p className="text-2xl font-bold">
          {isFree ? 'Gratis!' : `${result.multiplierPct}%`}
        </p>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>
            {result.productName} · {result.variantName}
          </p>
          <p>
            Bezahlt:{' '}
            <span
              className={cn(
                'font-semibold',
                isFree
                  ? 'text-green-400'
                  : isUnder
                    ? 'text-green-400'
                    : isOver
                      ? 'text-red-400'
                      : 'text-foreground',
              )}
            >
              {formatCents(result.pricePaid)}
            </span>{' '}
            <span className="text-muted-foreground/60">(statt {formatCents(result.variantPrice)})</span>
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onAgain}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            Nochmal
          </button>
          <button
            onClick={onChangeProduct}
            className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium"
          >
            Anderes Produkt
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductPicker({
  buyables,
  loading,
  onSelect,
}: {
  buyables: BuyableWithVariants[]
  loading: boolean
  onSelect: (buyable: BuyableWithVariants, variantId: string) => void
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Wähle ein Produkt zum Spielen:</p>
      {buyables.map((item) => {
        const active = item.variants.filter((v) => v.isActive)
        if (active.length === 0) return null
        return (
          <div key={item.id} className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
            <p className="text-sm font-semibold">{item.name}</p>
            <div className="flex flex-wrap gap-2">
              {active.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelect(item, v.id)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm hover:bg-muted transition-colors active:scale-95"
                >
                  {v.name}
                  <span className="ml-1.5 text-muted-foreground">{formatCents(v.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

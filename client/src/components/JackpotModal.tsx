import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dices, Trophy, PartyPopper, Meh, Smile } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { useSpinJackpot, type SpinResult } from '../hooks/useJackpot';
import { formatCents, cn } from '../lib/utils';

// 20 values, alternating low/high in 10% steps — EV = 100%
const MULTIPLIERS: number[] = [
  0, 200, 10, 190, 20, 180, 30, 170, 40, 160, 50, 150, 60, 140, 70, 130, 80, 120, 90, 110,
];

const SEGMENT_DEG = 360 / MULTIPLIERS.length; // 18°

function segmentColor(val: number): string {
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  if (val <= 100) {
    const t = val / 90;
    return `hsl(142,${lerp(75, 65, t).toFixed(1)}%,${lerp(35, 45, t).toFixed(1)}%)`;
  } else {
    const t = (val - 110) / 90;
    return `hsl(0,${lerp(75, 65, t).toFixed(1)}%,${lerp(35, 45, t).toFixed(1)}%)`;
  }
}

function segmentLabel(val: number, basePrice?: number): string {
  if (basePrice == null) return `${val}%`;
  const cents = Math.round((basePrice * val) / 100);
  return (cents / 100).toFixed(2).replace('.', ',') + '€';
}

function Wheel({
  rotationDeg,
  animating,
  basePrice,
}: {
  rotationDeg: number;
  animating: boolean;
  basePrice?: number;
}): React.JSX.Element {
  const cx = 200;
  const cy = 200;
  const r = 185;
  const rText = 145;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  return (
    <div className="relative w-full max-w-[280px] mx-auto select-none aspect-square">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10 drop-shadow-md">
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[22px] border-l-transparent border-r-transparent border-t-white" />
      </div>

      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        style={{
          transform: `rotate(${rotationDeg}deg)`,
          transition: animating ? 'transform 4s cubic-bezier(0.3, -0.08, 0.1, 1)' : 'none',
          willChange: 'transform',
        }}
      >
        {MULTIPLIERS.map((val, i) => {
          const startDeg = -90 + i * SEGMENT_DEG;
          const endDeg = -90 + (i + 1) * SEGMENT_DEG;
          const midDeg = startDeg + SEGMENT_DEG / 2;
          const x1 = cx + r * Math.cos(toRad(startDeg));
          const y1 = cy + r * Math.sin(toRad(startDeg));
          const x2 = cx + r * Math.cos(toRad(endDeg));
          const y2 = cy + r * Math.sin(toRad(endDeg));
          const xt = cx + rText * Math.cos(toRad(midDeg));
          const yt = cy + rText * Math.sin(toRad(midDeg));

          return (
            <g key={i}>
              <path
                d={`M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`}
                fill={segmentColor(val)}
                stroke="var(--background-950)"
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
                transform={`rotate(${midDeg}, ${xt.toFixed(2)}, ${yt.toFixed(2)})`}
              >
                {segmentLabel(val, basePrice)}
              </text>
            </g>
          );
        })}
        <circle
          cx={cx}
          cy={cy}
          r={26}
          fill="var(--background-950)"
          stroke="var(--border)"
          strokeWidth={2}
        />
        <g transform={`translate(${cx - 12}, ${cy - 12})`}>
          <Dices size={24} className="text-white" />
        </g>
      </svg>
    </div>
  );
}

export function JackpotModal({
  open,
  onClose,
  buyableId,
  variantId,
  basePrice,
  productName,
  variantName,
}: {
  open: boolean;
  onClose: () => void;
  buyableId: string;
  variantId: string;
  basePrice: number;
  productName: string;
  variantName: string;
}): React.JSX.Element {
  const { mutateAsync: spin } = useSpinJackpot();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'result'>('ready');
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [totalRotation, setTotalRotation] = useState(0);
  const [animating, setAnimating] = useState(false);

  const handleSpin = async (): Promise<void> => {
    setPhase('spinning');
    try {
      const result = await spin({ buyableId, variantId });
      setSpinResult(result);
      const segmentIndex = MULTIPLIERS.indexOf(result.multiplierPct);
      const segmentCenterDeg = segmentIndex * SEGMENT_DEG + SEGMENT_DEG / 2;
      const targetMod = (360 - segmentCenterDeg) % 360;
      const currentMod = totalRotation % 360;
      const delta = (targetMod - currentMod + 360) % 360;
      const newRotation = totalRotation + 360 * 6 + delta;
      setAnimating(true);
      setTotalRotation(newRotation);
      setTimeout(() => {
        setAnimating(false);
        setPhase('result');
        void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      }, 4200);
    } catch {
      setPhase('ready');
    }
  };

  return (
    <Modal
      open={open}
      onClose={
        phase === 'spinning'
          ? (): void => {
              /* spinning, no close allowed */
            }
          : () => {
              onClose();
            }
      }
      title="Jackpot Spin"
    >
      <div className="space-y-6 py-2">
        <div className="text-center">
          <p className="text-sm font-semibold">{productName}</p>
          <p className="text-xs text-muted-foreground">
            {variantName} · {formatCents(basePrice)}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[280px]">
          {phase !== 'result' ? (
            <Wheel rotationDeg={totalRotation} animating={animating} basePrice={basePrice} />
          ) : spinResult ? (
            <div className="w-full text-center space-y-4 py-4 animate-in zoom-in-95 duration-300">
              <div
                className={cn(
                  'w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-inner border-4',
                  spinResult.multiplierPct <= 100
                    ? 'bg-confirm-soft border-confirm-strong/20 text-confirm-strong'
                    : 'bg-destructive-soft border-destructive-strong/20 text-destructive-strong',
                )}
              >
                {spinResult.multiplierPct === 0 ? (
                  <Trophy size={48} />
                ) : spinResult.multiplierPct === 200 ? (
                  <Meh size={48} />
                ) : spinResult.multiplierPct < 100 ? (
                  <PartyPopper size={48} />
                ) : (
                  <Smile size={48} />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black tracking-tight">
                  {spinResult.multiplierPct === 0 ? 'Gratis!' : `${spinResult.multiplierPct}%`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Bezahlt:{' '}
                  <span
                    className={cn(
                      'font-bold',
                      spinResult.multiplierPct <= 100
                        ? 'text-confirm-strong'
                        : 'text-destructive-strong',
                    )}
                  >
                    {formatCents(spinResult.pricePaid)}
                  </span>
                </p>
              </div>
              <div className="pt-4">
                <Button onClick={onClose} className="w-full h-14 rounded-2xl font-bold text-lg">
                  Fertig
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {phase === 'ready' && (
          <Button
            onClick={() => {
              void handleSpin();
            }}
            className="w-full py-4 h-auto rounded-2xl font-bold text-lg active:scale-95 transition-transform"
          >
            Drehen!
          </Button>
        )}

        {phase === 'spinning' && (
          <Button
            disabled
            className="w-full py-4 h-auto rounded-2xl font-bold text-lg cursor-not-allowed bg-muted text-muted-foreground"
          >
            Glück am Rad...
          </Button>
        )}
      </div>
    </Modal>
  );
}

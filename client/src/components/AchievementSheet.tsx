import { Check, Lock, Medal } from 'lucide-react';
import { TIER_META } from '@shared/achievements';
import type { AchievementDef } from '@shared/achievements';
import { cn } from '../lib/utils';
import type { Card, GroupCard, StandaloneCard } from './achievement-types';
import { TIER_COLORS } from './achievement-types';
import { InfoSheet } from './InfoSheet';
import { DynamicIcon } from './ui/DynamicIcon';
import { ProgressBar } from './ui/ProgressBar';

interface AchievementSheetProps {
  open: boolean;
  onClose: () => void;
  card: Card | null;
  progress?: Record<string, number>;
  meta: AchievementDef[];
}

function GroupContent({
  card,
  progress,
  meta,
}: {
  card: GroupCard;
  progress?: Record<string, number>;
  meta: AchievementDef[];
}): React.JSX.Element {
  const nextTier = card.tiers.find((t) => !t.unlocked);
  let progressBar: React.ReactNode = null;
  if (!card.hidden && progress !== undefined && nextTier) {
    const def = meta.find((m) => m.key === nextTier.key);
    const cardProgress = progress[card.groupKey];
    if (def?.threshold !== undefined && cardProgress !== undefined) {
      progressBar = (
        <ProgressBar
          value={cardProgress}
          max={def.threshold}
          format={def.progressFormat ?? 'count'}
          barHeight="h-2"
          labelSize="text-xs"
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <DynamicIcon
          name={card.icon}
          size={48}
          className={cn(card.anyUnlocked && card.color ? card.color : 'text-muted-foreground')}
        />
        <div>
          <p className="font-semibold text-base">{card.name}</p>
          {!card.tiers.some(t => !t.unlocked) ? (
            <span className="text-xs text-confirm-strong flex items-center gap-1">
              <Check size={12} /> Freigeschaltet
            </span>
          ) : card.anyUnlocked ? (
            <span className="text-xs text-confirm-strong flex items-center gap-1">
              <Check size={12} /> Teilweise freigeschaltet
            </span>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock size={12} /> Noch nicht freigeschaltet
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {card.tiers.map((t) => (
          <div
            key={t.tier}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border',
              t.unlocked ? 'border-border bg-card' : 'border-border bg-muted/30',
            )}
          >
            <Medal size={20} className={cn(TIER_COLORS[t.tier], !t.unlocked && 'opacity-40')} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', !t.unlocked && 'text-muted-foreground')}>
                {TIER_META[t.tier].label}
              </p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              {!t.unlocked && nextTier?.key === t.key && progressBar ? (
                <div className="mt-2">{progressBar}</div>
              ) : null}
            </div>
            {t.unlocked ? (
              <Check size={16} className="text-confirm-strong shrink-0 mt-0.5" />
            ) : (
              <Lock size={14} className="text-muted-foreground opacity-40 shrink-0 mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StandaloneContent({ card }: { card: StandaloneCard }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <DynamicIcon
          name={card.icon}
          size={48}
          className={cn(card.unlocked && card.color ? card.color : 'text-muted-foreground')}
        />
        <div>
          <p className="font-semibold text-base">{card.name}</p>
          {card.unlocked ? (
            <span className="text-xs text-confirm-strong flex items-center gap-1">
              <Check size={12} /> Freigeschaltet
            </span>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock size={12} /> Noch nicht freigeschaltet
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{card.description}</p>
    </div>
  );
}

export function AchievementSheet({
  open,
  onClose,
  card,
  progress,
  meta,
}: AchievementSheetProps): React.JSX.Element | null {
  if (!card) return null;

  const isHiddenDummy =
    card.kind === 'standalone' && card.key.startsWith('hidden_locked_dummy_');

  const title = isHiddenDummy ? '???' : card.name;

  return (
    <InfoSheet open={open} onClose={onClose} title={title}>
      {isHiddenDummy ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Lock size={40} className="text-muted-foreground" />
          <p className="font-semibold text-base">???</p>
          <p className="text-sm text-muted-foreground">Dieses Achievement ist geheim.</p>
        </div>
      ) : card.kind === 'group' ? (
        <GroupContent card={card} progress={progress} meta={meta} />
      ) : (
        <StandaloneContent card={card} />
      )}
    </InfoSheet>
  );
}

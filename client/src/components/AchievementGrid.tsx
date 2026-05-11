import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight, Medal, Lock } from 'lucide-react';
import type { AchievementDef, AchievementTier } from '@shared/achievements';
import { cn } from '../lib/utils';
import { useAchievementMeta } from '../hooks/useAchievements';
import { DynamicIcon } from './ui/DynamicIcon';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import type { Card, GroupCard, StandaloneCard } from './achievement-types';
import { TIER_ORDER, TIER_COLORS } from './achievement-types';
import { AchievementSheet } from './AchievementSheet';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AchievementEntry {
  key: string;
  unlockedAt: string;
}

interface Props {
  achievements: AchievementEntry[];
  limit?: number; // if set: show only the N most recently unlocked
  allLink?: string; // if set: show "Alle →" link in the header
  progress?: Record<string, number>; // groupKey → current count (only passed in full view)
}

const RECENT_UNLOCK_MS = 60_000;

// ─── Card builder ─────────────────────────────────────────────────────────────

function buildCards(unlockedMap: Map<string, Date>, meta: AchievementDef[]): Card[] {
  const groupMap = new Map<string, GroupCard>();
  const cards: Card[] = [];

  for (const def of meta) {
    if (def.groupKey && def.tier) {
      let group = groupMap.get(def.groupKey);
      if (!group) {
        group = {
          kind: 'group',
          groupKey: def.groupKey,
          name: def.name,
          icon: def.icon,
          color: def.color,
          hidden: def.hidden ?? false,
          tiers: [],
          anyUnlocked: false,
          highestUnlocked: null,
          latestUnlockedAt: null,
        };
        groupMap.set(def.groupKey, group);
        cards.push(group);
      }
      const unlockedAt = unlockedMap.get(def.key) ?? null;
      const isUnlocked = unlockedAt !== null;
      group.tiers.push({
        tier: def.tier,
        key: def.key,
        description: def.description,
        unlocked: isUnlocked,
      });
      if (isUnlocked) {
        group.anyUnlocked = true;
        if (
          group.highestUnlocked === null ||
          TIER_ORDER[def.tier] > TIER_ORDER[group.highestUnlocked]
        ) {
          group.highestUnlocked = def.tier;
        }
        if (group.latestUnlockedAt === null || unlockedAt > group.latestUnlockedAt) {
          group.latestUnlockedAt = unlockedAt;
        }
      }
    } else {
      const unlockedAt = unlockedMap.get(def.key) ?? null;
      cards.push({
        kind: 'standalone',
        key: def.key,
        name: def.name,
        icon: def.icon,
        color: def.color,
        description: def.description,
        hidden: def.hidden ?? false,
        unlocked: unlockedAt !== null,
        unlockedAt,
      });
    }
  }

  for (const card of cards) {
    if (card.kind === 'group') {
      card.tiers.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
    }
  }

  return cards;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SEEN_ACHIEVEMENTS_KEY = 'bifi_seen_achievements';

function useJustUnlocked(latestUnlockedAt: Date | null, id: string): boolean {
  const [isJustUnlocked] = useState(() => {
    if (!latestUnlockedAt) return false;

    const now = Date.now();
    const isRecent = now - latestUnlockedAt.getTime() < RECENT_UNLOCK_MS;

    if (isRecent) {
      try {
        const seenStr = sessionStorage.getItem(SEEN_ACHIEVEMENTS_KEY) ?? '[]';
        const seen = JSON.parse(seenStr) as string[];
        return !seen.includes(id);
      } catch {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (isJustUnlocked) {
      try {
        const seenStr = sessionStorage.getItem(SEEN_ACHIEVEMENTS_KEY) ?? '[]';
        const seen = JSON.parse(seenStr) as string[];
        if (!seen.includes(id)) {
          sessionStorage.setItem(SEEN_ACHIEVEMENTS_KEY, JSON.stringify([...seen, id]));
        }
      } catch (err) {
        console.error('Failed to update seen achievements', err);
      }
    }
  }, [isJustUnlocked, id]);

  return isJustUnlocked;
}

function TierBadge({
  tier,
  unlocked,
}: {
  tier: AchievementTier;
  unlocked: boolean;
}): React.JSX.Element {
  return (
    <span className={cn('text-sm leading-none', !unlocked && 'opacity-20 grayscale')}>
      <Medal size={14} className={TIER_COLORS[tier]} />
    </span>
  );
}


function GroupCardComponent({
  card,
  progress,
  meta,
  onClick,
}: {
  card: GroupCard;
  progress?: Record<string, number>;
  meta: AchievementDef[];
  onClick: () => void;
}): React.JSX.Element {
  const isHiddenAndLocked = card.hidden && !card.anyUnlocked;

  const justUnlocked = useJustUnlocked(card.latestUnlockedAt, card.groupKey);

  // Progress bar: only for non-hidden groups with data, when next tier exists
  let progressBar: React.ReactNode = null;
  if (!card.hidden && progress !== undefined) {
    const nextTier = card.tiers.find((t) => !t.unlocked);
    if (nextTier) {
      const def = meta.find((m) => m.key === nextTier.key);
      const cardProgress = progress[card.groupKey];
      if (def?.threshold !== undefined && cardProgress) {
        progressBar = (
          <ProgressBar
            value={cardProgress}
            max={def.threshold}
            format={def.progressFormat ?? 'count'}
          />
        );
      }
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border text-center h-full min-h-[90px] transition-all cursor-pointer',
        card.anyUnlocked
          ? 'border-border bg-card shadow-sm'
          : 'border-border bg-muted/30 opacity-60',
        justUnlocked && 'achievement-glow',
      )}
    >
      <span className="leading-none">
        {isHiddenAndLocked ? (
          <Lock className="w-6 h-6 text-muted-foreground" />
        ) : (
          <DynamicIcon
            name={card.icon}
            size={24}
            className={cn(card.anyUnlocked && card.color ? card.color : 'text-inherit')}
          />
        )}
      </span>
      <span
        className={cn(
          'text-[10px] leading-tight font-medium line-clamp-2',
          !card.anyUnlocked && 'text-muted-foreground',
        )}
      >
        {isHiddenAndLocked ? '???' : card.name}
      </span>
      <div className="flex items-center gap-0.5">
        {card.tiers.map((t) => (
          <TierBadge key={t.tier} tier={t.tier} unlocked={t.unlocked} />
        ))}
      </div>
      {progressBar ? <div className="w-full mt-0.5">{progressBar}</div> : null}
    </div>
  );
}

function StandaloneCardComponent({
  card,
  onClick,
}: {
  card: StandaloneCard;
  onClick: () => void;
}): React.JSX.Element {
  const isHiddenAndLocked = card.hidden && !card.unlocked;
  const justUnlocked = useJustUnlocked(card.unlockedAt, card.key);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={cn(
        'flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center h-full min-h-[90px] transition-all cursor-pointer',
        card.unlocked ? 'border-border bg-card shadow-sm' : 'border-border bg-muted/30 opacity-60',
        justUnlocked && 'achievement-glow',
      )}
    >
      <span className="leading-none">
        {isHiddenAndLocked ? (
          <Lock className="w-6 h-6 text-muted-foreground" />
        ) : (
          <DynamicIcon
            name={card.icon}
            size={24}
            className={cn(card.unlocked && card.color ? card.color : 'text-inherit')}
          />
        )}
      </span>
      <span
        className={cn(
          'text-[10px] leading-tight font-medium line-clamp-2',
          !card.unlocked && 'text-muted-foreground',
        )}
      >
        {isHiddenAndLocked ? '???' : card.name}
      </span>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export const AchievementGrid = ({
  achievements,
  limit,
  allLink,
  progress,
}: Props): React.JSX.Element => {
  const { data: metaData, isLoading } = useAchievementMeta();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCard = (card: Card): void => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setSelectedCard(card);
    setIsSheetOpen(true);
  };

  const closeSheet = (): void => {
    setIsSheetOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setSelectedCard(null);
      closeTimerRef.current = null;
    }, 350);
  };

  const unlockedMap = new Map(achievements.map((a) => [a.key, new Date(a.unlockedAt)]));

  if (isLoading || !metaData) {
    return (
      <div>
        <div className="h-4 w-32 bg-muted animate-pulse mb-3 rounded" />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {Array.from({ length: limit ?? 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Start with global public meta
  const meta: AchievementDef[] = [...metaData.publicMeta];

  const unlockedHiddenGroups = new Set<string>();
  let unlockedHiddenStandaloneCount = 0;

  // Add metadata for unlocked hidden achievements (passed inline by the backend)
  for (const a of achievements as (AchievementEntry & { meta?: AchievementDef })[]) {
    if (a.meta && !meta.find((m) => m.key === a.key)) {
      meta.push(a.meta);
      if (a.meta.hidden) {
        if (a.meta.groupKey) unlockedHiddenGroups.add(a.meta.groupKey);
        else unlockedHiddenStandaloneCount++;
      }
    }
  }

  const allCards = buildCards(unlockedMap, meta);

  // Add dummy cards for the locked hidden achievements
  const lockedHiddenCount = Math.max(
    0,
    metaData.hiddenCount - (unlockedHiddenGroups.size + unlockedHiddenStandaloneCount),
  );

  for (let i = 0; i < lockedHiddenCount; i++) {
    allCards.push({
      kind: 'standalone',
      key: `hidden_locked_dummy_${i}`,
      name: '???',
      icon: 'lock',
      color: 'text-muted-foreground',
      description: 'Dieses Achievement ist geheim.',
      hidden: true,
      unlocked: false,
      unlockedAt: null,
    });
  }

  allCards.sort((a, b) => {
    const aDate = a.kind === 'group' ? a.latestUnlockedAt : a.unlockedAt;
    const bDate = b.kind === 'group' ? b.latestUnlockedAt : b.unlockedAt;

    const aLockedAndHidden = aDate === null && a.hidden;
    const bLockedAndHidden = bDate === null && b.hidden;

    if (aLockedAndHidden && !bLockedAndHidden) return 1;
    if (!aLockedAndHidden && bLockedAndHidden) return -1;

    if (aDate === null && bDate === null) return 0;
    if (aDate === null) return 1;
    if (bDate === null) return -1;

    return bDate.getTime() - aDate.getTime();
  });

  const displayCards = limit !== undefined ? allCards.slice(0, limit) : allCards;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Achievements
        </h2>
        {allLink ? (
          <Link href={allLink}>
            <Button variant="ghost" size="sm" className="h-7 gap-0.5 text-primary">
              Alle <ChevronRight size={13} />
            </Button>
          </Link>
        ) : null}
      </div>
      {displayCards.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Noch keine Achievements</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
          {displayCards.map((card) =>
            card.kind === 'group' ? (
              <GroupCardComponent
                key={card.groupKey}
                card={card}
                progress={progress}
                meta={meta}
                onClick={() => openCard(card)}
              />
            ) : (
              <StandaloneCardComponent
                key={card.key}
                card={card}
                onClick={() => openCard(card)}
              />
            ),
          )}
        </div>
      )}
      <AchievementSheet
        open={isSheetOpen}
        onClose={closeSheet}
        card={selectedCard}
        progress={progress}
        meta={meta}
      />
    </div>
  );
};

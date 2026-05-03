import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { TIER_META } from '@shared/achievements';
import type { AchievementDef, AchievementTier } from '@shared/achievements';
import { cn, formatCents } from '../lib/utils';
import { useAchievementMeta } from '../hooks/useAchievements';

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

// ─── Card types ───────────────────────────────────────────────────────────────

interface TierEntry {
  tier: AchievementTier;
  key: string;
  description: string;
  unlocked: boolean;
}

interface GroupCard {
  kind: 'group';
  groupKey: string;
  name: string;
  icon: string;
  hidden: boolean;
  tiers: TierEntry[];
  anyUnlocked: boolean;
  highestUnlocked: AchievementTier | null;
  latestUnlockedAt: Date | null;
}

interface StandaloneCard {
  kind: 'standalone';
  key: string;
  name: string;
  icon: string;
  description: string;
  hidden: boolean;
  unlocked: boolean;
  unlockedAt: Date | null;
}

type Card = GroupCard | StandaloneCard;

const TIER_ORDER: Record<AchievementTier, number> = { bronze: 0, silver: 1, gold: 2 };

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
    <span
      className={cn('text-sm leading-none', !unlocked && 'opacity-20 grayscale')}
      title={`${TIER_META[tier].label}${unlocked ? ' ✓' : ''}`}
    >
      {TIER_META[tier].emoji}
    </span>
  );
}

function ProgressBar({
  value,
  max,
  format = 'count',
}: {
  value: number;
  max: number;
  format?: 'count' | 'cents';
}): React.JSX.Element {
  const [animWidth, setAnimWidth] = useState(0);

  useEffect(() => {
    const targetWidth = Math.min(value / max, 1) * 100;
    const id = requestAnimationFrame(() => {
      setAnimWidth(targetWidth);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [value, max]);

  const fmt = (v: number): string =>
    format === 'cents' ? formatCents(v) : v.toLocaleString('de-DE');

  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] text-muted-foreground leading-none mb-0.5">
        <span>{fmt(value)}</span>
        <span>{fmt(max)}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${animWidth}%` }}
        />
      </div>
    </div>
  );
}

function GroupCardComponent({
  card,
  progress,
  meta,
}: {
  card: GroupCard;
  progress?: Record<string, number>;
  meta: AchievementDef[];
}): React.JSX.Element {
  const isHiddenAndLocked = card.hidden && !card.anyUnlocked;
  const tooltip = isHiddenAndLocked
    ? '???'
    : card.tiers
        .map((t) => `${TIER_META[t.tier].emoji} ${t.description}${t.unlocked ? ' ✓' : ''}`)
        .join('\n');

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
      title={tooltip}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border text-center h-full min-h-[90px]',
        card.anyUnlocked
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-muted/30 opacity-60',
        justUnlocked && 'achievement-glow',
      )}
    >
      <span className="text-2xl leading-none">{isHiddenAndLocked ? '🔒' : card.icon}</span>
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

function StandaloneCardComponent({ card }: { card: StandaloneCard }): React.JSX.Element {
  const isHiddenAndLocked = card.hidden && !card.unlocked;
  const justUnlocked = useJustUnlocked(card.unlockedAt, card.key);

  return (
    <div
      title={isHiddenAndLocked ? '???' : `${card.name}: ${card.description}`}
      className={cn(
        'flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center h-full min-h-[90px]',
        card.unlocked ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-60',
        justUnlocked && 'achievement-glow',
      )}
    >
      <span className="text-2xl leading-none">{isHiddenAndLocked ? '🔒' : card.icon}</span>
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
      icon: '🔒',
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
          <Link
            href={allLink}
            className="flex items-center gap-0.5 text-xs text-primary hover:underline"
          >
            Alle <ChevronRight size={13} />
          </Link>
        ) : null}
      </div>
      {displayCards.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Noch keine Achievements</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
          {displayCards.map((card) =>
            card.kind === 'group' ? (
              <GroupCardComponent key={card.groupKey} card={card} progress={progress} meta={meta} />
            ) : (
              <StandaloneCardComponent key={card.key} card={card} />
            ),
          )}
        </div>
      )}
    </div>
  );
};

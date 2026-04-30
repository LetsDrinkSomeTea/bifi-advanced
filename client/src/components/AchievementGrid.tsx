import { Link } from 'wouter'
import { ChevronRight } from 'lucide-react'
import { ACHIEVEMENTS, TIER_META } from '@shared/achievements'
import type { AchievementTier } from '@shared/achievements'
import { cn } from '../lib/utils'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AchievementEntry {
  key: string
  unlockedAt: string
}

interface Props {
  achievements: AchievementEntry[]
  limit?: number    // if set: show only the N most recently unlocked, as grid tiles
  allLink?: string  // if set: show "Alle →" link in the header
}

// ─── Card types ───────────────────────────────────────────────────────────────

type TierEntry = { tier: AchievementTier; key: string; description: string; unlocked: boolean }

type GroupCard = {
  kind: 'group'
  groupKey: string
  name: string
  icon: string
  hidden: boolean
  tiers: TierEntry[]
  anyUnlocked: boolean
  highestUnlocked: AchievementTier | null
  latestUnlockedAt: Date | null
}

type StandaloneCard = {
  kind: 'standalone'
  key: string
  name: string
  icon: string
  description: string
  hidden: boolean
  unlocked: boolean
  unlockedAt: Date | null
}

type Card = GroupCard | StandaloneCard

const TIER_ORDER: Record<AchievementTier, number> = { bronze: 0, silver: 1, gold: 2 }

// ─── Card builder ─────────────────────────────────────────────────────────────

function buildCards(unlockedMap: Map<string, Date>): Card[] {
  const groupMap = new Map<string, GroupCard>()
  const cards: Card[] = []

  for (const def of Object.values(ACHIEVEMENTS)) {
    if (def.groupKey && def.tier) {
      if (!groupMap.has(def.groupKey)) {
        const card: GroupCard = {
          kind: 'group',
          groupKey: def.groupKey,
          name: def.name,
          icon: def.icon,
          hidden: def.hidden ?? false,
          tiers: [],
          anyUnlocked: false,
          highestUnlocked: null,
          latestUnlockedAt: null,
        }
        groupMap.set(def.groupKey, card)
        cards.push(card)
      }
      const group = groupMap.get(def.groupKey)!
      const unlockedAt = unlockedMap.get(def.key) ?? null
      const isUnlocked = unlockedAt !== null
      group.tiers.push({ tier: def.tier, key: def.key, description: def.description, unlocked: isUnlocked })
      if (isUnlocked) {
        group.anyUnlocked = true
        if (group.highestUnlocked === null || TIER_ORDER[def.tier] > TIER_ORDER[group.highestUnlocked]) {
          group.highestUnlocked = def.tier
        }
        if (group.latestUnlockedAt === null || unlockedAt > group.latestUnlockedAt) {
          group.latestUnlockedAt = unlockedAt
        }
      }
    } else {
      const unlockedAt = unlockedMap.get(def.key) ?? null
      cards.push({
        kind: 'standalone',
        key: def.key,
        name: def.name,
        icon: def.icon,
        description: def.description,
        hidden: def.hidden ?? false,
        unlocked: unlockedAt !== null,
        unlockedAt,
      })
    }
  }

  for (const card of cards) {
    if (card.kind === 'group') {
      card.tiers.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])
    }
  }

  return cards
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier, unlocked }: { tier: AchievementTier; unlocked: boolean }) {
  return (
    <span
      className={cn('text-sm leading-none', !unlocked && 'opacity-20 grayscale')}
      title={`${TIER_META[tier].label}${unlocked ? ' ✓' : ''}`}
    >
      {TIER_META[tier].emoji}
    </span>
  )
}

function GroupCard({ card }: { card: GroupCard }) {
  const isHiddenAndLocked = card.hidden && !card.anyUnlocked
  const tooltip = isHiddenAndLocked
    ? '???'
    : card.tiers.map((t) => `${TIER_META[t.tier].emoji} ${t.description}${t.unlocked ? ' ✓' : ''}`).join('\n')

  return (
    <div
      title={tooltip}
      className={cn(
        'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center',
        card.anyUnlocked ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-60',
      )}
    >
      <span className="text-2xl leading-none">{isHiddenAndLocked ? '🔒' : card.icon}</span>
      <span className={cn('text-[10px] leading-tight font-medium line-clamp-2', !card.anyUnlocked && 'text-muted-foreground')}>
        {isHiddenAndLocked ? '???' : card.name}
      </span>
      <div className="flex items-center gap-0.5">
        {card.tiers.map((t) => (
          <TierBadge key={t.tier} tier={t.tier} unlocked={t.unlocked} />
        ))}
      </div>
    </div>
  )
}

function StandaloneCard({ card }: { card: StandaloneCard }) {
  const isHiddenAndLocked = card.hidden && !card.unlocked
  return (
    <div
      title={isHiddenAndLocked ? '???' : `${card.name}: ${card.description}`}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-xl border text-center',
        card.unlocked ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-60',
      )}
    >
      <span className="text-2xl leading-none">{isHiddenAndLocked ? '🔒' : card.icon}</span>
      <span className={cn('text-[10px] leading-tight font-medium line-clamp-2', !card.unlocked && 'text-muted-foreground')}>
        {isHiddenAndLocked ? '???' : card.name}
      </span>
    </div>
  )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function AchievementGrid({ achievements, limit, allLink }: Props) {
  const unlockedMap = new Map(achievements.map((a) => [a.key, new Date(a.unlockedAt)]))
  const allCards = buildCards(unlockedMap)

  let displayCards: Card[] = allCards
  allCards.sort((a, b) => {
    const aDate = a.kind === 'group' ? a.latestUnlockedAt : a.unlockedAt
    const bDate = b.kind === 'group' ? b.latestUnlockedAt : b.unlockedAt

    const aLockedAndHidden = !aDate && a.hidden;
    const bLockedAndHidden = !bDate && b.hidden;

    if (aLockedAndHidden && !bLockedAndHidden) return 1;
    if (!aLockedAndHidden && bLockedAndHidden) return -1;

    if (!aDate && !bDate) return 0
    if (!aDate) return 1
    if (!bDate) return -1

    return bDate.getTime() - aDate.getTime()
  })
  if (limit !== undefined) {
    displayCards = allCards.slice(0, limit)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Achievements</h2>
        {allLink && (
          <Link href={allLink} className="flex items-center gap-0.5 text-xs text-primary hover:underline">
            Alle <ChevronRight size={13} />
          </Link>
        )}
      </div>
      {displayCards.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Noch keine Achievements</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {displayCards.map((card) =>
            card.kind === 'group'
              ? <GroupCard key={card.groupKey} card={card} />
              : <StandaloneCard key={card.key} card={card} />
          )}
        </div>
      )}
    </div>
  )
}

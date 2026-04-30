import { Link } from 'wouter'
import type { FeedEntry } from '../hooks/useFeed'
import { useAuth } from '../hooks/useAuth'
import { ACHIEVEMENTS } from '@shared/achievements'
import { formatTimestamp, cn } from '../lib/utils'

type Item = { name: string; variantName: string; count: number }

export interface GroupedFeedEntry extends FeedEntry {
  mergedItems?: Item[]
}

// ─── Type emoji map ────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  purchase: '🛒',
  achievement: '🏆',
  prost_sent: '🍺',
  nudge: '👋',
  group_join: '👥',
  group_created: '🏗️',
  group_left: '🚪',
  group_deleted: '🗑️',
  friendship_started: '🤝',
  goal_reached: '🎯',
  jackpot_win: '🎰',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AvatarNode({ user }: { user: { id: string; displayName: string; avatarUrl: string | null } }) {
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
        : <span>{user.displayName[0]?.toUpperCase()}</span>}
    </div>
  )
}

function UserLink({ user }: { user: { id: string; displayName: string } }) {
  return (
    <Link href={`/profile/${user.id}`} className="font-semibold hover:underline">
      {user.displayName}
    </Link>
  )
}

type ActorUser = { id: string; displayName: string; avatarUrl: string | null }
type TargetUser = { id: string; displayName: string; avatarUrl: string | null } | null

function Actor({ user, currentUserId }: { user: ActorUser; currentUserId: string | undefined }) {
  if (currentUserId && user.id === currentUserId) return <span className="font-semibold">Du</span>
  return <UserLink user={user} />
}

function targetName(
  target: TargetUser,
  currentUserId: string | undefined,
  accusative = true,
): React.ReactNode {
  if (!target) return accusative ? 'jemanden' : 'jemandem'
  if (currentUserId && target.id === currentUserId) return accusative ? 'dich' : 'dir'
  return <UserLink user={target} />
}

// ─── Feed text ────────────────────────────────────────────────────────────────

function feedText(entry: GroupedFeedEntry, currentUserId: string | undefined): React.ReactNode {
  const { type, user, targetUser, metadata, mergedItems } = entry
  const isMe = !!currentUserId && user.id === currentUserId

  switch (type) {
    case 'purchase': {
      const items = mergedItems ?? (metadata?.items as Item[] | undefined)
      const itemStr = items?.map((i) => `${i.count}× ${i.name}${i.variantName ? ` ${i.variantName}` : ''}`).join(', ') ?? 'etwas'
      return isMe
        ? <>Du hast {itemStr} gekauft</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat {itemStr} gekauft</>
    }
    case 'achievement': {
      const key = (metadata?.achievementKey ?? metadata?.key) as string | undefined
      const def = key ? ACHIEVEMENTS[key as keyof typeof ACHIEVEMENTS] : undefined
      const name = def ? `${def.icon} ${def.name}` : 'ein Achievement'
      return isMe
        ? <>Du hast <span className="font-medium">„{name}"</span> freigeschaltet</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat <span className="font-medium">„{name}"</span> freigeschaltet</>
    }
    case 'group_join': {
      const groupName = metadata?.groupName as string | undefined
      return isMe
        ? <>Du bist der Gruppe <span className="font-medium">{groupName ?? 'einer Gruppe'}</span> beigetreten</>
        : <><Actor user={user} currentUserId={currentUserId} /> ist der Gruppe <span className="font-medium">{groupName ?? 'einer Gruppe'}</span> beigetreten</>
    }
    case 'group_created': {
      const groupName = metadata?.groupName as string | undefined
      return isMe
        ? <>Du hast die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> erstellt</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> erstellt</>
    }
    case 'group_left': {
      const groupName = metadata?.groupName as string | undefined
      return isMe
        ? <>Du hast die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> verlassen</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> verlassen</>
    }
    case 'group_deleted': {
      const groupName = metadata?.groupName as string | undefined
      return isMe
        ? <>Du hast die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> gelöscht</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> gelöscht</>
    }
    case 'nudge': {
      const message = metadata?.message as string | undefined
      return isMe
        ? <>Du hast {targetName(targetUser, currentUserId, true)} angestupst{message ? <> – <span className="italic">„{message}"</span></> : ''}</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat {targetName(targetUser, currentUserId, true)} angestupst{message ? <> – <span className="italic">„{message}"</span></> : ''}</>
    }
    case 'prost_sent': {
      const drink = metadata?.buyableName
        ? `${metadata.buyableName as string}${metadata.variantName ? ` ${metadata.variantName as string}` : ''}`
        : null
      const drinkNode = drink
        ? <>einen <span className="font-medium">{drink}</span></>
        : <>einen</>
      return isMe
        ? <>Du hast {targetName(targetUser, currentUserId, true)} {drinkNode} ausgegeben 🍺</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat {targetName(targetUser, currentUserId, true)} {drinkNode} ausgegeben 🍺</>
    }
    case 'friendship_started': {
      const isTarget = !!currentUserId && targetUser?.id === currentUserId
      if (isMe) return <>Du und {targetName(targetUser, currentUserId, true)} seid jetzt befreundet 🤝</>
      if (isTarget) return <>{<UserLink user={user} />} und du seid jetzt befreundet 🤝</>
      return <><Actor user={user} currentUserId={currentUserId} /> und {targetName(targetUser, undefined)} sind jetzt befreundet 🤝</>
    }
    case 'goal_reached': {
      const title = metadata?.goalTitle as string | undefined
      return <>Spendenziel <span className="font-medium">{title ?? 'Ziel'}</span> wurde erreicht! 🎯</>
    }
    case 'jackpot_win': {
      const multiplier = metadata?.multiplier as number | undefined
      return isMe
        ? <>Du hast den Jackpot gewonnen{multiplier != null ? ` (${multiplier}×)` : ''} 🎰</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat den Jackpot gewonnen{multiplier != null ? ` (${multiplier}×)` : ''} 🎰</>
    }
    default:
      return isMe
        ? <>Du hast etwas getan</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat etwas getan</>
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  entry: GroupedFeedEntry
  hasConnector?: boolean
}

export function FeedItem({ entry, hasConnector = false }: Props) {
  const { user: currentUser } = useAuth()
  const emoji = TYPE_EMOJI[entry.type] ?? '•'

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="relative">
          <Link href={`/profile/${entry.user.id}`}>
            <AvatarNode user={entry.user} />
          </Link>
          <span className="absolute -bottom-1 -right-1 text-[11px] leading-none select-none bg-background rounded-full">
            {emoji}
          </span>
        </div>
        {hasConnector && <div className="w-px bg-border mt-2 flex-1 min-h-[1.5rem]" />}
      </div>
      <div className={cn('flex-1 min-w-0 pt-0.5', hasConnector && 'pb-3')}>
        <p className="text-sm leading-snug">{feedText(entry, currentUser?.id)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(entry.createdAt)}</p>
      </div>
    </div>
  )
}

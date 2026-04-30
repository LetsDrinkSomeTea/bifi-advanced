import { Link } from 'wouter'
import type { FeedEntry } from '../hooks/useFeed'
import { useAuth } from '../hooks/useAuth'
import { ACHIEVEMENTS } from '@shared/achievements'
import { formatRelative, cn } from '../lib/utils'

function Avatar({ user, size = 'sm' }: { user: { displayName: string; avatarUrl: string | null }; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={cn('rounded-full bg-muted flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden', dim)}>
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

type Actor = { id: string; displayName: string; avatarUrl: string | null }
type TargetUser = { id: string; displayName: string; avatarUrl: string | null } | null

function Actor({ user, currentUserId }: { user: Actor; currentUserId: string | undefined }) {
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

function feedText(
  entry: FeedEntry,
  currentUserId: string | undefined,
): React.ReactNode {
  const { type, user, targetUser, metadata } = entry
  const isMe = !!currentUserId && user.id === currentUserId

  switch (type) {
    case 'purchase': {
      const items = metadata?.items as { name: string; variantName: string; count: number }[] | undefined
      const itemStr = items?.map((i) => `${i.count}× ${i.variantName ?? i.name}`).join(', ') ?? 'etwas'
      return isMe
        ? <>Du hast {itemStr} gekauft</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat {itemStr} gekauft</>
    }
    case 'achievement': {
      const key = metadata?.key as string | undefined
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
    case 'nudge': {
      const message = metadata?.message as string | undefined
      return isMe
        ? <>Du hast {targetName(targetUser, currentUserId, true)} angestupst: <span className="italic">„{message}"</span></>
        : <><Actor user={user} currentUserId={currentUserId} /> hat {targetName(targetUser, currentUserId, true)} angestupst: <span className="italic">„{message}"</span></>
    }
    case 'prost_sent': {
      return isMe
        ? <>Du hast {targetName(targetUser, currentUserId, true)} einen Prost geschickt 🍺</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat {targetName(targetUser, currentUserId, true)} einen Prost geschickt 🍺</>
    }
    case 'prost_received': {
      return isMe
        ? <>Du hast einen Prost von {targetName(targetUser, currentUserId, false)} erhalten 🍺</>
        : <><Actor user={user} currentUserId={currentUserId} /> hat einen Prost von {targetName(targetUser, currentUserId, false)} erhalten 🍺</>
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

export function FeedItem({ entry }: { entry: FeedEntry }) {
  const { user: currentUser } = useAuth()

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-card">
      <Link href={`/profile/${entry.user.id}`}>
        <Avatar user={entry.user} />
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{feedText(entry, currentUser?.id)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(entry.createdAt)}</p>
      </div>
    </div>
  )
}

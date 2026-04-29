import { useParams } from 'wouter'
import { UserPlus, UserCheck, UserX, Clock } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { AchievementGrid } from '../components/AchievementGrid'
import { usePublicProfile } from '../hooks/useProfile'
import { useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend } from '../hooks/useFriends'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/utils'
import type { FriendshipStatus } from '@shared/types'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Mitglied',
}

const ROLE_STYLE: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  moderator: 'bg-orange-500/10 text-orange-500',
  member: 'bg-muted text-muted-foreground',
}

function FriendButton({ userId, status }: { userId: string; status: FriendshipStatus }) {
  const { mutate: send, isPending: sending } = useSendFriendRequest()
  const { mutate: accept, isPending: accepting } = useAcceptFriendRequest()
  const { mutate: remove, isPending: removing } = useRemoveFriend()

  if (status === 'friends') {
    return (
      <button
        onClick={() => remove(userId)}
        disabled={removing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
      >
        <UserCheck size={15} />
        Freunde
      </button>
    )
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={() => remove(userId)}
        disabled={removing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground transition-colors disabled:opacity-50"
        title="Anfrage zurückziehen"
      >
        <Clock size={15} />
        Anfrage gesendet
      </button>
    )
  }

  if (status === 'pending_received') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => accept(userId)}
          disabled={accepting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <UserCheck size={15} />
          Annehmen
        </button>
        <button
          onClick={() => remove(userId)}
          disabled={removing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
        >
          <UserX size={15} />
          Ablehnen
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => send(userId)}
      disabled={sending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      <UserPlus size={15} />
      Freund hinzufügen
    </button>
  )
}

export function ProfileDetail() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const { data: profile, isLoading } = usePublicProfile(userId)

  if (isLoading) {
    return (
      <Layout>
        <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
          Nutzer nicht gefunden
        </div>
      </Layout>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold overflow-hidden flex-shrink-0">
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span>{profile.displayName[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile.displayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_STYLE[profile.role])}>
                {ROLE_LABEL[profile.role]}
              </span>
            </div>
          </div>
          {!isOwnProfile && profile.friendshipStatus && (
            <FriendButton userId={profile.id} status={profile.friendshipStatus} />
          )}
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Statistiken</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Käufe" value={String(profile.stats.purchaseCount)} />
            <StatCard
              label="Rang"
              value={profile.stats.leaderboardRank != null ? `#${profile.stats.leaderboardRank}` : '–'}
            />
            <StatCard
              label="Lieblingsprodukt"
              value={profile.stats.favoriteProduct?.name ?? '–'}
              small
            />
          </div>
        </div>

        {/* Achievements */}
        <AchievementGrid unlocked={profile.achievements} />
      </div>
    </Layout>
  )
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('font-bold leading-tight', small ? 'text-sm' : 'text-xl')}>{value}</p>
    </div>
  )
}

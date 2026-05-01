import { useMemo, useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Modal } from '../components/Modal'
import { AchievementGrid } from '@/components/AchievementGrid'
import { ActivityItem, type ActivityUser, ProfileLink } from '../components/ActivityItem'
import { useAuth } from '../hooks/useAuth'
import { usePublicProfile, useUpdateProfile } from '../hooks/useProfile'
import { ProstVoucher, useProstVouchers } from '../hooks/useProst'
import { formatCents, balanceColor, cn } from '../lib/utils'

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

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditProfileModal({ open, onClose, hasSso }: { open: boolean; onClose: () => void; hasSso: boolean }) {
  const { user } = useAuth()
  const { mutate: update, isPending } = useUpdateProfile()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [error, setError] = useState('')

  const canEditName = !hasSso

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body: { displayName?: string; username?: string | null; avatarUrl?: string | null } = {
      avatarUrl: avatarUrl.trim() || null,
    }
    if (canEditName) {
      body.displayName = displayName.trim() || undefined
      body.username = username.trim() || null
    }
    update(body, {
      onSuccess: onClose,
      onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Profil bearbeiten">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Profilbild-URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => { setAvatarUrl(e.target.value); setError('') }}
            placeholder="https://…"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {canEditName && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Anzeigename</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError('') }}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Benutzername (optional)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                placeholder="z.B. max_mustermann"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Speichern…' : 'Speichern'}
        </button>
      </form>
    </Modal>
  )
}


type StackedVoucher = ProstVoucher & { count: number }

// ─── Voucher Item ────────────────────────────────────────────────────────────────
function ProstVoucherItem({ voucher }: { voucher: StackedVoucher }) {
  const { data: profile, isLoading } = usePublicProfile(voucher.fromUserId)
  const donor: ActivityUser = {
    id: voucher.fromUserId,
    displayName: profile?.displayName ?? 'Unbekannt',
    avatarUrl: profile?.avatarUrl ?? null,
  }
  const drink = `${voucher.buyableName}${voucher.variantName ? ` ${voucher.variantName}` : ''}`
  const isStacked = voucher.count > 1

  return (
    <div className={cn('group relative', isStacked && 'mb-2 mr-2')}>
      {isStacked && (
        <>
          {/* Deepest layer */}
          <div className="pointer-events-none absolute inset-0 z-0 rounded-xl border border-border/50 bg-card translate-x-2 translate-y-2" />
          {/* Middle layer */}
          <div className="pointer-events-none absolute inset-0 z-0 rounded-xl border border-border/80 bg-card translate-x-1 translate-y-1" />
        </>
      )}
      <ActivityItem
        user={donor}
        icon="🍺"
        createdAt={voucher.createdAt}
        className='relative z-10 rounded-xl border border-border bg-background px-3 py-2 transition-transform duration-200'
      >
        <div className="flex-1 pr-1">
          <span className="font-medium">{drink}</span>
          {' ('}
          <span className="font-semibold text-green-500">
            +{formatCents(voucher.amount)}
          </span>
          ) von {isLoading ? (
            <span className="font-semibold">...</span>
          ) : (
            <ProfileLink user={donor} />
          )}
        </div>
        {/* Prominent, always-visible count badge */}
        {isStacked && (
          <span className="absolute -top-1.5 -right-1.5 z-20 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
            {voucher.count}x
          </span>
        )}
      </ActivityItem>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Profile() {
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading } = usePublicProfile(user?.id)
  const { data: vouchers } = useProstVouchers()
  const [editOpen, setEditOpen] = useState(false)
  const stackedVouchers = useMemo<StackedVoucher[]>(() => {
    if (!vouchers || vouchers.length === 0) return []

    const grouped = new Map<string, StackedVoucher>()
    for (const voucher of vouchers) {
      const key = `${voucher.fromUserId}::${voucher.variantId}::${voucher.amount}`
      const existing = grouped.get(key)
      if (existing) {
        existing.count += 1
        if (new Date(voucher.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.createdAt = voucher.createdAt
        }
      } else {
        grouped.set(key, { ...voucher, count: 1 })
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [vouchers])

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold overflow-hidden flex-shrink-0">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span>{user?.displayName[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl font-bold truncate">{user?.displayName}</h1>
            {user?.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {user?.role && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_STYLE[user.role])}>
                  {ROLE_LABEL[user.role]}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
            title="Profil bearbeiten"
          >
            <Pencil size={16} />
          </button>
        </div>

        {/* Balance */}
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Kontostand</p>
          <p className={cn('text-3xl font-bold tabular-nums', balanceColor(user?.balance ?? 0))}>
            {formatCents(user?.balance ?? 0)}
          </p>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Statistiken</h2>
          {profileLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Käufe" value={String(profile?.stats.purchaseCount ?? 0)} />
              <StatCard
                label="Rang"
                value={profile?.stats.leaderboardRank != null ? `#${profile.stats.leaderboardRank}` : '–'}
              />
              <StatCard
                label="Lieblingsprodukt"
                value={profile?.stats.favoriteProduct?.name ?? '–'}
                small
              />
            </div>
          )}
        </div>

        {/* Achievements */}
        <AchievementGrid
          achievements={profile?.achievements ?? []}
          limit={4}
          allLink="/achievements"
        />

        {/* Prost vouchers */}
        {stackedVouchers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Prost-Gutscheine 🍺
            </h2>
            <div className="rounded-2xl bg-card p-3 space-y-2">
              {stackedVouchers.map((v) => (
                <ProstVoucherItem key={`${v.fromUserId}-${v.variantId}-${v.amount}`} voucher={v} />
              ))}
            </div>
          </div>
        )}

      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} hasSso={profile?.hasSso ?? false} />
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

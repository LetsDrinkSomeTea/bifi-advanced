import { useState } from 'react'
import { Link } from 'wouter'
import { Medal, Lock } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../hooks/useAuth'
import { formatCents, cn } from '../lib/utils'

type LeaderboardType = 'total_spent' | 'total_purchases' | 'achievements' | 'prost_sent'
type LeaderboardPeriod = 'week' | 'month' | 'alltime'

const TYPE_LABELS: Record<LeaderboardType, string> = {
  total_spent: 'Ausgaben',
  total_purchases: 'Käufe',
  achievements: 'Achievements',
  prost_sent: 'Prost',
}

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  week: 'Woche',
  month: 'Monat',
  alltime: 'Gesamt',
}

function formatValue(type: LeaderboardType, value: number | null): string {
  if (value === null) return '––'
  if (type === 'total_spent') return formatCents(value)
  if (type === 'achievements') return `${value} 🏆`
  if (type === 'prost_sent') return `${value} 🥂`
  return String(value)
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl leading-none">🥇</span>
  if (rank === 2) return <span className="text-xl leading-none">🥈</span>
  if (rank === 3) return <span className="text-xl leading-none">🥉</span>
  return <span className="w-7 text-center text-sm font-semibold text-muted-foreground">{rank}</span>
}

export function Leaderboard() {
  const { user } = useAuth()
  const [type, setType] = useState<LeaderboardType>('total_spent')
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime')
  const { data, isLoading } = useLeaderboard(type, period)

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Medal size={20} className="text-primary" />
          <h1 className="text-xl font-bold">Bestenliste</h1>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(Object.keys(TYPE_LABELS) as LeaderboardType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                type === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Period pills */}
        <div className="flex gap-2">
          {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                period === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-2xl border border-border overflow-hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border last:border-0 animate-pulse">
                <div className="w-7 h-5 rounded bg-muted" />
                <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 h-4 rounded bg-muted" />
                <div className="w-16 h-4 rounded bg-muted" />
              </div>
            ))
          ) : !data || data.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Noch keine Einträge
            </div>
          ) : (
            data.map((entry) => {
              const isSelf = entry.userId === user?.id
              return (
                <Link key={entry.userId} href={isSelf ? '/profile' : `/profile/${entry.userId}`}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer',
                      isSelf ? 'bg-primary/5' : 'bg-card',
                    )}
                  >
                    <div className="w-7 flex items-center justify-center flex-shrink-0">
                      <RankMedal rank={entry.rank} />
                    </div>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                      {entry.avatarUrl
                        ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <span>{entry.displayName[0]?.toUpperCase()}</span>}
                    </div>
                    <span className={cn('flex-1 text-sm font-medium truncate', isSelf && 'text-primary')}>
                      {isSelf ? `${entry.displayName} (du)` : entry.displayName}
                    </span>
                    {entry.value === null ? (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Lock size={12} />
                        <span className="tabular-nums">––</span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold tabular-nums">
                        {formatValue(type, entry.value)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </Layout>
  )
}

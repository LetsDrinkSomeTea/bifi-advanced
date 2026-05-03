import { useState } from 'react';
import { Link } from 'wouter';
import { Lock, Medal, Trophy, Beer, Dices, ShoppingCart } from 'lucide-react';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuth } from '../../hooks/useAuth';
import { formatCents, cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

type LeaderboardType =
  | 'total_spent'
  | 'total_purchases'
  | 'achievements'
  | 'prost_sent'
  | 'jackpot_spins';
type LeaderboardPeriod = 'week' | 'month' | 'alltime';

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  week: 'Woche',
  month: 'Monat',
  alltime: 'Gesamt',
};

function formatValue(type: LeaderboardType, value: number): React.ReactNode {
  if (type === 'total_spent') return formatCents(value);

  let Icon = null;
  let color = '';
  if (type === 'achievements') {
    Icon = Trophy;
    color = 'text-yellow-500';
  } else if (type === 'prost_sent') {
    Icon = Beer;
    color = 'text-amber-500';
  } else if (type === 'jackpot_spins') {
    Icon = Dices;
    color = 'text-indigo-500';
  } else {
    Icon = ShoppingCart;
    color = 'text-blue-500'
  }

  return (
    <span className="flex items-center gap-1.5">
      {value}
      {<Icon size={14} className={color} />}
    </span>
  );
}

function RankMedal({ rank }: { rank: number }): React.JSX.Element {
  if (rank === 1) return <Medal size={16} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={16} className="text-slate-400" />;
  if (rank === 3) return <Medal size={16} className="text-amber-700" />;
  return (
    <span className="w-6 text-center text-sm font-semibold text-muted-foreground">{rank}</span>
  );
}

function LeaderboardSection({
  type,
  title,
  period,
  currentUserId,
}: {
  type: LeaderboardType;
  title: string;
  period: LeaderboardPeriod;
  currentUserId: string | undefined;
}): React.JSX.Element {
  const { data, isLoading } = useLeaderboard(type, period);
  const top3 = (data ?? []).slice(0, 3);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : top3.length === 0 ? (
        <div className="rounded-2xl border border-border px-4 py-4 text-sm text-muted-foreground text-center">
          Noch keine Einträge
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          {top3.map((entry) => {
            const isSelf = entry.userId === currentUserId;
            return (
              <Link key={entry.userId} href={isSelf ? '/profile' : `/profile/${entry.userId}`}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors',
                    isSelf ? 'bg-primary/5' : 'bg-card',
                  )}
                >
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    <RankMedal rank={entry.rank} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
                    {entry.avatarUrl !== null ? (
                      <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{entry.displayName[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <span
                    className={cn('flex-1 text-sm font-medium truncate', isSelf && 'text-primary')}
                  >
                    {isSelf ? `${entry.displayName} (du)` : entry.displayName}
                  </span>
                  {entry.value === null ? (
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Lock size={11} />
                      <span className="tabular-nums">––</span>
                    </span>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">
                      {formatValue(type, entry.value)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SocialLeaderboardContent(): React.JSX.Element {
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      {/* Period pills */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
          <Button
            key={p}
            onClick={() => {
              setPeriod(p);
            }}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              period === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      <LeaderboardSection
        type="total_spent"
        title="Ausgaben"
        period={period}
        currentUserId={user?.id}
      />
      <LeaderboardSection
        type="total_purchases"
        title="Käufe"
        period={period}
        currentUserId={user?.id}
      />
      <LeaderboardSection
        type="achievements"
        title="Achievements"
        period={period}
        currentUserId={user?.id}
      />
      <LeaderboardSection
        type="prost_sent"
        title="Prost gesendet"
        period={period}
        currentUserId={user?.id}
      />
      <LeaderboardSection
        type="jackpot_spins"
        title="Spins"
        period={period}
        currentUserId={user?.id}
      />
    </div>
  );
}

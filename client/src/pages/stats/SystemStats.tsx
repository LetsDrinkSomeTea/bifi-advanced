import { useState } from 'react';
import { TrendingUp, Users, Wallet, Dices, Tag } from 'lucide-react';
import { useSystemStats } from '../../hooks/useStats';
import { formatCents } from '../../lib/utils';
import { SectionHeader, StatTile } from '../../components/ui/Stats';
import { Button } from '../../components/ui/Button';

const PERIOD_LABELS: Record<string, string> = {
  week: 'Woche',
  month: 'Monat',
  alltime: 'Gesamt',
};

export function SystemStatsContent(): React.JSX.Element {
  const [period, setPeriod] = useState<'week' | 'month' | 'alltime'>('alltime');
  const { data: systemStats, isLoading: systemLoading } = useSystemStats(period);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6">
        {(Object.keys(PERIOD_LABELS) as ('week' | 'month' | 'alltime')[]).map((p) => (
          <Button
            key={p}
            onClick={() => {
              setPeriod(p);
            }}
            variant={period === p ? 'default' : 'secondary'}
            size="sm"
            className="rounded-full flex-shrink-0"
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {systemLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <section>
            <SectionHeader icon={<Users size={16} />} title="Community" />
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Mitglieder" value={String(systemStats?.totalUsers)} />
              <StatTile label="Gruppen" value={String(systemStats?.totalGroups)} />
              <StatTile label="Anstupser" value={String(systemStats?.totalNudges)} />
              <StatTile label="Gutscheine gesendet" value={String(systemStats?.allTimeProstSent)} />
            </div>
          </section>

          <section>
            <SectionHeader icon={<Wallet size={16} />} title="System-Finanzen" />
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Gesamtumsatz" value={formatCents(systemStats?.totalRevenue ?? 0)} />
              <StatTile
                label="Ø pro Transaktion"
                value={formatCents(systemStats?.avgTransactionAmount ?? 0)}
              />
              <StatTile
                label="Größter Einzelkauf"
                value={formatCents(systemStats?.biggestPurchase ?? 0)}
              />
              <StatTile
                label="Ø Umsatz / Mitglied"
                value={formatCents(systemStats?.avgRevenuePerMember ?? 0)}
              />
            </div>
          </section>

          <section>
            <SectionHeader icon={<TrendingUp size={16} />} title="Konsum Systemweit" />
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Käufe gesamt" value={String(systemStats?.totalTransactions)} />
              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                  Beliebtestes Item
                </p>
                <p className="text-sm font-bold truncate">
                  {systemStats?.mostPopularItem?.name ?? '–'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {systemStats?.mostPopularItem?.count ?? 0}x gekauft
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader icon={<Dices size={16} />} title="Globaler Jackpot" />
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Gesamte Spins" value={String(systemStats?.allTimeJackpotSpins)} />
              <StatTile
                label="Systemweite Bilanz"
                value={formatCents(systemStats?.systemJackpotBalance ?? 0)}
                valueClassName={
                  (systemStats?.systemJackpotBalance ?? 0) >= 0
                    ? 'text-confirm'
                    : 'text-destructive'
                }
              />
            </div>
          </section>

          {(systemStats?.totalDiscountedItems ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<Tag size={16} />} title="Rabatte Systemweit" />
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Rabattierte Artikel"
                  value={String(systemStats?.totalDiscountedItems ?? 0)}
                />
                <StatTile
                  label="Gespart systemweit"
                  value={formatCents(systemStats?.totalSystemSaved ?? 0)}
                  valueClassName="text-confirm"
                />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { TrendingUp, Wallet, Beer, Dices, Clock, Bell, Target, Tag } from 'lucide-react';
import { useUserStats } from '../../hooks/useStats';
import { formatCents } from '../../lib/utils';
import { SectionHeader, StatTile } from '../../components/ui/Stats';
import { Button } from '../../components/ui/Button';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
} from 'recharts';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const CATEGORY_COLORS: Record<string, string> = {
  alcoholic: 'var(--accent-600)',
  soft_drink: 'var(--primary-500)',
  food: 'var(--destructive-500)',
  snack: 'var(--confirm-500)',
  other: 'var(--text-600)',
};

const CATEGORY_LABELS: Record<string, string> = {
  alcoholic: 'Alkoholisch',
  soft_drink: 'Softdrinks',
  food: 'Speisen',
  snack: 'Snacks',
  other: 'Sonstiges',
};

const PERIOD_LABELS: Record<string, string> = {
  week: 'Woche',
  month: 'Monat',
  alltime: 'Gesamt',
};

export function PersonalStatsContent({
  targetId,
}: {
  targetId: string | undefined;
}): React.JSX.Element {
  const [period, setPeriod] = useState<'week' | 'month' | 'alltime'>('alltime');
  const { data: userStats, isLoading: userLoading } = useUserStats(targetId, period);

  const hourData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    count: userStats?.consumption?.hourCounts[i] ?? 0,
  }));

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

      {userLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Finances */}
          {userStats?.finances ? (
            <>
              <section>
                <SectionHeader icon={<Wallet size={16} />} title="Finanzen" />
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Gesamtausgaben"
                    value={formatCents(userStats.finances.totalSpent)}
                  />
                  <StatTile
                    label="Ø pro Monat"
                    value={formatCents(userStats.finances.avgPerMonth)}
                  />
                  <StatTile
                    label="Ø pro Kauf"
                    value={formatCents(userStats.finances.avgPerTransaction)}
                  />
                  <StatTile
                    label="Größter Kauf"
                    value={formatCents(userStats.finances.biggestPurchase)}
                  />
                  <StatTile
                    label="Guthaben aktuell"
                    value={formatCents(userStats.finances.currentBalance)}
                    className="col-span-2"
                  />
                </div>
              </section>

              {userStats.finances.discountedItemCount > 0 && (
                <section>
                  <SectionHeader icon={<Tag size={16} />} title="Rabatte" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile
                      label="Rabattierte Artikel"
                      value={String(userStats.finances.discountedItemCount)}
                    />
                    <StatTile
                      label="Gespart gesamt"
                      value={formatCents(userStats.finances.totalSaved)}
                      valueClassName="text-confirm"
                    />
                  </div>
                </section>
              )}
            </>
          ) : null}

          {/* Consumption */}
          {userStats?.consumption ? (
            <section className="space-y-4">
              <SectionHeader icon={<TrendingUp size={16} />} title="Konsum" />
              {userStats.consumption.categories.length > 1 && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-4">
                    Kategorien
                  </p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={userStats.consumption.categories.map((c) => ({
                            name: CATEGORY_LABELS[c.category] ?? c.category,
                            value: c.count,
                            color: CATEGORY_COLORS[c.category] ?? 'var(--text-500)',
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {userStats.consumption.categories.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[entry.category] ?? 'var(--text-500)'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--background-100)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                          }}
                          itemStyle={{ color: 'var(--foreground)' }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {userStats.consumption.categories.map((c) => (
                      <div key={c.category} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[c.category] }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {CATEGORY_LABELS[c.category] ?? c.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-4">
                  Wochentage
                </p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart
                      data={WEEKDAYS.map((name, i) => ({
                        name,
                        count: userStats.consumption?.weekdayCounts[i + 1] ?? 0,
                      }))}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'var(--text-600)' }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'var(--background-200)' }}
                        contentStyle={{
                          backgroundColor: 'var(--background-100)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="count" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-4 flex items-center gap-2">
                  <Clock size={12} /> Uhrzeiten
                </p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={hourData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="hour"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 8, fill: 'var(--text-600)' }}
                        interval={3}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'var(--background-200)' }}
                        contentStyle={{
                          backgroundColor: 'var(--background-100)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="count" fill="var(--secondary-500)" radius={[2, 2, 0, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Käufe gesamt"
                  value={String(userStats.consumption.totalPurchases)}
                />
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">
                    Top Produkte
                  </p>
                  <div className="space-y-1.5">
                    {userStats.consumption.topItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="truncate mr-2">{item.name}</span>
                        <span className="font-bold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Social */}
          {userStats?.social ? (
            <section>
              <SectionHeader icon={<Beer size={16} />} title="Soziales" />
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Prost gegeben" value={String(userStats.social.prostSent)} />
                <StatTile label="Prost erhalten" value={String(userStats.social.prostReceived)} />
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                    Bester Kumpane
                  </p>
                  <p className="text-sm font-bold truncate">
                    {userStats.social.topRecipient?.displayName ?? '–'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {userStats.social.topRecipient?.count ?? 0}x Prost
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                    Größter Fan
                  </p>
                  <p className="text-sm font-bold truncate">
                    {userStats.social.topSender?.displayName ?? '–'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {userStats.social.topSender?.count ?? 0}x erhalten
                  </p>
                </div>
                <StatTile
                  label="Anstupser gesendet"
                  value={String(userStats.social.nudgeSent)}
                  icon={<Bell size={10} className="text-muted-foreground" />}
                />
                <StatTile
                  label="Anstupser erhalten"
                  value={String(userStats.social.nudgeReceived)}
                  icon={<Target size={10} className="text-muted-foreground" />}
                />
              </div>
            </section>
          ) : null}

          {/* Jackpot */}
          {userStats?.jackpot && userStats.jackpot.totalSpins > 0 ? (
            <section>
              <SectionHeader icon={<Dices size={16} />} title="Jackpot" />
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Versuche" value={String(userStats.jackpot.totalSpins)} />
                <StatTile
                  label="Ø Multiplikator"
                  value={`${userStats.jackpot.avgMultiplier.toFixed(2)}x`}
                />
                <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">
                      Glückspilz
                    </p>
                    <p className="text-lg font-bold text-confirm">{userStats.jackpot.wins}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">
                    <span className="block font-medium">0x gezahlt</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">
                      Pechvogel
                    </p>
                    <p className="text-lg font-bold text-destructive">{userStats.jackpot.losses}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">
                    <span className="block font-medium">2x gezahlt</span>
                  </div>
                </div>
                <StatTile
                  label="Persönliche Bilanz"
                  value={formatCents(userStats.jackpot.balance)}
                  className="col-span-2"
                  valueClassName={
                    userStats.jackpot.balance >= 0 ? 'text-confirm' : 'text-destructive'
                  }
                />
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

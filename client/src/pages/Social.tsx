import { useState, useEffect, useMemo } from 'react';
import { Link, useSearch, useLocation } from 'wouter';
import {
  Search,
  Users2,
  UserCheck,
  UserX,
  UserPlus,
  ChevronRight,
  Plus,
  Hash,
  Crown,
  X,
  Lock,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Modal } from '../components/Modal';
import { FeedTimeline } from '../components/FeedTimeline';
import { useGroups, useCreateGroup, useJoinGroup } from '../hooks/useGroups';
import {
  useFriends,
  useFriendRequests,
  useUserSearch,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriend,
} from '../hooks/useFriends';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useFeed } from '../hooks/useFeed';
import { useAuth } from '../hooks/useAuth';
import { formatCents, cn } from '../lib/utils';
import type { FeedEntry } from '@shared/types';
import { Button } from '@/components/ui/Button';

// ─── Modals ───────────────────────────────────────────────────────────────────

function CreateGroupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate: create, isPending } = useCreateGroup();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;
    create(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Neue Gruppe">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            maxLength={60}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Beschreibung <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Erstellen…' : 'Erstellen'}
        </button>
      </form>
    </Modal>
  );
}

function JoinGroupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [code, setCode] = useState('');
  const { mutate: join, isPending, error } = useJoinGroup();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!code.trim()) return;
    join(code.trim().toUpperCase(), {
      onSuccess: () => {
        setCode('');
        onClose();
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Gruppe beitreten">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Einladungscode</label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
            }}
            maxLength={8}
            placeholder="A1B2C3D4"
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error !== null ? <p className="text-sm text-destructive">{error.message}</p> : null}
        <button
          type="submit"
          disabled={isPending || code.length < 6}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Beitreten…' : 'Beitreten'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}): React.JSX.Element {
  return (
    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
      {avatarUrl !== null ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{displayName[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

// ─── Sozial tab sections ──────────────────────────────────────────────────────

function GroupsSection({
  onCreateOpen,
  onJoinOpen,
}: {
  onCreateOpen: () => void;
  onJoinOpen: () => void;
}): React.JSX.Element {
  const { data: groups, isLoading } = useGroups();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Gruppen
        </h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={onJoinOpen}
            variant="outline"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Hash size={15} />
            Code
          </Button>
          <Button
            onClick={onCreateOpen}
            variant="outline"
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={15} />
            Neu
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (groups?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground py-3">
          Noch keine Gruppen.{' '}
          <button onClick={onCreateOpen} className="text-primary hover:underline">
            Erstellen
          </button>{' '}
          oder{' '}
          <button onClick={onJoinOpen} className="text-primary hover:underline">
            beitreten
          </button>
          .
        </p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {groups?.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Users2 size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{g.name}</span>
                    {g.myRole === 'owner' ? (
                      <Crown size={11} className="text-amber-500 flex-shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{g.memberCount} Mitglieder</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendsSection(): React.JSX.Element {
  const { data: friends, isLoading } = useFriends();
  const { data: requests } = useFriendRequests();
  const { mutate: accept } = useAcceptFriendRequest();
  const { mutate: remove } = useRemoveFriend();

  const requestCount = requests?.length ?? 0;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Freunde
      </h2>

      {requestCount > 0 && requests ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Anfragen ({requestCount})</p>
          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                <Link href={`/profile/${r.id}`}>
                  <Avatar displayName={r.displayName} avatarUrl={r.avatarUrl} />
                </Link>
                <Link
                  href={`/profile/${r.id}`}
                  className="flex-1 min-w-0 text-sm font-medium truncate hover:underline"
                >
                  {r.displayName}
                </Link>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      accept(r.id);
                    }}
                    className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="Annehmen"
                  >
                    <UserCheck size={15} />
                  </button>
                  <button
                    onClick={() => {
                      remove(r.id);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Ablehnen"
                  >
                    <UserX size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (friends?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground py-3">
          Noch keine Freunde. Suche oben nach Personen.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {friends?.map((f) => (
            <Link key={f.id} href={`/profile/${f.id}`}>
              <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent transition-colors cursor-pointer">
                <Avatar displayName={f.displayName} avatarUrl={f.avatarUrl} />
                <span className="flex-1 min-w-0 text-sm font-medium truncate">{f.displayName}</span>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Search results ───────────────────────────────────────────────────────────

type SearchItem =
  | { kind: 'group'; id: string; name: string; memberCount: number }
  | { kind: 'friend' | 'new_person'; id: string; displayName: string; avatarUrl: string | null };

function SearchResults({
  query,
  groups,
  friends,
}: {
  query: string;
  groups: ReturnType<typeof useGroups>['data'];
  friends: ReturnType<typeof useFriends>['data'];
}): React.JSX.Element {
  const { data: userResults } = useUserSearch(query);
  const { mutate: sendRequest } = useSendFriendRequest();

  const friendIds = useMemo(() => new Set(friends?.map((f) => f.id) ?? []), [friends]);

  const items = useMemo<SearchItem[]>(() => {
    const q = query.toLowerCase();

    const groupItems: SearchItem[] = (groups ?? [])
      .filter((g) => g.name.toLowerCase().includes(q))
      .map((g) => ({ kind: 'group', id: g.id, name: g.name, memberCount: g.memberCount }));

    const friendItems: SearchItem[] = (friends ?? [])
      .filter((f) => f.displayName.toLowerCase().includes(q))
      .map((f) => ({
        kind: 'friend',
        id: f.id,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl,
      }));

    const newPeopleItems: SearchItem[] = (userResults ?? [])
      .filter((u) => !friendIds.has(u.id))
      .map((u) => ({
        kind: 'new_person',
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      }));

    return [...groupItems, ...friendItems, ...newPeopleItems];
  }, [query, groups, friends, userResults, friendIds]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Keine Ergebnisse für „{query}"
      </p>
    );
  }

  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
      {items.map((item) => {
        if (item.kind === 'group') {
          return (
            <Link key={`g-${item.id}`} href={`/groups/${item.id}`}>
              <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Users2 size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.memberCount} Mitglieder</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </div>
            </Link>
          );
        }

        return (
          <div
            key={`${item.kind}-${item.id}`}
            className="flex items-center gap-3 px-4 py-3 bg-card"
          >
            <Link href={`/profile/${item.id}`}>
              <Avatar displayName={item.displayName} avatarUrl={item.avatarUrl} />
            </Link>
            <Link href={`/profile/${item.id}`} className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {item.kind === 'friend' ? 'Freund' : 'Person'}
              </p>
            </Link>
            {item.kind === 'new_person' ? (
              <button
                onClick={() => {
                  sendRequest(item.id);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Freundschaft anfragen"
              >
                <UserPlus size={15} />
              </button>
            ) : null}
            <Link href={`/profile/${item.id}`}>
              <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ─── Leaderboard tab ──────────────────────────────────────────────────────────

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

function formatValue(type: LeaderboardType, value: number): string {
  if (type === 'total_spent') return formatCents(value);
  if (type === 'achievements') return `${value} 🏆`;
  if (type === 'prost_sent') return `${value} 🥂`;
  if (type === 'jackpot_spins') return `${value} 🎰`;
  return String(value);
}

function RankMedal({ rank }: { rank: number }): React.JSX.Element {
  if (rank === 1) return <span className="text-lg leading-none">🥇</span>;
  if (rank === 2) return <span className="text-lg leading-none">🥈</span>;
  if (rank === 3) return <span className="text-lg leading-none">🥉</span>;
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

function LeaderboardTab(): React.JSX.Element {
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      {/* Period pills */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
          <button
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
          </button>
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

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab(): React.JSX.Element {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();
  const entries: FeedEntry[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <FeedTimeline
      entries={entries}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      fetchNextPage={() => {
        void fetchNextPage();
      }}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['social', 'leaderboard', 'activity'] as const;
type Tab = (typeof TABS)[number];

export function Social(): React.JSX.Element {
  const search = useSearch();
  const [, navigate] = useLocation();

  const initialTab: Tab = (() => {
    const t = new URLSearchParams(search).get('tab');
    return TABS.includes(t as Tab) ? (t as Tab) : 'social';
  })();

  const [tab, setTab] = useState<Tab>(initialTab);

  const changeTab = (newTab: Tab): void => {
    setTab(newTab);
    navigate(newTab === 'social' ? '/social' : `/social?tab=${newTab}`, { replace: true });
  };
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const { data: groups } = useGroups();
  const { data: friends } = useFriends();

  useEffect(() => {
    if (tab !== 'social') return;
    const t = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      clearTimeout(t);
    };
  }, [query, tab]);

  const isSearching = debouncedQuery.length >= 2;

  const currentGroups = groups ?? [];
  const currentFriends = friends ?? [];

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(
            [
              ['social', 'Sozial'],
              ['activity', 'Aktivität'],
              ['leaderboard', 'Rangliste'],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                changeTab(value);
              }}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'social' ? (
          <div className="space-y-5">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                placeholder="Gruppen und Personen suchen…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {query !== '' ? (
                <button
                  onClick={() => {
                    setQuery('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {isSearching ? (
              <SearchResults
                query={debouncedQuery}
                groups={currentGroups}
                friends={currentFriends}
              />
            ) : (
              <>
                <GroupsSection
                  onCreateOpen={() => {
                    setCreateOpen(true);
                  }}
                  onJoinOpen={() => {
                    setJoinOpen(true);
                  }}
                />
                <FriendsSection />
              </>
            )}
          </div>
        ) : tab === 'activity' ? (
          <ActivityTab />
        ) : (
          <LeaderboardTab />
        )}
      </div>

      <CreateGroupModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
      />
      <JoinGroupModal
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
        }}
      />
    </Layout>
  );
}

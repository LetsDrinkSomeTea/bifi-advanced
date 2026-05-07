import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import {
  Search,
  UserCheck,
  UserX,
  UserPlus,
  ChevronRight,
  Plus,
  Hash,
  Crown,
  Clock,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/ui/Input';
import { useGroups, useCreateGroup, useJoinGroup } from '../../hooks/useGroups';
import {
  useFriends,
  useFriendRequests,
  useSentFriendRequests,
  useUserSearch,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriend,
} from '../../hooks/useFriends';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { SectionHeader } from '../../components/ui/SectionHeader';

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
          <Input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            maxLength={60}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Beschreibung <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            maxLength={200}
          />
        </div>
        <Button type="submit" disabled={isPending || !name.trim()} className="w-full">
          {isPending ? 'Erstellen…' : 'Erstellen'}
        </Button>
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
          <Input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
            }}
            maxLength={8}
            placeholder="A1B2C3D4"
            autoFocus
            className="font-mono uppercase tracking-widest"
          />
        </div>
        {error !== null ? <p className="text-sm text-destructive-strong">{error.message}</p> : null}
        <Button type="submit" disabled={isPending || code.length < 6} className="w-full">
          {isPending ? 'Beitreten…' : 'Beitreten'}
        </Button>
      </form>
    </Modal>
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
      <SectionHeader
        rightElement={
          <div className="flex items-center gap-2">
            <Button
              onClick={onJoinOpen}
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5 rounded-lg"
            >
              <Hash size={14} />
              Code
            </Button>
            <Button
              onClick={onCreateOpen}
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5 rounded-lg"
            >
              <Plus size={14} />
              Neu
            </Button>
          </div>
        }
      >
        Gruppen
      </SectionHeader>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (groups?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground py-3">
          Noch keine Gruppen.{' '}
          <Button onClick={onCreateOpen} variant="link">
            Erstellen
          </Button>{' '}
          oder{' '}
          <Button onClick={onJoinOpen} variant="link">
            beitreten
          </Button>
          .
        </p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {groups?.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent-soft transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {g.imageUrl ? (
                    <img src={g.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold">{g.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{g.name}</span>
                    {g.myRole === 'owner' ? (
                      <Crown size={11} className="text-accent-strong flex-shrink-0" />
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
      <SectionHeader>Freunde</SectionHeader>

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
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="primary-soft"
                    onClick={() => {
                      accept(r.id);
                    }}
                    className="h-8 w-8 rounded-lg"
                    title="Annehmen"
                  >
                    <UserCheck size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive-soft"
                    onClick={() => {
                      remove(r.id);
                    }}
                    className="h-8 w-8 rounded-lg"
                    title="Ablehnen"
                  >
                    <UserX size={16} />
                  </Button>
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
              <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent-soft transition-colors cursor-pointer">
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
  | { kind: 'group'; id: string; name: string; memberCount: number; imageUrl: string | null }
  | {
      kind: 'friend' | 'new_person' | 'pending_sent' | 'pending_received';
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };

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
  const { data: incomingRequests } = useFriendRequests();
  const { data: sentRequests } = useSentFriendRequests();
  const {
    mutate: sendRequest,
    isPending: isSending,
    variables: sendingToId,
  } = useSendFriendRequest();
  const { mutate: accept } = useAcceptFriendRequest();
  const { mutate: remove } = useRemoveFriend();

  const [optimisticSentIds, setOptimisticSentIds] = useState<Set<string>>(new Set());

  const friendIds = useMemo(() => new Set(friends?.map((f) => f.id) ?? []), [friends]);
  const incomingIds = useMemo(
    () => new Set(incomingRequests?.map((r) => r.id) ?? []),
    [incomingRequests],
  );
  const sentIds = useMemo(
    () => new Set([...(sentRequests?.map((r) => r.id) ?? []), ...optimisticSentIds]),
    [sentRequests, optimisticSentIds],
  );

  const items = useMemo<SearchItem[]>(() => {
    const q = query.toLowerCase();

    const groupItems: SearchItem[] = (groups ?? [])
      .filter((g) => g.name.toLowerCase().includes(q))
      .map((g) => ({
        kind: 'group',
        id: g.id,
        name: g.name,
        memberCount: g.memberCount,
        imageUrl: g.imageUrl,
      }));

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
      .map((u) => {
        const kind: SearchItem['kind'] = incomingIds.has(u.id)
          ? 'pending_received'
          : sentIds.has(u.id)
            ? 'pending_sent'
            : 'new_person';
        return { kind, id: u.id, displayName: u.displayName, avatarUrl: u.avatarUrl };
      });

    return [...groupItems, ...friendItems, ...newPeopleItems];
  }, [query, groups, friends, userResults, friendIds, incomingIds, sentIds]);

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
              <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent-soft transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold">{item.name[0]?.toUpperCase()}</span>
                  )}
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

        const subtitleMap = {
          friend: 'Freund',
          new_person: 'Person',
          pending_sent: 'Anfrage gesendet',
          pending_received: 'Möchte befreundet sein',
        };

        const isThisSending = isSending && sendingToId === item.id;

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
              <p className="text-xs text-muted-foreground">{subtitleMap[item.kind]}</p>
            </Link>

            {item.kind === 'new_person' && (
              <Button
                variant="primary-soft"
                size="icon"
                onClick={() => {
                  sendRequest(item.id, {
                    onSuccess: () => {
                      setOptimisticSentIds((prev) => new Set([...prev, item.id]));
                    },
                  });
                }}
                disabled={isThisSending}
                className="h-8 w-8 rounded-lg flex-shrink-0"
                title="Freundschaft anfragen"
              >
                {isThisSending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <UserPlus size={15} />
                )}
              </Button>
            )}

            {item.kind === 'pending_sent' && (
              <Button
                variant="ghost"
                size="icon"
                disabled
                className="h-8 w-8 rounded-lg flex-shrink-0 text-muted-foreground"
                title="Anfrage gesendet"
              >
                <Clock size={15} />
              </Button>
            )}

            {item.kind === 'pending_received' && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="primary-soft"
                  size="icon"
                  onClick={() => {
                    accept(item.id);
                  }}
                  className="h-8 w-8 rounded-lg"
                  title="Annehmen"
                >
                  <UserCheck size={15} />
                </Button>
                <Button
                  variant="destructive-soft"
                  size="icon"
                  onClick={() => {
                    remove(item.id);
                  }}
                  className="h-8 w-8 rounded-lg"
                  title="Ablehnen"
                >
                  <UserX size={15} />
                </Button>
              </div>
            )}

            <Link href={`/profile/${item.id}`}>
              <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export function SocialMainContent(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const { data: groups } = useGroups();
  const { data: friends } = useFriends();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      clearTimeout(t);
    };
  }, [query]);

  const isSearching = debouncedQuery.length >= 2;

  const currentGroups = groups ?? [];
  const currentFriends = friends ?? [];

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative top-2 ml-2 mr-2">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          placeholder="Nutzer, Freunde oder Gruppen suchen…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl h-auto"
        />
      </div>

      {isSearching ? (
        <SearchResults query={debouncedQuery} groups={currentGroups} friends={currentFriends} />
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
    </div>
  );
}

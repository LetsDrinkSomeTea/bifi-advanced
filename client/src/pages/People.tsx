import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Search, UserPlus, UserCheck, UserX, Clock, ChevronRight } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { useUserSearch, useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend } from '../hooks/useFriends'
import { cn } from '../lib/utils'

function Avatar({ displayName, avatarUrl, size = 'md' }: {
  displayName: string
  avatarUrl: string | null
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={cn('rounded-full bg-muted flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden', dim)}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        : <span>{displayName[0]?.toUpperCase()}</span>}
    </div>
  )
}

function UserRow({ id, displayName, avatarUrl, right }: {
  id: string
  displayName: string
  avatarUrl: string | null
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Link href={`/profile/${id}`}>
        <Avatar displayName={displayName} avatarUrl={avatarUrl} />
      </Link>
      <Link href={`/profile/${id}`} className="flex-1 min-w-0 hover:underline">
        <p className="text-sm font-medium truncate">{displayName}</p>
      </Link>
      {right}
    </div>
  )
}

function SearchResults({ q }: { q: string }) {
  const { data, isLoading } = useUserSearch(q)
  const { mutate: send, isPending } = useSendFriendRequest()

  if (isLoading) {
    return (
      <div className="space-y-1 mt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse mx-4" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Keine Nutzer gefunden
      </p>
    )
  }

  return (
    <div className="mt-2 divide-y divide-border">
      {data.map((u) => (
        <UserRow
          key={u.id}
          id={u.id}
          displayName={u.displayName}
          avatarUrl={u.avatarUrl}
          right={
            <div className="flex items-center gap-1">
              <button
                onClick={() => send(u.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                title="Freundschaftsanfrage senden"
              >
                <UserPlus size={16} />
              </button>
              <Link href={`/profile/${u.id}`}>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            </div>
          }
        />
      ))}
    </div>
  )
}

function FriendRequests() {
  const { data: requests } = useFriendRequests()
  const { mutate: accept, isPending: accepting } = useAcceptFriendRequest()
  const { mutate: decline, isPending: declining } = useRemoveFriend()

  if (!requests || requests.length === 0) return null

  return (
    <section>
      <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Anfragen ({requests.length})
      </h2>
      <div className="divide-y divide-border">
        {requests.map((r) => (
          <UserRow
            key={r.id}
            id={r.id}
            displayName={r.displayName}
            avatarUrl={r.avatarUrl}
            right={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => accept(r.id)}
                  disabled={accepting}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                  title="Annehmen"
                >
                  <UserCheck size={16} />
                </button>
                <button
                  onClick={() => decline(r.id)}
                  disabled={declining}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title="Ablehnen"
                >
                  <UserX size={16} />
                </button>
              </div>
            }
          />
        ))}
      </div>
    </section>
  )
}

function FriendsList() {
  const { data: friends, isLoading } = useFriends()
  const { mutate: remove } = useRemoveFriend()

  if (isLoading) {
    return (
      <section>
        <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Freunde</h2>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse mx-4" />)}
        </div>
      </section>
    )
  }

  if (!friends || friends.length === 0) {
    return (
      <section>
        <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Freunde</h2>
        <div className="mx-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Noch keine Freunde — suche nach Nutzern oben
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Freunde ({friends.length})
      </h2>
      <div className="divide-y divide-border">
        {friends.map((f) => (
          <UserRow
            key={f.id}
            id={f.id}
            displayName={f.displayName}
            avatarUrl={f.avatarUrl}
            right={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => remove(f.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Freundschaft beenden"
                >
                  <UserX size={16} />
                </button>
                <Link href={`/profile/${f.id}`}>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              </div>
            }
          />
        ))}
      </div>
    </section>
  )
}

export function People() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')

  // Debounce search query by 300ms
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])

  const isSearching = q.length >= 2

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Personen</h1>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Nutzer suchen…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {isSearching ? (
          <SearchResults q={q} />
        ) : (
          <div className="space-y-5">
            <FriendRequests />
            <FriendsList />
          </div>
        )}
      </div>
    </Layout>
  )
}

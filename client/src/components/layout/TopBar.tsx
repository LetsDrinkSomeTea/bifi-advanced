import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'wouter'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications, useMarkRead, useMarkAllRead, useSSE } from '../../hooks/useNotifications'
import { formatCents, formatRelative, balanceColor, cn } from '../../lib/utils'

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { data: notifs } = useNotifications()
  const { mutate: markRead } = useMarkRead()
  const { mutate: markAll } = useMarkAllRead()

  const handleMarkRead = (id: string) => {
    markRead(id)
  }

  if (!notifs || notifs.length === 0) {
    return (
      <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
        Keine neuen Benachrichtigungen
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-semibold">Benachrichtigungen</span>
        <button
          onClick={() => { markAll(); onClose() }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Alle gelesen
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifs.map((n) => (
          <button
            key={n.id}
            onClick={() => handleMarkRead(n.id)}
            className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-0"
          >
            <p className="text-sm font-medium leading-snug">{n.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{formatRelative(n.createdAt)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export function TopBar() {
  const { user } = useAuth()
  const { unreadCount, setUnreadCount } = useSSE()
  const { data: notifs } = useNotifications()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync unread count from query cache
  useEffect(() => {
    if (notifs) setUnreadCount(notifs.length)
  }, [notifs, setUnreadCount])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <span className="font-bold text-base tracking-tight">🍺 BiFi</span>

      <div className="flex items-center gap-3">
        {user && (
          <span className={cn('text-sm font-semibold tabular-nums', balanceColor(user.balance))}>
            {formatCents(user.balance)}
          </span>
        )}

        {/* Notification bell */}
        <div ref={containerRef} className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="relative p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Benachrichtigungen"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <NotificationDropdown onClose={() => setDropdownOpen(false)} />
          )}
        </div>

        {/* Avatar → profile */}
        {user && (
          <Link href="/profile">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span>{user.displayName[0]?.toUpperCase()}</span>}
            </div>
          </Link>
        )}
      </div>
    </header>
  )
}

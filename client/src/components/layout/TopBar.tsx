import { Bell, LogOut } from 'lucide-react'
import { useAuth, useLogout } from '../../hooks/useAuth'
import { formatCents, balanceColor, cn } from '../../lib/utils'

export function TopBar() {
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <span className="font-bold text-base tracking-tight">🍺 BiFi</span>

      <div className="flex items-center gap-3">
        {user && (
          <span className={cn('text-sm font-semibold tabular-nums', balanceColor(user.balance))}>
            {formatCents(user.balance)}
          </span>
        )}

        {/* Notification bell — wired in Phase 4 */}
        <button
          className="relative p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Benachrichtigungen"
        >
          <Bell size={20} />
        </button>

        <button
          onClick={logout}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Abmelden"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  )
}

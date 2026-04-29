import { Home, ShoppingBag, Activity, User, Settings } from 'lucide-react'
import { useLocation, Link } from 'wouter'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/feed', label: 'Feed', icon: Activity },
  { href: '/profile', label: 'Profil', icon: User },
]

export function BottomNav() {
  const [location] = useLocation()
  const { isModerator } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around h-16 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? location === '/' : location.startsWith(href)
        return (
          <Link key={href} href={href} className={cn(
            'flex flex-col items-center gap-0.5 min-w-[44px] py-1 text-xs transition-colors',
            active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          )}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
            <span>{label}</span>
          </Link>
        )
      })}

      {isModerator && (
        <Link href="/admin" className={cn(
          'flex flex-col items-center gap-0.5 min-w-[44px] py-1 text-xs transition-colors',
          location.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}>
          <Settings size={22} strokeWidth={location.startsWith('/admin') ? 2.5 : 1.75} />
          <span>Admin</span>
        </Link>
      )}
    </nav>
  )
}

import { useEffect } from 'react';
import { Home, ShoppingBag, Users, User, Clock } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useFriendRequests } from '../../hooks/useFriends';
import { useNotifications, useSSE } from '../../hooks/useNotifications';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/social', label: 'Sozial', icon: Users },
  { href: '/verlauf', label: 'Verlauf', icon: Clock },
  { href: '/profile', label: 'Profil', icon: User },
];

const TABBED_SECTIONS = ['/social', '/verlauf'];

function rememberedHref(href: string): string {
  if (!TABBED_SECTIONS.includes(href)) return href;
  return sessionStorage.getItem(`lasttab:${href}`) ?? href;
}

export function BottomNav(): React.JSX.Element {
  const [location] = useLocation();
  const { data: requests } = useFriendRequests();
  useSSE(); // SSE-Verbindung aufrechterhalten
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.length ?? 0;
  const requestCount = requests?.length ?? 0;

  useEffect(() => {
    for (const section of TABBED_SECTIONS) {
      if (location.startsWith(section)) {
        sessionStorage.setItem(`lasttab:${section}`, location);
        return;
      }
    }
  }, [location]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around h-16 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? location === '/' : location.startsWith(href);
        const badge =
          href === '/social' && requestCount > 0
            ? requestCount
            : href === '/verlauf' && unreadCount > 0
              ? unreadCount
              : 0;
        return (
          <Link
            key={href}
            href={rememberedHref(href)}
            className={cn(
              'flex flex-col items-center gap-0.5 min-w-[44px] py-1 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

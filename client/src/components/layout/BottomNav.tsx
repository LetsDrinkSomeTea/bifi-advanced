import { Home, ShoppingBag, Users, User } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useFriendRequests } from '../../hooks/useFriends';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/social', label: 'Sozial', icon: Users },
  { href: '/profile', label: 'Profil', icon: User },
];

export function BottomNav(): React.JSX.Element {
  const [location] = useLocation();
  const { data: requests } = useFriendRequests();
  const requestCount = requests?.length ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around h-16 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? location === '/' : location.startsWith(href);
        const badge = href === '/social' && requestCount > 0 ? requestCount : 0;
        return (
          <Link
            key={href}
            href={href}
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

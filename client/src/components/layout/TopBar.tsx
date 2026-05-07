import { useEffect, useRef, useState } from 'react';
import { Bell, UserCircle, ShieldCheck, LogOut, Check, Beer } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth, useLogout } from '../../hooks/useAuth';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useSSE,
  type AppNotification,
} from '../../hooks/useNotifications';
import { formatCents, formatRelative, balanceColor, cn } from '../../lib/utils';
import { Button } from '../ui/Button';

function notificationHref(n: AppNotification): string | null {
  switch (n.type) {
    case 'achievement':
      return '/achievements';
    case 'friend_request':
      return n.relatedId ? `/profile/${n.relatedId}` : '/social';
    case 'deposit':
      return '/history';
    case 'balance_warning':
      return '/profile';
    default:
      return null;
  }
}

function NotificationDropdown({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { data: notifs } = useNotifications();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAll } = useMarkAllRead();
  const [, navigate] = useLocation();

  const handleNavigate = (n: AppNotification): void => {
    markRead(n.id);
    const href = notificationHref(n);
    if (href) {
      navigate(href);
      onClose();
    }
  };

  if (!notifs || notifs.length === 0) {
    return (
      <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
        Keine neuen Benachrichtigungen
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-semibold">Benachrichtigungen</span>
        <Button
          variant="link"
          onClick={() => {
            markAll();
            onClose();
          }}
          className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
        >
          Alle gelesen
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifs.map((n) => {
          const href = notificationHref(n);
          return (
            <div key={n.id} className="flex items-start border-b border-border last:border-0">
              <Button
                variant="ghost"
                onClick={() => {
                  handleNavigate(n);
                }}
                className={cn(
                  'flex-1 h-auto flex-col items-start px-4 py-3 min-w-0 rounded-none w-full font-normal',
                  href ? 'cursor-pointer' : 'cursor-default hover:bg-transparent',
                )}
              >
                <div className="text-sm font-medium leading-snug whitespace-normal text-left">
                  {n.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 whitespace-normal text-left">
                  {n.message}
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1 whitespace-normal text-left">
                  {formatRelative(n.createdAt)}
                </div>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  markRead(n.id);
                }}
                title="Als gelesen markieren"
                className="flex-shrink-0 h-8 w-8 text-muted-foreground m-2"
              >
                <Check size={14} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AvatarMenuDropdown({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { isModerator } = useAuth();
  const logout = useLogout();
  const [, navigate] = useLocation();

  const go = (path: string): void => {
    navigate(path);
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-border bg-popover shadow-xl ring-1 ring-border/60 z-50 overflow-hidden">
      <div className="py-1.5">
        <Button
          variant="ghost"
          onClick={() => {
            go('/profile');
          }}
          className="w-full flex items-center justify-start gap-3 px-4 py-2.5 text-sm font-medium rounded-none"
        >
          <UserCircle size={16} className="text-muted-foreground flex-shrink-0" />
          Profil
        </Button>
        {isModerator ? (
          <Button
            variant="ghost"
            onClick={() => {
              go('/admin/users');
            }}
            className="w-full flex items-center justify-start gap-3 px-4 py-2.5 text-sm font-medium rounded-none"
          >
            <ShieldCheck size={16} className="text-muted-foreground flex-shrink-0" />
            Admin
          </Button>
        ) : null}
      </div>
      <div className="border-t border-border" />
      <div className="py-1.5">
        <Button
          variant="ghost"
          onClick={() => {
            void logout();
            onClose();
          }}
          className="w-full flex items-center justify-start gap-3 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive rounded-none"
        >
          <LogOut size={16} className="flex-shrink-0" />
          Abmelden
        </Button>
      </div>
    </div>
  );
}

export function TopBar(): React.JSX.Element {
  const { user } = useAuth();
  const { unreadCount, setUnreadCount } = useSSE();
  const { data: notifs } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notifs) setUnreadCount(notifs.length);
  }, [notifs, setUnreadCount]);

  useEffect(() => {
    if (!notifOpen && !menuOpen) return;
    const handler = (e: MouseEvent): void => {
      if (notifOpen && !notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
      if (menuOpen && !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [notifOpen, menuOpen]);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <Beer className="w-5 h-5 text-primary" />
        <span className="font-bold text-base tracking-tight">BiFi</span>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <span
            title="Dein aktuelles Guthaben"
            className={cn('text-sm font-semibold tabular-nums', balanceColor(user.balance))}
          >
            {formatCents(user.balance)}
          </span>
        ) : null}

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setNotifOpen((o) => !o);
              setMenuOpen(false);
            }}
            className="relative h-8 w-8 text-muted-foreground"
            aria-label="Benachrichtigungen"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
          {notifOpen ? (
            <NotificationDropdown
              onClose={() => {
                setNotifOpen(false);
              }}
            />
          ) : null}
        </div>

        {/* Avatar menu */}
        {user ? (
          <div ref={menuRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setMenuOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-muted overflow-hidden hover:ring-2 hover:ring-primary transition-all flex-shrink-0 p-0"
              aria-label="Menü"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{user.displayName[0]?.toUpperCase()}</span>
              )}
            </Button>
            {menuOpen ? (
              <AvatarMenuDropdown
                onClose={() => {
                  setMenuOpen(false);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

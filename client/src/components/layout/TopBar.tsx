import { useEffect, useRef, useState } from 'react';
import { Bell, UserCircle, ShieldCheck, LogOut, Check } from 'lucide-react';
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
    case 'goal_reached':
      return '/feed';
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
        <button
          onClick={() => {
            markAll();
            onClose();
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Alle gelesen
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifs.map((n) => {
          const href = notificationHref(n);
          return (
            <div key={n.id} className="flex items-start border-b border-border last:border-0">
              <button
                onClick={() => {
                  handleNavigate(n);
                }}
                className={cn(
                  'flex-1 text-left px-4 py-3 hover:bg-accent transition-colors min-w-0',
                  href && 'cursor-pointer',
                  !href && 'cursor-default',
                )}
              >
                <p className="text-sm font-medium leading-snug">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatRelative(n.createdAt)}
                </p>
              </button>
              <button
                onClick={() => {
                  markRead(n.id);
                }}
                title="Als gelesen markieren"
                className="flex-shrink-0 p-3 pt-3.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Check size={14} />
              </button>
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
    <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-border bg-popover shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
      <div className="py-1.5">
        <button
          onClick={() => {
            go('/profile');
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          <UserCircle size={16} className="text-muted-foreground flex-shrink-0" />
          Profil
        </button>
        {isModerator ? (
          <button
            onClick={() => {
              go('/admin/users');
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <ShieldCheck size={16} className="text-muted-foreground flex-shrink-0" />
            Admin
          </button>
        ) : null}
      </div>
      <div className="border-t border-border" />
      <div className="py-1.5">
        <button
          onClick={() => {
            void logout();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut size={16} className="flex-shrink-0" />
          Abmelden
        </button>
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
      <span className="font-bold text-base tracking-tight">🍺 BiFi</span>

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
          <button
            onClick={() => {
              setNotifOpen((o) => !o);
              setMenuOpen(false);
            }}
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
            <button
              onClick={() => {
                setMenuOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer flex-shrink-0"
              aria-label="Menü"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{user.displayName[0]?.toUpperCase()}</span>
              )}
            </button>
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

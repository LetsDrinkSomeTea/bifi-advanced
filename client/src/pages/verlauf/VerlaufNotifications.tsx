import { Bell, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  type AppNotification,
} from '../../hooks/useNotifications';
import { formatRelative, cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

function notificationHref(n: AppNotification): string | null {
  switch (n.type) {
    case 'achievement':
      return '/achievements';
    case 'friend_request':
      return n.relatedId ? `/profile/${n.relatedId}` : '/social';
    case 'deposit':
      return '/verlauf/transaktionen';
    case 'balance_warning':
      return '/profile';
    default:
      return null;
  }
}

export function VerlaufNotifications(): React.JSX.Element {
  const { data: notifs, isLoading } = useNotifications();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAll } = useMarkAllRead();
  const [, navigate] = useLocation();

  const handleNavigate = (n: AppNotification): void => {
    markRead(n.id);
    const href = notificationHref(n);
    if (href) navigate(href);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!notifs || notifs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Bell size={36} className="text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">Keine neuen Benachrichtigungen</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end mb-2">
        <Button
          variant="link"
          onClick={() => {
            markAll();
          }}
          className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
        >
          Alle als gelesen markieren
        </Button>
      </div>
      <div className="rounded-2xl border border-border overflow-hidden">
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
                <div className="text-xs text-muted-foreground/60 mt-1">
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

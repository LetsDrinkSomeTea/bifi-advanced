import { Bell, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  useAllNotifications,
  useMarkRead,
  useMarkAllRead,
  type AppNotification,
} from '../../hooks/useNotifications';
import { notificationHref, notificationMeta } from '../../lib/notifications';
import { formatRelative, cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

interface NotifItemProps {
  n: AppNotification;
  onMarkRead?: () => void;
  onClick: () => void;
  dimmed?: boolean;
}

function NotifItem({ n, onMarkRead, onClick, dimmed }: NotifItemProps): React.JSX.Element {
  const meta = notificationMeta(n.type);
  const Icon = meta.icon;
  const href = notificationHref(n);

  return (
    <div className={cn('flex border-b border-border last:border-0', !dimmed && 'bg-primary/5')}>
      {/* Left 80%: content + navigation */}
      <div
        className={cn(
          'flex-[4] flex items-start gap-3 px-4 py-3 transition-colors min-w-0',
          href && !dimmed && 'hover:bg-primary/10 cursor-pointer',
          dimmed && 'opacity-60',
        )}
        onClick={href ? onClick : undefined}
      >
        <div
          className={cn(
            'mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
            meta.bg,
          )}
        >
          <Icon size={16} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{n.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">{formatRelative(n.createdAt)}</p>
        </div>
      </div>

      {/* Right 20%: mark-as-read button spanning full height */}
      {onMarkRead ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
          title="Als gelesen markieren"
          className="flex-[1] flex items-center justify-center self-stretch border-l border-border/50 text-muted-foreground hover:bg-primary/5 hover:text-confirm-strong transition-colors"
        >
          <Check size={18} />
        </button>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}

export function VerlaufNotifications(): React.JSX.Element {
  const { data: notifs, isLoading } = useAllNotifications();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAll } = useMarkAllRead();
  const [, navigate] = useLocation();

  const handleNavigate = (n: AppNotification): void => {
    if (!n.readAt) markRead(n.id);
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

  const unread = notifs?.filter((n) => !n.readAt) ?? [];
  const read = notifs?.filter((n) => !!n.readAt) ?? [];

  if (unread.length === 0 && read.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        <Bell className="mx-auto mb-2 opacity-20" size={32} />
        <p className="text-sm">Noch keine Benachrichtigungen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Neue / Ungelesene */}
      <section>
        <SectionHeader
          title="Neu"
          action={
            unread.length > 0 ? (
              <Button
                variant="link"
                onClick={() => {
                  markAll();
                }}
                className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
              >
                Alle als gelesen markieren
              </Button>
            ) : undefined
          }
        />
        {unread.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine neuen Benachrichtigungen
          </p>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            {unread.map((n) => (
              <NotifItem
                key={n.id}
                n={n}
                onMarkRead={() => {
                  markRead(n.id);
                }}
                onClick={() => {
                  handleNavigate(n);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Gelesene */}
      {read.length > 0 && (
        <section>
          <SectionHeader title="Gelesen" />
          <div className="rounded-2xl border border-border overflow-hidden">
            {read.map((n) => (
              <NotifItem
                key={n.id}
                n={n}
                onClick={() => {
                  handleNavigate(n);
                }}
                dimmed
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

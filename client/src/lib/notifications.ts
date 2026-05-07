import {
  Trophy,
  UserPlus,
  ArrowDownCircle,
  AlertTriangle,
  Info,
  Beer,
  type LucideIcon,
} from 'lucide-react';
import { type NotificationType } from '@shared/types';
import { type AppNotification } from '../hooks/useNotifications';

export interface NotifMeta {
  icon: LucideIcon;
  color: string;
  bg: string;
}

export function notificationMeta(type: NotificationType): NotifMeta {
  switch (type) {
    case 'achievement':
      return { icon: Trophy, color: 'text-accent-strong', bg: 'bg-accent-soft' };
    case 'friend_request':
      return { icon: UserPlus, color: 'text-primary', bg: 'bg-primary/10' };
    case 'deposit':
      return { icon: ArrowDownCircle, color: 'text-confirm-strong', bg: 'bg-confirm-soft' };
    case 'balance_warning':
      return { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' };
    case 'prost':
      return { icon: Beer, color: 'text-accent-strong', bg: 'bg-accent-soft' };
    case 'nudge':
    case 'system':
    default:
      return { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' };
  }
}

export function notificationHref(n: AppNotification): string | null {
  switch (n.type) {
    case 'achievement':
      return '/achievements';
    case 'friend_request':
      return n.relatedId ? `/profile/${n.relatedId}` : '/social';
    case 'deposit':
      return '/verlauf/transaktionen';
    case 'balance_warning':
      return '/profile';
    case 'prost':
      return n.relatedId ? `/profile/${n.relatedId}` : null;
    case 'nudge':
      return n.relatedId ? `/profile/${n.relatedId}` : null;
    default:
      return null;
  }
}

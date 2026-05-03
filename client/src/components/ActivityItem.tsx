import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { cn, formatTimestamp } from '../lib/utils';
import { Avatar } from './ui/Avatar';

export interface ActivityUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export function ProfileLink({
  user,
  className,
}: {
  user: Pick<ActivityUser, 'id' | 'displayName'>;
  className?: string;
}): React.JSX.Element {
  return (
    <Link href={`/profile/${user.id}`} className={cn('font-semibold hover:underline', className)}>
      {user.displayName}
    </Link>
  );
}

interface ActivityItemProps {
  user: ActivityUser;
  icon?: ReactNode;
  hasConnector?: boolean;
  createdAt: string;
  children: ReactNode;
  className?: string;
}

export function ActivityItem({
  user,
  icon,
  hasConnector = false,
  createdAt,
  children,
  className,
}: ActivityItemProps): React.JSX.Element {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="relative">
          <Link href={`/profile/${user.id}`}>
            <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
          </Link>
          {icon ? (
            <span className="absolute -bottom-1 -right-1 text-[11px] leading-none select-none bg-background rounded-full">
              {icon}
            </span>
          ) : null}
        </div>
        {hasConnector ? <div className="w-px bg-border mt-2 flex-1 min-h-[1.5rem]" /> : null}
      </div>
      <div className={cn('flex-1 min-w-0 pt-0.5', hasConnector && 'pb-3')}>
        <div className="text-sm leading-snug">{children}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(createdAt)}</div>
      </div>
    </div>
  );
}

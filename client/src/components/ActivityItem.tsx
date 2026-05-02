import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { cn, formatTimestamp } from '../lib/utils';

export interface ActivityUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<ActivityUser, 'displayName' | 'avatarUrl'>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0',
        className,
      )}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{user.displayName[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

export function ProfileLink({
  user,
  className,
}: {
  user: Pick<ActivityUser, 'id' | 'displayName'>;
  className?: string;
}) {
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
}: ActivityItemProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="relative">
          <Link href={`/profile/${user.id}`}>
            <UserAvatar user={user} />
          </Link>
          {icon && (
            <span className="absolute -bottom-1 -right-1 text-[11px] leading-none select-none bg-background rounded-full">
              {icon}
            </span>
          )}
        </div>
        {hasConnector && <div className="w-px bg-border mt-2 flex-1 min-h-[1.5rem]" />}
      </div>
      <div className={cn('flex-1 min-w-0 pt-0.5', hasConnector && 'pb-3')}>
        <p className="text-sm leading-snug">{children}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(createdAt)}</p>
      </div>
    </div>
  );
}

import { cn } from '../../lib/utils';

interface AvatarProps {
  displayName: string;
  avatarUrl: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({
  displayName,
  avatarUrl,
  className,
  fallbackClassName,
  size = 'md',
}: AvatarProps): React.JSX.Element {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-muted flex items-center justify-center font-semibold overflow-hidden flex-shrink-0',
        sizeClasses[size],
        className,
      )}
    >
      {avatarUrl !== null ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className={fallbackClassName}>{displayName[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

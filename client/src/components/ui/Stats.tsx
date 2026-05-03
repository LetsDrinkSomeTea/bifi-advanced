import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  className?: string;
}

export function SectionHeader({ icon, title, className }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 mb-3 text-muted-foreground', className)}>
      {icon}
      <h2 className="text-xs font-bold uppercase tracking-widest">{title}</h2>
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function StatTile({
  label,
  value,
  valueClassName,
  className,
  icon,
}: StatTileProps): React.JSX.Element {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-3', className)}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
        {icon}
      </div>
      <p className={cn('text-lg font-bold tabular-nums', valueClassName)}>{value}</p>
    </div>
  );
}

import * as React from 'react';
import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
  rightElement?: React.ReactNode;
}

export function SectionHeader({
  children,
  className,
  rightElement,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {children}
      </h2>
      {rightElement}
    </div>
  );
}

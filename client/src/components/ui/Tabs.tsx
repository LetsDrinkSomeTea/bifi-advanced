import * as React from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Link } from 'wouter';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  href: string;
  badge?: number;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  className?: string;
}

export function Tabs({ items, activeId, className }: TabsProps): React.JSX.Element {
  return (
    <div className={cn('flex gap-1 bg-muted rounded-xl p-1', className)}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-sm font-medium transition-all relative flex items-center justify-center gap-1',
              isActive
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {(item.badge ?? 0) > 0 && (
              <span className="min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                {(item.badge ?? 0) > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

interface TabContentProps {
  children: React.ReactNode;
  activeId: string;
  items: TabItem[];
  onTabChange: (id: string) => void;
  dir?: number; // 1 for right, -1 for left
}

export function TabContent({
  children,
  activeId,
  items,
  onTabChange,
}: TabContentProps): React.JSX.Element {
  const currentIndex = items.findIndex((item) => item.id === activeId);

  const handleDragEnd = (_: unknown, info: PanInfo): void => {
    if (info.offset.x < -50 && currentIndex < items.length - 1) {
      const nextTab = items[currentIndex + 1];
      if (nextTab) onTabChange(nextTab.id);
    } else if (info.offset.x > 50 && currentIndex > 0) {
      const prevTab = items[currentIndex - 1];
      if (prevTab) onTabChange(prevTab.id);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeId}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          whileDrag={{ cursor: 'grabbing' }}
          className="w-full touch-pan-y active:cursor-grabbing"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

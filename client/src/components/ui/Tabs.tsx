import * as React from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
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
}

const tabVariants = {
  initial: (dir: number) => ({ x: `${dir * 100}%` }),
  animate: { x: '0%' },
  exit: (dir: number) => ({ x: `${dir * -100}%` }),
};

export function TabContent({ children, activeId, items, onTabChange }: TabContentProps): React.JSX.Element {
  const [prevId, setPrevId] = React.useState(activeId);
  const [animDir, setAnimDir] = React.useState(0);

  if (prevId !== activeId) {
    const prevIdx = items.findIndex((i) => i.id === prevId);
    const currIdx = items.findIndex((i) => i.id === activeId);
    setAnimDir(currIdx > prevIdx ? 1 : -1);
    setPrevId(activeId);
  }

  const currentIndex = items.findIndex((i) => i.id === activeId);

  const handlePanEnd = (_: unknown, info: PanInfo): void => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) <= Math.abs(offset.y) * 1.5) return;
    if (Math.abs(offset.x) < 50 && Math.abs(velocity.x) < 300) return;
    const nextItem = offset.x < 0 ? items[currentIndex + 1] : items[currentIndex - 1];
    if (nextItem) onTabChange(nextItem.id);
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false} custom={animDir}>
        <motion.div
          key={activeId}
          custom={animDir}
          variants={tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          onPanEnd={handlePanEnd}
          className="w-full min-h-[60vh] touch-pan-y"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

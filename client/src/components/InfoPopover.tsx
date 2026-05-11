import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

interface InfoPopoverProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: PopoverSide;
}

const PANEL_POSITION: Record<PopoverSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const Y_OFFSET: Record<PopoverSide, number> = {
  top: 4,
  bottom: -4,
  left: 0,
  right: 0,
};

export function InfoPopover({ content, children, side = 'top' }: InfoPopoverProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const yOffset = Y_OFFSET[side];

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen((v) => !v)}>{children}</div>
      <AnimatePresence>
        {open ? (
          <motion.div
            className={`absolute z-50 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border p-3 text-sm min-w-[160px] max-w-[240px] ${PANEL_POSITION[side]}`}
            initial={{ opacity: 0, scale: 0.92, y: yOffset }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: yOffset }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            {content}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

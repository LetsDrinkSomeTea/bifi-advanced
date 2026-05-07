import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useLocation } from 'wouter';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { PwaInstallBanner } from '../PwaInstallBanner';
import { DevBanner } from '../DevBanner';
import { useTabDirection } from '../../hooks/useTabDirection';

const TAB_HREFS = ['/', '/shop', '/verlauf', '/social', '/profile'];

function currentTabIndex(location: string): number {
  const exact = TAB_HREFS.indexOf(location);
  if (exact !== -1) return exact;
  return TAB_HREFS.findIndex((t) => t !== '/' && location.startsWith(t));
}

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props): React.JSX.Element {
  const [location, navigate] = useLocation();
  const direction = useTabDirection();

  const handlePanEnd = (_: unknown, info: PanInfo): void => {
    const { offset, velocity } = info;
    const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y) * 1.5;
    if (!isHorizontalSwipe) return;
    if (Math.abs(offset.x) < 60 && Math.abs(velocity.x) < 300) return;

    const idx = currentTabIndex(location);
    if (idx === -1) return;

    if (offset.x < 0 && idx < TAB_HREFS.length - 1) {
      const next = TAB_HREFS[idx + 1];
      if (next) navigate(next);
    } else if (offset.x > 0 && idx > 0) {
      const prev = TAB_HREFS[idx - 1];
      if (prev) navigate(prev);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <DevBanner />
      <PwaInstallBanner />
      <main className="flex-1 pb-16 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -32 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onPanEnd={handlePanEnd}
            className="w-full touch-pan-y"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}

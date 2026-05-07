import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Button } from './ui/Button';

export function PwaInstallBanner(): React.JSX.Element | null {
  const { canInstall, install, dismiss } = usePwaInstall();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-[57px] left-0 right-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium shadow-md"
        >
          <Download size={16} className="shrink-0" />
          <span className="flex-1">BiFi als App installieren</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void install();
            }}
            className="h-7 px-3 text-xs border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
          >
            Installieren
          </Button>
          <button
            onClick={dismiss}
            className="p-1 hover:opacity-70 transition-opacity"
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { X } from 'lucide-react';
import { useBottomSheet } from '../hooks/useBottomSheet';

interface InfoSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function InfoSheet({ open, onClose, title, children }: InfoSheetProps): React.JSX.Element | null {
  const { mounted, show, isDragging, dragY, handleClose, dragHandleProps, backdropOpacity } =
    useBottomSheet(open, onClose);

  if (!mounted) return null;

  const sheetTranslate = show ? `${dragY}px` : '100%';

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
        onClick={handleClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl"
        style={{
          transform: `translateY(${sheetTranslate})`,
          transition: isDragging ? 'none' : 'transform 300ms ease-out',
        }}
      >
        <div
          className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none"
          {...dragHandleProps}
        >
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        <div
          className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing touch-none"
          {...dragHandleProps}
        >
          <span className="font-semibold text-base select-none">{title}</span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 cursor-pointer"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[75vh] px-4 pb-6">{children}</div>
      </div>
    </>
  );
}

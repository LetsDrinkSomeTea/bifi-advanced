import { useState } from 'react';
import { HandCoins, X } from 'lucide-react';
import { TRANSFER_NOTE_MAX_LENGTH } from '@shared/schemas';
import { useSendTransfer } from '../hooks/useTransfer';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { ApiError } from '../lib/api';
import { cn, formatCents, parseEuroToCents } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

function errorMessage(error: Error): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INSUFFICIENT_BALANCE':
        return 'Nicht genug Guthaben für diese Überweisung.';
      case 'TRANSFERS_DISABLED':
        return 'Überweisungen sind deaktiviert.';
      case 'RATE_LIMITED':
        return 'Zu viele Überweisungen. Bitte warte kurz.';
      case 'NOT_FOUND':
        return 'Empfänger nicht gefunden.';
    }
  }
  return 'Fehler beim Senden. Bitte versuche es erneut.';
}

export function TransferSheet({
  open,
  toUserId,
  displayName,
  onClose,
}: {
  open: boolean;
  toUserId: string;
  displayName: string;
  onClose: () => void;
}): React.JSX.Element | null {
  const [euros, setEuros] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const { mutate: send, isPending, error, reset } = useSendTransfer();

  const close = (): void => {
    setEuros('');
    setNote('');
    setConfirming(false);
    reset();
    onClose();
  };
  const { mounted, show, isDragging, dragY, handleClose, dragHandleProps, backdropOpacity } =
    useBottomSheet(open, close);

  const cents = parseEuroToCents(euros);
  const amountValid = cents !== null && cents > 0;
  const trimmedNote = note.trim();

  if (!mounted) return null;

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
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out flex flex-col max-h-[90vh] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:rounded-3xl',
          show ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:scale-95 sm:opacity-0',
        )}
        style={isDragging ? { transform: `translateY(${dragY}px)`, transition: 'none' } : {}}
      >
        {/* Drag handle */}
        <div
          className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none shrink-0"
          {...dragHandleProps}
        >
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        <div
          className="flex items-center justify-between px-6 pt-3 pb-4 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          {...dragHandleProps}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-confirm-soft flex items-center justify-center text-confirm-strong">
              <HandCoins size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Geld an {displayName}</h2>
              <p className="text-xs text-muted-foreground mt-1">Guthaben überweisen</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="rounded-full h-10 w-10"
          >
            <X size={20} />
          </Button>
        </div>

        {confirming && amountValid ? (
          <div className="px-6 py-4 space-y-4">
            <div className="rounded-2xl border border-border p-4 text-center space-y-1">
              <p className="text-3xl font-bold tabular-nums">{formatCents(cents)}</p>
              <p className="text-sm text-muted-foreground">an {displayName}</p>
              {trimmedNote !== '' ? <p className="text-sm italic">„{trimmedNote}"</p> : null}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground text-center">
              Das Geld wird sofort von deinem Guthaben abgebucht. Du kannst die Überweisung 5
              Minuten lang im Verlauf stornieren.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isPending}
                onClick={() => {
                  setConfirming(false);
                  reset();
                }}
              >
                Zurück
              </Button>
              <Button
                className="flex-1"
                disabled={isPending}
                onClick={() => {
                  send(
                    { toUserId, amount: cents, note: trimmedNote || undefined },
                    { onSuccess: handleClose },
                  );
                }}
              >
                {isPending ? 'Senden…' : 'Jetzt senden'}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="px-6 py-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (amountValid) setConfirming(true);
            }}
          >
            <div>
              <label htmlFor="transfer-amount" className="block text-sm font-medium mb-1">
                Betrag (€)
              </label>
              <Input
                id="transfer-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={euros}
                onChange={(e) => {
                  setEuros(e.target.value);
                }}
                autoFocus
              />
              {euros !== '' && !amountValid ? (
                <p className="text-xs text-destructive-strong mt-1">Ungültiger Betrag</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="transfer-note" className="block text-sm font-medium mb-1">
                Verwendungszweck (optional)
              </label>
              <Input
                id="transfer-note"
                type="text"
                placeholder="z.B. Pizza"
                maxLength={TRANSFER_NOTE_MAX_LENGTH}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                }}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!amountValid}>
              Weiter
            </Button>
          </form>
        )}

        {error !== null ? (
          <div className="px-6 pb-4">
            <div className="p-3 rounded-xl bg-destructive-soft text-destructive-strong text-xs font-bold text-center">
              {errorMessage(error)}
            </div>
          </div>
        ) : null}

        <div className="px-6 pb-10 shrink-0" />
      </div>
    </>
  );
}

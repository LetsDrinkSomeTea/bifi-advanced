import { useState } from 'react';
import { Coins, CheckCircle2, History, Bell, ChevronDown } from 'lucide-react';
import { useSettlement, useSendReminder, useDeposit } from '../../hooks/useAdmin';
import { cn, formatCents } from '../../lib/utils';
import { Avatar } from '../../components/ui/Avatar';
import type { SettlementEntry } from '@shared/types';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

// ─── Local Deposit Modal ──────────────────────────────────────────────────────

function DepositModal({
  user,
  onClose,
}: {
  user: SettlementEntry | null;
  onClose: () => void;
}): React.JSX.Element {
  const [euros, setEuros] = useState('');
  const [note, setNote] = useState('Schuldenbegleichung');
  const [error, setError] = useState('');
  const { mutate: deposit, isPending } = useDeposit();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (user === null) return;

    const cents = Math.round(parseFloat(euros) * 100);
    if (isNaN(cents) || cents < 1) {
      setError('Ungültiger Betrag');
      return;
    }
    deposit(
      { userId: user.id, amount: cents, note: note || undefined },
      {
        onSuccess: onClose,
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Fehler');
        },
      },
    );
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Einzahlung – ${user?.displayName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Betrag (€)</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={euros}
            onChange={(e) => {
              setEuros(e.target.value);
              setError('');
            }}
            autoFocus
          />
          {user ? <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">
            Schuldenstand: {formatCents(user.balance)}
          </p> : null}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notiz (optional)</label>
          <Input
            type="text"
            placeholder="z.B. Bareinzahlung"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
        </div>
        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Verarbeiten…' : 'Bestätigen'}
        </Button>
      </form>
    </Modal>
  );
}

// ─── Main Content ──────────────────────────────────────────────────────────────

export function AdminSettlementContent(): React.JSX.Element {
  const { data: debts, isLoading } = useSettlement();
  const { mutate: sendReminder, isPending: isReminding } = useSendReminder();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [depositUser, setDepositUser] = useState<SettlementEntry | null>(null);
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});

  const handleRemind = (debt: SettlementEntry): void => {
    sendReminder(debt.id, {
      onSuccess: () => {
        setRemindedIds((prev) => ({ ...prev, [debt.id]: true }));
        setTimeout(() => {
          setRemindedIds((prev) => ({ ...prev, [debt.id]: false }));
        }, 2000);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Offene Schulden
        </h2>
        <div className="p-2 rounded-lg bg-muted text-muted-foreground">
          <History size={16} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (debts ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 text-green-500 opacity-40" size={32} />
          <p className="text-sm font-medium text-foreground">Alle Konten ausgeglichen!</p>
          <p className="text-xs mt-1">Es gibt aktuell keine negativen Kontostände.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {debts?.map((d) => {
            const isExpanded = expandedId === d.id;
            const isReminded = remindedIds[d.id];

            return (
              <div
                key={d.id}
                className={cn(
                  'rounded-2xl border transition-all overflow-hidden',
                  isExpanded ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : d.id);
                  }}
                >
                  <Avatar displayName={d.displayName} avatarUrl={d.avatarUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{d.displayName}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      {d.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-red-500 tabular-nums">
                      {formatCents(d.balance)}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={cn(
                      'text-muted-foreground transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                  />
                </div>

                {isExpanded ? (
                  <div className="px-4 pb-4 pt-2 border-t border-primary/10 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => {
                          setDepositUser(d);
                        }}
                        className="gap-2"
                      >
                        <Coins size={16} /> Einzahlen
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleRemind(d);
                        }}
                        disabled={isReminding || isReminded}
                        className={cn(
                          'gap-2 transition-all duration-300',
                          isReminded
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : 'border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700',
                        )}
                      >
                        {isReminded ? <CheckCircle2 size={16} /> : <Bell size={16} />}
                        {isReminded ? 'Erinnert!' : 'Erinnern'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <DepositModal
        user={depositUser}
        onClose={() => {
          setDepositUser(null);
        }}
      />
    </div>
  );
}

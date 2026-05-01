import { useState } from 'react'
import { Bell } from 'lucide-react'
import { AdminLayout } from './AdminLayout'
import { Modal } from '../../components/Modal'
import { useSettlement, useDeposit, useSendReminder } from '../../hooks/useAdmin'
import type { SettlementEntry } from '@shared/types'
import { formatCents, cn } from '../../lib/utils'

function DepositModal({ user, onClose }: { user: SettlementEntry | null; onClose: () => void }) {
  const [euros, setEuros] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const { mutate: deposit, isPending } = useDeposit()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cents = Math.round(parseFloat(euros) * 100)
    if (!cents || cents < 1) { setError('Ungültiger Betrag'); return }
    deposit(
      { userId: user!.id, amount: cents, note: note || undefined },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Fehler') },
    )
  }

  return (
    <Modal open={!!user} onClose={onClose} title={`Einzahlung – ${user?.displayName}`}>
      <p className="text-sm text-muted-foreground mb-4">
        Aktueller Kontostand: <span className="font-semibold text-red-500">{user ? formatCents(user.balance) : ''}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Betrag (€)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={euros}
            onChange={(e) => { setEuros(e.target.value); setError('') }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notiz (optional)</label>
          <input
            type="text"
            placeholder="z.B. Bareinzahlung"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Wird gebucht…' : 'Einzahlen'}
        </button>
      </form>
    </Modal>
  )
}

export function AdminSettlement() {
  const { data: debtors, isLoading } = useSettlement()
  const [depositTarget, setDepositTarget] = useState<SettlementEntry | null>(null)
  const { mutate: sendReminder, isPending: isReminding } = useSendReminder()
  const [lastNudgeId, setLastNudgeId] = useState<string | null>(null)

  const total = debtors?.reduce((sum, u) => sum + u.balance, 0) ?? 0

  const handleNudge = (userId: string) => {
    sendReminder(userId, {
      onSuccess: () => {
        setLastNudgeId(userId)
        setTimeout(() => setLastNudgeId(null), 3000)
      }
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-3">
        {!isLoading && debtors && debtors.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{debtors.length} Nutzer mit Schulden</span>
            <span className="font-bold text-red-500 text-sm tabular-nums">{formatCents(total)}</span>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}

        {!isLoading && (!debtors || debtors.length === 0) && (
          <p className="text-center text-muted-foreground text-sm py-12">
            Alle Konten sind ausgeglichen 🎉
          </p>
        )}

        {debtors?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
              {u.avatarUrl
                ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                : u.displayName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{u.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-bold text-sm text-red-500 tabular-nums mr-1">{formatCents(u.balance)}</span>
              <button
                onClick={() => handleNudge(u.id)}
                disabled={isReminding || lastNudgeId === u.id}
                className={cn(
                  "p-2 rounded-lg border transition-all",
                  lastNudgeId === u.id 
                    ? "bg-green-500/10 border-green-500/50 text-green-600" 
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title="Erinnerung senden"
              >
                <Bell size={15} className={lastNudgeId === u.id ? "fill-current" : ""} />
              </button>
              <button
                onClick={() => setDepositTarget(u)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-colors"
              >
                + €
              </button>
            </div>
          </div>
        ))}
      </div>

      <DepositModal user={depositTarget} onClose={() => setDepositTarget(null)} />
    </AdminLayout>
  )
}

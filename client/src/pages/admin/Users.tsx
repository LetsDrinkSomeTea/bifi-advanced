import { useState } from 'react'
import { KeyRound, Link2, Plus, UserCog } from 'lucide-react'
import { AdminLayout } from './AdminLayout'
import { Modal } from '../../components/Modal'
import { useAdminUsers, useCreateUser, useDeposit, useUpdateUser } from '../../hooks/useAdmin'
import type { AdminUser } from '@shared/types'
import { cn, formatCents } from '../../lib/utils'

// ─── Deposit Modal ────────────────────────────────────────────────────────────

function DepositModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
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

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const [role, setRole] = useState(user?.role ?? 'member')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [jackpotAllowed, setJackpotAllowed] = useState(user?.jackpotAllowed ?? false)
  const [error, setError] = useState('')
  const { mutate: update, isPending } = useUpdateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    update(
      { id: user!.id, role: role as AdminUser['role'], isActive, jackpotAllowed },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Fehler') },
    )
  }

  return (
    <Modal open={!!user} onClose={onClose} title={`Bearbeiten – ${user?.displayName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Rolle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="member">Member</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm">Account aktiv</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={jackpotAllowed} onChange={(e) => setJackpotAllowed(e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm">Jackpot erlaubt</span>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Speichern…' : 'Speichern'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '', role: 'member' })
  const [error, setError] = useState('')
  const { mutate: create, isPending } = useCreateUser()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create(
      { ...form, username: form.username || undefined },
      {
        onSuccess: () => { setForm({ email: '', username: '', displayName: '', password: '', role: 'member' }); onClose() },
        onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Neuer Nutzer">
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { key: 'displayName', label: 'Anzeigename', type: 'text', required: true },
          { key: 'email', label: 'E-Mail', type: 'email', required: true },
          { key: 'username', label: 'Benutzername (optional)', type: 'text', required: false },
          { key: 'password', label: 'Passwort (min. 8 Zeichen)', type: 'password', required: true },
        ].map(({ key, label, type, required }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type={type}
              required={required}
              value={form[key as keyof typeof form]}
              onChange={set(key as keyof typeof form)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium mb-1">Rolle</label>
          <select
            value={form.role}
            onChange={set('role')}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="member">Member</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Erstellen…' : 'Nutzer erstellen'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  moderator: 'bg-orange-500/10 text-orange-500',
  member: 'bg-muted text-muted-foreground',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers()
  const [depositTarget, setDepositTarget] = useState<AdminUser | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = (users ?? []).filter(
    (u) => !search || u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <AdminLayout>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus size={15} />
            Neu
          </button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}

        {filtered.map((u) => (
          <div
            key={u.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card',
              !u.isActive && 'opacity-50',
            )}
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
              {u.avatarUrl
                ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                : u.displayName[0]?.toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm truncate">{u.displayName}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_STYLE[u.role])}>
                  {u.role}
                </span>
                {!u.isActive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">inaktiv</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs font-semibold tabular-nums', u.balance < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                  {formatCents(u.balance)}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {u.hasSso && <Link2 size={11} />}
                  {u.hasPassword && <KeyRound size={11} />}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => setDepositTarget(u)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-colors"
              >
                + €
              </button>
              <button
                onClick={() => setEditTarget(u)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <UserCog size={15} />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Keine Nutzer gefunden</p>
        )}
      </div>

      <DepositModal user={depositTarget} onClose={() => setDepositTarget(null)} />
      <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} />
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AdminLayout>
  )
}

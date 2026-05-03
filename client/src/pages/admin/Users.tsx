import { useState } from 'react';
import {
  KeyRound,
  Link2,
  Plus,
  Dices,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  EyeOff,
  Coins,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Modal } from '../../components/Modal';
import {
  useAdminUsers,
  useCreateUser,
  useDeposit,
  useResetPassword,
  useUpdateUser,
  useDeleteUser,
} from '../../hooks/useAdmin';
import { useAuth, useAuthConfig } from '../../hooks/useAuth';
import type { AdminUser, Role } from '@shared/types';
import { ROLE_LEVEL } from '@shared/types';
import { cn, formatCents } from '../../lib/utils';
import { ROLE_LABEL, ROLE_STYLE } from '../../lib/constants';

// ─── Deposit Modal ────────────────────────────────────────────────────────────

function DepositModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}): React.JSX.Element {
  const [euros, setEuros] = useState('');
  const [note, setNote] = useState('');
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
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={euros}
            onChange={(e) => {
              setEuros(e.target.value);
              setError('');
            }}
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
            onChange={(e) => {
              setNote(e.target.value);
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Wird gebucht…' : 'Einzahlen'}
        </button>
      </form>
    </Modal>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

import { useDialog } from '../../hooks/useDialog';
import { Button } from '@/components/ui/Button';

function UserRow({
  user,
  myRole,
  myId,
  canChangeRole,
  isModerator,
  isAdmin,
  onDeposit,
  onResetPassword,
}: {
  user: AdminUser;
  myRole: Role;
  myId: string | undefined;
  canChangeRole: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  onDeposit: () => void;
  onResetPassword: () => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const { mutate: update, isPending: isUpdating } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const [deleteError, setDeleteError] = useState('');
  const dialog = useDialog();

  const isHigherRank = ROLE_LEVEL[user.role] > ROLE_LEVEL[myRole];
  const isInactive = !user.isActive;
  // Controls other than activate/deactivate are locked for higher-rank or inactive users
  const isMyEntry = user.id == myId;
  const isEditLocked = isHigherRank || isInactive;
  // All controls (including activate) are locked for higher-rank users
  const isFullyLocked = isHigherRank;
  const myRoleLevel = ROLE_LEVEL[myRole];
  const allRoles = (Object.keys(ROLE_LEVEL) as Role[]).sort(
    (a, b) => ROLE_LEVEL[a] - ROLE_LEVEL[b],
  );

  const handleUpdate = (patch: Partial<AdminUser>): void => {
    update({ id: user.id, ...patch });
  };

  const handleDelete = async (): Promise<void> => {
    if (
      !(await dialog.confirmDelete(
        'Nutzer löschen',
        `Möchtest du ${user.displayName} wirklich löschen?`,
      ))
    )
      return;
    deleteUser(user.id, {
      onError: (err) => {
        setDeleteError(
          err instanceof Error ? err.message : 'Löschen fehlgeschlagen. Nutzer hat evtl. Historie.',
        );
      },
    });
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden')}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => {
          setExpanded(!expanded);
        }}
      >
        {/* Avatar & Info with conditional opacity */}
        <div
          className={cn('flex flex-1 items-center gap-3 min-w-0', !user.isActive && 'opacity-60')}
        >
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
            {user.avatarUrl !== null ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              user.displayName[0]?.toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm truncate">{user.displayName}</span>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  ROLE_STYLE[user.role],
                )}
              >
                {ROLE_LABEL[user.role]}
              </span>
              {!user.isActive && (
                <span className="text-destructive" title="Account inaktiv">
                  <EyeOff size={14} />
                </span>
              )}
              {user.isActive ? (
                <span className="text-green-600" title="Account aktiv">
                  <Eye size={14} />
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  user.balance < 0 ? 'text-red-500' : 'text-muted-foreground',
                )}
              >
                {formatCents(user.balance)}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {user.hasSso ? <Link2 size={11} /> : null}
                {user.hasPassword ? <KeyRound size={11} /> : null}
                {user.jackpotAllowed ? (
                  <span title="Jackpot freigeschaltet">
                    <Dices size={11} className="text-yellow-500" />
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions (always full opacity) */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {isModerator ? (
            <Button
              onClick={onDeposit}
              size="icon"
              variant="outline"
              title="Guthaben aufladen"
              disabled={isInactive}
            >
              <Plus size={13} />
              <Coins size={18} />
            </Button>
          ) : null}
          {isAdmin ? (
            <Button
              onClick={onResetPassword}
              size="icon"
              variant="outline"
              title="Passwort setzen"
              disabled={isEditLocked}
            >
              <KeyRound size={18} />
            </Button>
          ) : null}
          <Button
            onClick={() => {
              setExpanded(!expanded);
            }}
            size="icon"
            variant="ghost"
            title={expanded ? 'Einklappen' : 'Ausklappen'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="px-4 py-4 border-t border-border bg-accent/20 space-y-4">
          <div className="flex flex-col gap-4">
            {
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rolle
                  {!canChangeRole && (
                    <span className="text-xs font-medium normal-case">
                      {' '}
                      (wird von SSO verwaltet)
                    </span>
                  )}
                </label>
                <select
                  value={user.role}
                  onChange={(e) => {
                    handleUpdate({ role: e.target.value as AdminUser['role'] });
                  }}
                  disabled={isUpdating || !canChangeRole || isEditLocked || isMyEntry}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
                >
                  {allRoles
                    .filter((r) => ROLE_LEVEL[r] <= myRoleLevel || r === user.role)
                    .map((r) => (
                      <option key={r} value={r} disabled={ROLE_LEVEL[r] > myRoleLevel}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                </select>
              </div>
            }

            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Status & Features
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    handleUpdate({ jackpotAllowed: !user.jackpotAllowed });
                  }}
                  disabled={isUpdating || isEditLocked}
                  variant={user.jackpotAllowed ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    user.jackpotAllowed &&
                      'bg-yellow-500/10 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/20',
                  )}
                >
                  <Dices
                    size={14}
                    className={cn('mr-2', user.jackpotAllowed && 'text-yellow-500')}
                  />
                  Jackpot
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex flex-col justify-between gap-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              ID: {user.id}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                onClick={() => {
                  handleUpdate({ isActive: !user.isActive });
                }}
                disabled={isUpdating || isFullyLocked || isMyEntry}
                size="sm"
                variant="outline"
                className={cn(
                  user.isActive
                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-600 hover:bg-orange-500/20'
                    : 'bg-green-500/10 border-green-500/50 text-green-600 hover:bg-green-500/20',
                )}
              >
                {user.isActive ? (
                  <EyeOff size={14} className="mr-1.5" />
                ) : (
                  <Eye size={14} className="mr-1.5" />
                )}
                {user.isActive ? 'Deaktivieren' : 'Aktivieren'}
              </Button>

              {isAdmin ? (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    onClick={() => {
                      void handleDelete();
                    }}
                    disabled={isDeleting || isEditLocked || isMyEntry}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Nutzer löschen
                  </Button>
                  {deleteError !== '' ? (
                    <p className="text-[10px] text-destructive max-w-[200px] text-right">
                      {deleteError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({
  open,
  onClose,
  myRole,
}: {
  open: boolean;
  onClose: () => void;
  myRole: Role;
}): React.JSX.Element {
  const myRoleLevel = ROLE_LEVEL[myRole];
  const allRoles = (Object.keys(ROLE_LEVEL) as Role[]).sort(
    (a, b) => ROLE_LEVEL[a] - ROLE_LEVEL[b],
  );
  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    role: 'member' as AdminUser['role'],
  });
  const [error, setError] = useState('');
  const { mutate: create, isPending } = useCreateUser();

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    create(
      { ...form, username: form.username || undefined },
      {
        onSuccess: () => {
          setForm({ email: '', username: '', displayName: '', password: '', role: 'member' });
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Fehler');
        },
      },
    );
  };

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
            {allRoles
              .filter((r) => ROLE_LEVEL[r] <= myRoleLevel)
              .map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
          </select>
        </div>
        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Erstellen…' : 'Nutzer erstellen'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}): React.JSX.Element {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const { mutate: reset, isPending } = useResetPassword();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (user === null) return;

    if (password.length < 8) {
      setError('Mindestens 8 Zeichen');
      return;
    }
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    reset(
      { id: user.id, password },
      {
        onSuccess: () => {
          setPassword('');
          setConfirm('');
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Fehler');
        },
      },
    );
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Passwort setzen – ${user?.displayName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Neues Passwort</label>
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Wiederholen</label>
          <input
            type="password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError('');
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Speichern…' : 'Passwort setzen'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AdminUsers(): React.JSX.Element {
  const { data: users, isLoading } = useAdminUsers();
  const { user: me, isAdmin, isModerator } = useAuth();
  const myRole: Role = me?.role ?? 'member';
  const myId = me?.id;
  const { data: config } = useAuthConfig();
  const [depositTarget, setDepositTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const canChangeRole = (u: AdminUser): boolean =>
    !u.hasSso || (config?.roleSync ?? 'always') !== 'always';

  const filtered = (users ?? []).filter(
    (u) =>
      search === '' ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Suchen…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => {
              setCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus size={15} />
            Neu
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : null}

        {filtered.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            myRole={myRole}
            myId={myId}
            canChangeRole={canChangeRole(u)}
            isModerator={isModerator}
            isAdmin={isAdmin}
            onDeposit={() => {
              setDepositTarget(u);
            }}
            onResetPassword={() => {
              setResetTarget(u);
            }}
          />
        ))}

        {!isLoading && filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">Keine Nutzer gefunden</p>
        ) : null}
      </div>

      <DepositModal
        user={depositTarget}
        onClose={() => {
          setDepositTarget(null);
        }}
      />
      <ResetPasswordModal
        user={resetTarget}
        onClose={() => {
          setResetTarget(null);
        }}
      />
      <CreateUserModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
        myRole={myRole}
      />
    </AdminLayout>
  );
}

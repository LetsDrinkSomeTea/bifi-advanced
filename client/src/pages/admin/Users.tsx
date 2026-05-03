import { useState, useMemo } from 'react';
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
  Search,
  Copy,
} from 'lucide-react';
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
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';

import { Check } from 'lucide-react';

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
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Verarbeiten…' : 'Bestätigen'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Reset Password Modal ──────────────────────────────────────────────────────

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
          <Input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Wiederholen</label>
          <Input
            type="password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError('');
            }}
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

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [error, setError] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');
  const { mutate: create, isPending } = useCreateUser();
  const { user: currentUser } = useAuth();

  const myRoleLevel = ROLE_LEVEL[currentUser?.role ?? 'member'];
  const assignableRoles = (['member', 'moderator', 'admin'] as Role[]).filter(
    (r) => ROLE_LEVEL[r] <= myRoleLevel,
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) return;

    const password = Math.random().toString(36).slice(-10);
    create(
      {
        email: email.trim(),
        displayName: displayName.trim(),
        username: username.trim() || undefined,
        password,
        role,
      },
      {
        onSuccess: () => {
          setCreatedPassword(password);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
        },
      },
    );
  };

  if (createdPassword !== '') {
    return (
      <Modal open={open} onClose={onClose} title="Nutzer erstellt">
        <div className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-wider">
              Initial-Passwort
            </p>
            <p className="text-lg font-mono font-bold break-all select-all">{createdPassword}</p>
          </div>
          <button
            onClick={() => {
              setCreatedPassword('');
              setDisplayName('');
              setEmail('');
              setUsername('');
              setRole('member');
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Fertig
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Neuer Nutzer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Anzeigename</label>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
            }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-Mail</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Benutzername (optional)</label>
          <Input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rolle</label>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending || !displayName.trim()}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Erstellen…' : 'Nutzer erstellen'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Edit Role Modal ──────────────────────────────────────────────────────────

function EditRoleModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}): React.JSX.Element {
  const [role, setRole] = useState<Role>(user?.role ?? 'member');
  const { mutate: update, isPending } = useUpdateUser();
  const { user: currentUser } = useAuth();

  const myRoleLevel = ROLE_LEVEL[currentUser?.role ?? 'member'];
  const assignableRoles = (['member', 'moderator', 'admin'] as Role[]).filter(
    (r) => ROLE_LEVEL[r] <= myRoleLevel,
  );

  const handleUpdate = (): void => {
    if (user === null) return;
    update(
      { id: user.id, role },
      {
        onSuccess: onClose,
      },
    );
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Rolle bearbeiten – ${user?.displayName}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Rolle auswählen</label>
          <div className="space-y-2">
            {assignableRoles.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-colors',
                  role === r ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{ROLE_LABEL[r]}</span>
                </div>
                {role === r ? <div className="w-2 h-2 rounded-full bg-primary" /> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm"
          >
            Abbrechen
          </button>
          <button
            onClick={handleUpdate}
            disabled={isPending || role === user?.role}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteUserModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}): React.JSX.Element {
  const { mutate: deleteUser, isPending } = useDeleteUser();
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = (): void => {
    if (user === null) return;
    deleteUser(user.id, {
      onSuccess: () => {
        setConfirmText('');
        onClose();
      },
    });
  };

  const isConfirmed = confirmText === user?.displayName;

  return (
    <Modal open={!!user} onClose={onClose} title="Nutzer löschen">
      <div className="space-y-4">
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
          <p className="font-bold mb-1">Warnung!</p>
          Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten des Nutzers werden dauerhaft
          gelöscht.
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Bitte bestätige die Löschung, indem du den Anzeigenamen{' '}
            <span className="font-bold text-foreground">„{user?.displayName}"</span> eingibst:
          </p>
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
            }}
            placeholder={user?.displayName}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm"
          >
            Abbrechen
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending || !isConfirmed}
            className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-40"
          >
            {isPending ? 'Lösche…' : 'Löschen'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── User Card Component ───────────────────────────────────────────────────────

interface UserCardProps {
  user: AdminUser;
  isSelf: boolean;
  isExpanded: boolean;
  canManage: boolean;
  isAdmin: boolean;
  onToggleExpand: (id: string) => void;
  onDeposit: (user: AdminUser) => void;
  onEditRole: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  canChangeRole: boolean;
}

function UserCard({
  user,
  isSelf,
  isExpanded,
  canManage,
  isAdmin,
  onToggleExpand,
  onDeposit,
  onEditRole,
  onResetPassword,
  onDelete,
  canChangeRole,
}: UserCardProps): React.JSX.Element {
  const { mutate: update, isPending: isUpdating } = useUpdateUser();
  const [copied, setCopied] = useState(false);
  const isSso = user.hasSso;

  const handleCopyId = (e: React.MouseEvent): void => {
    e.stopPropagation();
    void navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200 overflow-hidden',
        isExpanded ? 'border-primary bg-primary/5' : 'border-border bg-card',
      )}
    >
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer"
        onClick={() => {
          onToggleExpand(user.id);
        }}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0 border border-border transition-opacity',
            !user.isActive && 'opacity-50',
          )}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{user.displayName[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={cn('text-sm font-bold truncate', !user.isActive && 'text-muted-foreground')}>
              {user.displayName}
              {isSelf ? ' (Du)' : null}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isSso && <Link2 size={12} className="text-muted-foreground" title="SSO Login" />}
              {user.hasPassword && !isSso && (
                <KeyRound size={12} className="text-muted-foreground" title="Lokales Passwort" />
              )}
              {user.jackpotAllowed && (
                <Dices size={12} className="text-yellow-500" title="Jackpot berechtigt" />
              )}
              {!user.isActive && <EyeOff size={12} className="text-destructive" title="Inaktiv" />}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={cn(
                'text-[10px] px-1.5 py-0 rounded-full font-bold uppercase tracking-tighter',
                ROLE_STYLE[user.role],
              )}
            >
              {ROLE_LABEL[user.role]}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {isSso ? 'SSO' : `@${user.username}`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              user.balance < 0 ? 'text-red-500' : 'text-green-500',
            )}
          >
            {formatCents(user.balance)}
          </p>
        </div>
        <div className="ml-1 text-muted-foreground">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isExpanded ? (
        <div className="px-4 pb-4 pt-2 border-t border-primary/10 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeposit(user);
              }}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <Coins size={14} /> Einzahlen
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditRole(user);
              }}
              disabled={!canManage || !canChangeRole}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/20 text-primary text-xs font-bold disabled:opacity-40 hover:bg-primary/5 transition-colors"
            >
              <KeyRound size={14} /> Rolle
            </button>
            <ToggleSwitch
              label="Aktiv"
              active={user.isActive}
              disabled={isUpdating || !canManage}
              onToggle={() => {
                update({ id: user.id, isActive: !user.isActive });
              }}
            />
            <ToggleSwitch
              label="Jackpot"
              active={user.jackpotAllowed}
              disabled={isUpdating || !canManage}
              onToggle={() => {
                update({ id: user.id, jackpotAllowed: !user.jackpotAllowed });
              }}
            />
            {isAdmin && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetPassword(user);
                  }}
                  disabled={isSso}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-foreground text-xs font-medium disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  <KeyRound size={14} /> PW Reset
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(user);
                  }}
                  disabled={!canManage}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/20 text-destructive text-xs font-bold disabled:opacity-40 hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 size={14} /> Löschen
                </button>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              ID: {user.id}
            </div>
            <button
              onClick={handleCopyId}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-[10px] font-medium',
                copied
                  ? 'bg-green-500/10 border-green-500/50 text-green-600'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Kopiert!' : 'ID kopieren'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Content ──────────────────────────────────────────────────────────────

export function AdminUsersContent(): React.JSX.Element {
  const { user: currentUser } = useAuth();
  const { data: authConfig } = useAuthConfig();
  const { data: users, isLoading } = useAdminUsers();
  const [depositUser, setDepositUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const s = search.toLowerCase().trim();
    if (!s) return users;

    const cleanSearch = s.startsWith('@') ? s.slice(1) : s;

    return users.filter((u) => {
      const matchesName = u.displayName.toLowerCase().includes(s);
      const matchesEmail = u.email.toLowerCase().includes(s);
      const matchesUsername = u.username?.toLowerCase().includes(cleanSearch) ?? false;

      // If search starts with @, prioritize username match
      if (s.startsWith('@') && s.length > 1) {
        return matchesUsername;
      }

      return matchesName || matchesEmail || matchesUsername;
    });
  }, [users, search]);

  const toggleExpand = (id: string): void => {
    setExpandedId(expandedId === id ? null : id);
  };

  const canChangeRole = (u: AdminUser): boolean =>
    !u.hasSso || (authConfig?.roleSync ?? 'always') !== 'always';

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Benutzerverwaltung
          </h2>
          <Button
            onClick={() => {
              setCreateOpen(true);
            }}
            size="sm"
            className="h-8 gap-1.5"
          >
            <Plus size={14} />
            Neu
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Suchen nach Name, Email, @username…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u) => {
            const isSelf = u.id === currentUser?.id;
            const isExpanded = expandedId === u.id;
            const isAdmin = currentUser?.role === 'admin';
            const canManage =
              !isSelf && ROLE_LEVEL[currentUser?.role ?? 'member'] >= ROLE_LEVEL[u.role];

            return (
              <UserCard
                key={u.id}
                user={u}
                isSelf={isSelf}
                isExpanded={isExpanded}
                canManage={canManage}
                isAdmin={isAdmin}
                onToggleExpand={toggleExpand}
                onDeposit={setDepositUser}
                onEditRole={setRoleUser}
                onResetPassword={setResetUser}
                onDelete={setDeleteUser}
                canChangeRole={canChangeRole(u)}
              />
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p>Keine Benutzer gefunden.</p>
            </div>
          )}
        </div>
      )}

      <DepositModal
        user={depositUser}
        onClose={() => {
          setDepositUser(null);
        }}
      />
      <ResetPasswordModal
        user={resetUser}
        onClose={() => {
          setResetUser(null);
        }}
      />
      <CreateUserModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
      />
      <EditRoleModal
        user={roleUser}
        onClose={() => {
          setRoleUser(null);
        }}
      />
      <DeleteUserModal
        user={deleteUser}
        onClose={() => {
          setDeleteUser(null);
        }}
      />
    </div>
  );
}

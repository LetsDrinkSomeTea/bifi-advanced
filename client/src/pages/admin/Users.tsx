import { useState, useMemo } from 'react';
import {
  KeyRound,
  Link2,
  Plus,
  Dices,
  ChevronDown,
  ChevronUp,
  Trash2,
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
  useRemovePassword,
  useUpdateUser,
  useDeleteUser,
} from '../../hooks/useAdmin';
import { useAuth, useAuthConfig } from '../../hooks/useAuth';
import type { AdminUser, Role } from '@shared/types';
import { ROLE_LEVEL } from '@shared/types';
import { cn, formatCents, balanceColor } from '../../lib/utils';
import { ROLE_LABEL, ROLE_STYLE } from '../../lib/constants';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { Badge } from '../../components/ui/Badge';

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

  const cents = Math.round(parseFloat(euros) * 100);
  const isWithdrawal = !isNaN(cents) && cents < 0;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (user === null) return;

    if (isNaN(cents) || cents === 0) {
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

  const modalTitle = isWithdrawal
    ? `Auszahlung – ${user?.displayName}`
    : `Einzahlung – ${user?.displayName}`;

  return (
    <Modal open={!!user} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Betrag (€)</label>
          <Input
            type="number"
            step="0.01"
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
            placeholder={isWithdrawal ? 'z.B. Barauszahlung' : 'z.B. Bareinzahlung'}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
        </div>
        {error !== '' ? <p className="text-sm text-destructive-strong">{error}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Verarbeiten…' : isWithdrawal ? 'Auszahlen' : 'Einzahlen'}
        </Button>
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
  const [error, setError] = useState('');
  const { mutate: reset, isPending } = useResetPassword();
  const { mutate: remove, isPending: isRemoving } = useRemovePassword();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (user === null) return;

    if (password.length < 8) {
      setError('Mindestens 8 Zeichen');
      return;
    }
    reset(
      { id: user.id, password },
      {
        onSuccess: () => {
          setPassword('');
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Fehler');
        },
      },
    );
  };

  const handleRemove = (): void => {
    if (user === null) return;
    remove(user.id, { onSuccess: onClose });
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Passwort – ${user?.displayName}`}>
      <div className="space-y-4">
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
          {error !== '' ? <p className="text-sm text-destructive-strong">{error}</p> : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Speichern…' : 'Passwort setzen'}
          </Button>
        </form>

        {user?.hasPassword ? (
          <div className="border-t pt-3">
            <Button
              type="button"
              variant="destructive-soft"
              className="w-full"
              disabled={isRemoving}
              onClick={handleRemove}
            >
              {isRemoving ? 'Wird entfernt…' : 'Passwort entfernen'}
            </Button>
          </div>
        ) : null}
      </div>
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
          <Button
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
          </Button>
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
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
            }}
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
        {error !== '' ? <p className="text-sm text-destructive-strong">{error}</p> : null}
        <Button type="submit" disabled={isPending || !displayName.trim()} className="w-full">
          {isPending ? 'Erstellen…' : 'Nutzer erstellen'}
        </Button>
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
                  'w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-all',
                  role === r
                    ? 'border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{ROLE_LABEL[r]}</span>
                </div>
                {role === r ? <Check size={18} className="text-primary-foreground" /> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={onClose} className="flex-1" variant="outline">
            Abbrechen
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isPending || role === user?.role}
            className="flex-1"
          >
            Speichern
          </Button>
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
          <Button onClick={onClose} className="flex-1" variant="outline">
            Abbrechen
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending || !isConfirmed}
            className="flex-1"
            variant="destructive"
          >
            {isPending ? 'Lösche…' : 'Löschen'}
          </Button>
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
            <p
              className={cn(
                'text-sm font-bold truncate',
                !user.isActive && 'text-muted-foreground',
              )}
            >
              {user.displayName}
              {isSelf ? ' (Du)' : null}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isSso ? (
                <span title="SSO Login">
                  <Link2 size={12} className="text-muted-foreground" />
                </span>
              ) : null}
              {user.hasPassword ? (
                <span title="Lokales Passwort">
                  <KeyRound size={12} className="text-muted-foreground" />
                </span>
              ) : null}
              {user.jackpotAllowed ? (
                <span title="Jackpot berechtigt">
                  <Dices size={12} className="text-accent-500" />
                </span>
              ) : null}
              {!user.isActive && (
                <span title="Inaktiv">
                  <EyeOff size={12} className="text-destructive" />
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              variant={ROLE_STYLE[user.role]}
              className="text-[9px] px-1.5 py-0 h-4 normal-case tracking-normal"
            >
              {ROLE_LABEL[user.role]}
            </Badge>
            <span className="text-[10px] text-muted-foreground truncate">
              {[isSso ? 'SSO' : null, user.username ? `@${user.username}` : null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-sm font-bold tabular-nums', balanceColor(user.balance))}>
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
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDeposit(user);
              }}
              variant="default"
            >
              <Coins size={14} /> Einzahlen
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onEditRole(user);
              }}
              disabled={!canManage || !canChangeRole}
              variant="primary-soft"
            >
              <KeyRound size={14} /> Rolle
            </Button>
            <ToggleSwitch
              label="Aktiv"
              active={user.isActive}
              disabled={isUpdating || !canManage || isSelf}
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
            {isAdmin ? (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetPassword(user);
                  }}
                  variant="outline"
                >
                  <KeyRound size={14} /> PW Reset
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(user);
                  }}
                  disabled={!canManage}
                  variant="destructive-soft"
                >
                  <Trash2 size={14} /> Löschen
                </Button>
              </>
            ) : null}
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              ID: {user.id}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 h-7 rounded-lg transition-all text-[10px] font-bold',
                copied
                  ? 'bg-confirm text-confirm-foreground border-confirm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Kopiert!' : 'ID kopieren'}
            </Button>
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

  const canChangeRole = (u: AdminUser, isSelf: boolean): boolean =>
    (!u.hasSso || (authConfig?.roleSync ?? 'always') !== 'always') && !isSelf;

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
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
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
              ROLE_LEVEL[currentUser?.role ?? 'member'] >= ROLE_LEVEL[u.role];

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
                canChangeRole={canChangeRole(u, isSelf)}
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

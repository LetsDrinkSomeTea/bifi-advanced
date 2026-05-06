import { useMemo, useRef, useState } from 'react';
import { Pencil, BarChart2, Beer, Upload } from 'lucide-react';
import { Link } from 'wouter';
import { Layout } from '../components/layout/Layout';
import { Modal } from '../components/Modal';
import { AchievementGrid } from '@/components/AchievementGrid';
import { ActivityItem, type ActivityUser, ProfileLink } from '../components/ActivityItem';
import { useAuth } from '../hooks/useAuth';
import { usePublicProfile, useUpdateProfile, useUploadAvatar } from '../hooks/useProfile';
import { type ProstVoucher, useProstVouchers } from '../hooks/useProst';
import { formatCents, balanceColor, cn } from '../lib/utils';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ROLE_LABEL, ROLE_STYLE } from '../lib/constants';

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditProfileModal({
  open,
  onClose,
  hasSso,
}: {
  open: boolean;
  onClose: () => void;
  hasSso: boolean;
}): React.JSX.Element {
  const { user } = useAuth();
  const { mutate: update, isPending: isUpdating } = useUpdateProfile();
  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isPending = isUpdating || isUploading;
  const canEditName = !hasSso;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Datei zu groß (max 2 MB)');
      return;
    }
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setError('');

    const doUpdate = (): void => {
      if (!canEditName) { onClose(); return; }
      const body: { displayName?: string; username?: string | null } = {
        displayName: displayName.trim() || undefined,
        username: username.trim() || null,
      };
      if (!body.displayName && body.username === null) { onClose(); return; }
      update(body, { onSuccess: onClose, onError: (err) => { setError(err instanceof Error ? err.message : 'Fehler'); } });
    };

    if (pendingFile) {
      uploadAvatar(pendingFile, {
        onSuccess: doUpdate,
        onError: (err) => { setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen'); },
      });
    } else {
      if (canEditName) {
        const body: { displayName?: string; username?: string | null } = {
          displayName: displayName.trim() || undefined,
          username: username.trim() || null,
        };
        update(body, { onSuccess: onClose, onError: (err) => { setError(err instanceof Error ? err.message : 'Fehler'); } });
      } else {
        onClose();
      }
    }
  };

  const currentAvatar = preview ?? user?.avatarUrl ?? null;

  return (
    <Modal open={open} onClose={onClose} title="Profil bearbeiten">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Profilbild</label>
          <div className="flex items-center gap-3">
            <div className="size-16 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {currentAvatar !== null ? (
                <img src={currentAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold">{user?.displayName[0]?.toUpperCase()}</span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { fileRef.current?.click(); }}
            >
              <Upload size={14} />
              Bild wählen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {canEditName ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Anzeigename</label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError('');
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Benutzername (optional)</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="z.B. max_mustermann"
              />
            </div>
          </>
        ) : null}

        {error !== '' ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full rounded-xl">
          {isPending ? 'Speichern…' : 'Speichern'}
        </Button>
      </form>
    </Modal>
  );
}

type StackedVoucher = ProstVoucher & { count: number };

// ─── Voucher Item ────────────────────────────────────────────────────────────────
function ProstVoucherItem({ voucher }: { voucher: StackedVoucher }): React.JSX.Element {
  const { data: profile, isLoading } = usePublicProfile(voucher.fromUserId);
  const donor: ActivityUser = {
    id: voucher.fromUserId,
    displayName: profile?.displayName ?? 'Unbekannt',
    avatarUrl: profile?.avatarUrl ?? null,
  };
  const drink = `${voucher.buyableName}${voucher.variantName ? ` ${voucher.variantName}` : ''}`;
  const isStacked = voucher.count > 1;

  return (
    <div className={cn('group relative', isStacked && 'mb-2 mr-2')}>
      {isStacked ? (
        <>
          {/* Deepest layer */}
          <div className="pointer-events-none absolute inset-0 z-0 rounded-xl border border-border/50 bg-card translate-x-2 translate-y-2" />
          {/* Middle layer */}
          <div className="pointer-events-none absolute inset-0 z-0 rounded-xl border border-border/80 bg-card translate-x-1 translate-y-1" />
        </>
      ) : null}
      <ActivityItem
        user={donor}
        icon={<Beer size={10} className="text-accent-600" />}
        createdAt={voucher.createdAt}
        className="relative z-10 rounded-xl border border-border bg-background px-3 py-2 transition-transform duration-200"
      >
        <div className="flex-1 pr-1">
          <span className="font-medium">{drink}</span>
          {' ('}
          <span className="font-semibold text-confirm">+{formatCents(voucher.amount)}</span>) von{' '}
          {isLoading ? <span className="font-semibold">...</span> : <ProfileLink user={donor} />}
        </div>
        {/* Prominent, always-visible count badge */}
        {isStacked ? (
          <span className="absolute -top-1.5 -right-1.5 z-20 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
            {voucher.count}x
          </span>
        ) : null}
      </ActivityItem>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Profile(): React.JSX.Element {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = usePublicProfile(user?.id);
  const { data: vouchers } = useProstVouchers();
  const [editOpen, setEditOpen] = useState(false);
  const stackedVouchers = useMemo<StackedVoucher[]>(() => {
    const vList = vouchers ?? [];
    if (vList.length === 0) return [];

    const grouped = new Map<string, StackedVoucher>();
    for (const voucher of vList) {
      const key = `${voucher.fromUserId}::${voucher.variantId}::${voucher.amount}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        if (new Date(voucher.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.createdAt = voucher.createdAt;
        }
      } else {
        grouped.set(key, { ...voucher, count: 1 });
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [vouchers]);

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar
            displayName={user?.displayName ?? ''}
            avatarUrl={user?.avatarUrl ?? null}
            size="lg"
            className="text-2xl"
          />
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl font-bold truncate">{user?.displayName}</h1>
            {user?.username ? (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            ) : null}
            <div className="flex items-center gap-2 mt-1">
              {user?.role ? (
                <Badge
                  variant={ROLE_STYLE[user.role]}
                  className="px-1.5 py-0.5 normal-case tracking-normal"
                >
                  {ROLE_LABEL[user.role]}
                </Badge>
              ) : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditOpen(true);
            }}
            className="text-muted-foreground flex-shrink-0"
            title="Profil bearbeiten"
          >
            <Pencil size={16} />
          </Button>
        </div>

        {/* Balance */}
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
            Kontostand
          </p>
          <p className={cn('text-3xl font-bold tabular-nums', balanceColor(user?.balance ?? 0))}>
            {formatCents(user?.balance ?? 0)}
          </p>
        </div>

        {/* Stats */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Statistiken
            </h2>
            <Link href="/stats">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-primary">
                <BarChart2 size={12} />
                Details
              </Button>
            </Link>
          </div>
          {profileLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Käufe" value={String(profile?.stats.purchaseCount ?? 0)} />
              <RankCard rank={profile?.stats.leaderboardRank ?? null} />
              <StatCard label="Freunde" value={String(profile?.stats.friendCount ?? 0)} />
              <StatCard
                label="Liebling"
                value={profile?.stats.favoriteProduct?.name ?? '–'}
                small
              />
            </div>
          )}
        </div>

        {/* Achievements */}
        <AchievementGrid
          achievements={profile?.achievements ?? []}
          limit={4}
          allLink="/achievements"
        />

        {/* Prost vouchers */}
        {stackedVouchers.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Prost-Gutscheine
              </h2>
              <Beer size={14} className="text-accent-600" />
            </div>
            <div className="rounded-2xl bg-card p-3 space-y-2">
              {stackedVouchers.map((v) => (
                <ProstVoucherItem key={`${v.fromUserId}-${v.variantId}-${v.amount}`} voucher={v} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <EditProfileModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
        }}
        hasSso={profile?.hasSso ?? false}
      />
    </Layout>
  );
}

const RANK_CATEGORY_LABELS: Record<string, string> = {
  total_spent: 'Ausgaben',
  total_purchases: 'Käufe',
  achievements: 'Achievements',
  prost_sent: 'Prost',
  jackpot_spins: 'Spins',
};

export function RankCard({
  rank,
}: {
  rank: { rank: number; categories: string[] } | null;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">Rang</p>
      <p className="text-xl font-bold leading-tight">{rank !== null ? `#${rank.rank}` : '–'}</p>
      {rank !== null ? (
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {rank.categories.map((c) => RANK_CATEGORY_LABELS[c] ?? c).join(', ')}
        </p>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('font-bold leading-tight', (small ?? false) ? 'text-sm' : 'text-xl')}>
        {value}
      </p>
    </div>
  );
}

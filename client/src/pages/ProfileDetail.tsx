import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import {
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Bell,
  X,
  Beer,
  BarChart2,
  Hand,
  Sparkles,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/PageHeader';
import { AchievementGrid } from '@/components/AchievementGrid';
import { usePublicProfile } from '../hooks/useProfile';
import { useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend } from '../hooks/useFriends';
import { useNudgePresets, useSendNudge } from '../hooks/useNudge';
import { useSendProst } from '../hooks/useProst';
import { useBuyables } from '../hooks/useBuyables';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { ROLE_LABEL, ROLE_STYLE } from '../lib/constants';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import type { FriendshipStatus } from '@shared/types';
import { RankCard, StatCard } from './Profile';
import { Button } from '../components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { SectionHeader } from '../components/ui/SectionHeader';

function FriendButton({
  userId,
  status,
}: {
  userId: string;
  status: FriendshipStatus;
}): React.JSX.Element {
  const { mutate: send, isPending: sending } = useSendFriendRequest();
  const { mutate: accept, isPending: accepting } = useAcceptFriendRequest();
  const { mutate: remove, isPending: removing } = useRemoveFriend();

  if (status === 'friends') {
    return (
      <Button
        variant="outline"
        onClick={() => {
          remove(userId);
        }}
        disabled={removing}
        className="h-9 gap-1.5 px-3 text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive-soft transition-all"
      >
        <UserCheck size={15} />
        Freunde
      </Button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <Button
        variant="outline"
        onClick={() => {
          remove(userId);
        }}
        disabled={removing}
        className="h-9 gap-1.5 px-3 text-muted-foreground opacity-70 transition-all"
        title="Anfrage zurückziehen"
      >
        <Clock size={15} />
        Anfrage gesendet
      </Button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex gap-2">
        <Button
          variant="primary-soft"
          onClick={() => {
            accept(userId);
          }}
          disabled={accepting}
          className="h-9 gap-1.5 px-3 font-bold"
        >
          <UserCheck size={15} />
          Annehmen
        </Button>
        <Button
          variant="destructive-soft"
          onClick={() => {
            remove(userId);
          }}
          disabled={removing}
          className="h-9 gap-1.5 px-3 font-bold"
        >
          <UserX size={15} />
          Ablehnen
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => {
        send(userId);
      }}
      disabled={sending}
      className="h-9 gap-1.5 px-3 font-bold"
    >
      <UserPlus size={15} />
      Freund hinzufügen
    </Button>
  );
}

function NudgeSheet({
  userId,
  displayName,
  onClose,
}: {
  userId: string;
  displayName: string;
  onClose: () => void;
}): React.JSX.Element {
  const [freetext, setFreetext] = useState('');
  const [show, setShow] = useState(false);
  const { data: presets } = useNudgePresets();
  const { mutate: send, isPending, error } = useSendNudge();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = (): void => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  const handleSend = (preset?: string, message?: string): void => {
    send({ recipientId: userId, preset, message }, { onSuccess: handleClose });
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          show ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleClose}
      />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out flex flex-col max-h-[90vh] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:rounded-3xl',
          show ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:scale-95 sm:opacity-0',
        )}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary-strong">
              <Hand size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">{displayName}</h2>
              <p className="text-xs text-muted-foreground mt-1">Anstupsen</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full h-10 w-10"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-10 space-y-6">
          {/* Presets */}
          <div className="space-y-3">
            <SectionHeader className="mb-2">Schnellnachrichten</SectionHeader>
            <div className="grid grid-cols-1 gap-2">
              {presets?.map((p) => (
                <Button
                  key={p.key}
                  variant="outline"
                  onClick={() => {
                    handleSend(p.key);
                  }}
                  disabled={isPending}
                  className="justify-start h-auto py-3.5 px-4 rounded-2xl border-border bg-card hover:bg-primary-soft hover:text-primary-strong transition-all font-medium text-sm group"
                >
                  <span className="flex-1 text-left">{p.text}</span>
                  <Sparkles
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                  />
                </Button>
              ))}
            </div>
          </div>

          {/* Freetext */}
          <div className="space-y-3">
            <SectionHeader className="mb-2">Eigene Nachricht</SectionHeader>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Was willst du sagen? (privat)"
                value={freetext}
                onChange={(e) => {
                  setFreetext(e.target.value);
                }}
                maxLength={200}
                className="rounded-2xl h-12 bg-muted/50 border-none focus-visible:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && freetext.trim() !== '') {
                    handleSend(undefined, freetext.trim());
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (freetext.trim() !== '') {
                    handleSend(undefined, freetext.trim());
                  }
                }}
                disabled={isPending || freetext.trim() === ''}
                className="h-12 px-6 rounded-2xl font-bold"
              >
                Senden
              </Button>
            </div>
            {error !== null ? <p className="text-xs text-destructive mt-2">{error.message}</p> : null}
          </div>
        </div>
      </div>
    </>
  );
}

function ProstSheet({
  toUserId,
  displayName,
  onClose,
}: {
  toUserId: string;
  displayName: string;
  onClose: () => void;
}): React.JSX.Element {
  const [show, setShow] = useState(false);
  const { data: buyables, isLoading } = useBuyables();
  const { mutate: send, isPending, error } = useSendProst();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = (): void => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  const variants =
    buyables?.flatMap((b) =>
      b.variants.filter((v) => v.isActive).map((v) => ({ ...v, buyableName: b.name })),
    ) ?? [];

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          show ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleClose}
      />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out flex flex-col max-h-[90vh] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:rounded-3xl',
          show ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:scale-95 sm:opacity-0',
        )}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent-strong">
              <Beer size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Prost an {displayName}</h2>
              <p className="text-xs text-muted-foreground mt-1">Gutschein spendieren</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full h-10 w-10"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="px-6 py-2 bg-accent-soft/30 flex-shrink-0">
          <p className="text-[11px] leading-snug text-accent-strong font-medium">
            Du zahlst jetzt — {displayName} bekommt den Gutschein für den nächsten Kauf in diesem
            Bistro.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            variants.map((v) => (
              <Button
                key={v.id}
                variant="outline"
                onClick={() => {
                  send({ toUserId, variantId: v.id }, { onSuccess: handleClose });
                }}
                disabled={isPending}
                className="w-full h-auto flex items-center justify-between px-4 py-4 rounded-2xl border-border bg-card hover:bg-accent-soft hover:text-accent-strong transition-all group"
              >
                <div className="text-left">
                  <span className="block font-bold text-sm group-hover:text-accent-strong">
                    {v.buyableName}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {v.name}
                  </span>
                </div>
                <PriceDisplay price={v.price} size="lg" className="group-hover:text-accent-strong" />
              </Button>
            ))
          )}
        </div>

        {error !== null && (
          <div className="px-6 pb-4">
            <div className="p-3 rounded-xl bg-destructive-soft text-destructive-strong text-xs font-bold text-center">
              Fehler beim Senden. Bitte versuche es erneut.
            </div>
          </div>
        )}

        <div className="px-6 pb-10 flex-shrink-0" />
      </div>
    </>
  );
}

export function ProfileDetail(): React.JSX.Element {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const { user: currentUser } = useAuth();
  const { data: profile, isLoading } = usePublicProfile(userId);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [prostOpen, setProstOpen] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
          Nutzer nicht gefunden
        </div>
      </Layout>
    );
  }

  const isOwnProfile = currentUser !== null && currentUser.id === profile.id;

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">
        <PageHeader
          title=""
          onBack={() => {
            navigate('/social');
          }}
        />

        {/* Profile info */}
        <div className="flex items-start gap-4">
          <Avatar
            displayName={profile.displayName}
            avatarUrl={profile.avatarUrl}
            size="lg"
            className="text-2xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold mr-2">{profile.displayName}</span>
              <Badge
                className="text-xs px-1.5 py-0.5 normal-case tracking-normal"
                variant={ROLE_STYLE[profile.role]}
              >
                {ROLE_LABEL[profile.role]}
              </Badge>
            </div>
            {!isOwnProfile && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {profile.friendshipStatus !== null ? (
                  <FriendButton userId={profile.id} status={profile.friendshipStatus} />
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => {
                    setProstOpen(true);
                  }}
                  className="h-9 gap-1.5"
                >
                  <Beer size={15} />
                  Prost
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNudgeOpen(true);
                  }}
                  className="h-9 gap-1.5"
                >
                  <Bell size={15} />
                  Anstupsen
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Statistiken
            </h2>
            <Link href={`/stats/${profile.id}`}>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-primary">
                <BarChart2 size={12} />
                Details
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Käufe" value={String(profile.stats.purchaseCount)} />
            <RankCard rank={profile.stats.leaderboardRank ?? null} />
            <StatCard label="Freunde" value={String(profile.stats.friendCount)} />
            <StatCard
              label="Lieblingsprodukt"
              value={profile.stats.favoriteProduct?.name ?? '–'}
              small
            />
          </div>
        </div>

        {/* Achievements */}
        <AchievementGrid
          achievements={profile.achievements}
          limit={4}
          allLink={`/achievements/${profile.id}`}
        />
      </div>

      {prostOpen ? (
        <ProstSheet
          toUserId={profile.id}
          displayName={profile.displayName}
          onClose={() => {
            setProstOpen(false);
          }}
        />
      ) : null}
      {nudgeOpen ? (
        <NudgeSheet
          userId={profile.id}
          displayName={profile.displayName}
          onClose={() => {
            setNudgeOpen(false);
          }}
        />
      ) : null}
    </Layout>
  );
}

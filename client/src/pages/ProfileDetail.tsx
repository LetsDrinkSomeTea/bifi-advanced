import { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { UserPlus, UserCheck, UserX, Clock, Bell, X, Beer, BarChart2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/PageHeader';
import { AchievementGrid } from '@/components/AchievementGrid';
import { usePublicProfile } from '../hooks/useProfile';
import { useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend } from '../hooks/useFriends';
import { useNudgePresets, useSendNudge } from '../hooks/useNudge';
import { useSendProst } from '../hooks/useProst';
import { useBuyables } from '../hooks/useBuyables';
import { useAuth } from '../hooks/useAuth';
import { formatCents, cn } from '../lib/utils';
import { ROLE_LABEL, ROLE_STYLE } from '../lib/constants';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import type { FriendshipStatus } from '@shared/types';
import { RankCard, StatCard } from './Profile';
import { Button } from '../components/ui/Button';

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
        onClick={() => {
          remove(userId);
        }}
        disabled={removing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
      >
        <UserCheck size={15} />
        Freunde
      </Button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <Button
        onClick={() => {
          remove(userId);
        }}
        disabled={removing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground transition-colors disabled:opacity-50"
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
          onClick={() => {
            accept(userId);
          }}
          disabled={accepting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <UserCheck size={15} />
          Annehmen
        </Button>
        <Button
          onClick={() => {
            remove(userId);
          }}
          disabled={removing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
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
  const { data: presets } = useNudgePresets();
  const { mutate: send, isPending, error } = useSendNudge();

  const handleSend = (preset?: string, message?: string): void => {
    send({ recipientId: userId, preset, message }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          onClose();
        }}
      />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{displayName} anstupsen</h2>
          <Button
            onClick={() => {
              onClose();
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Presets */}
        <div className="space-y-2 mb-4">
          {presets?.map((p) => (
            <Button
              key={p.key}
              onClick={() => {
                handleSend(p.key);
              }}
              disabled={isPending}
              className="w-full text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm disabled:opacity-50"
            >
              {p.text}
            </Button>
          ))}
        </div>

        {/* Freetext */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Eigene Nachricht (privat)…"
            value={freetext}
            onChange={(e) => {
              setFreetext(e.target.value);
            }}
            maxLength={200}
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
            className="px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            Senden
          </Button>
        </div>

        {error !== null ? <p className="text-xs text-destructive mt-2">{error.message}</p> : null}
      </div>
    </div>
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
  const { data: buyables, isLoading } = useBuyables();
  const { mutate: send, isPending, error } = useSendProst();

  const variants =
    buyables?.flatMap((b) =>
      b.variants.filter((v) => v.isActive).map((v) => ({ ...v, buyableName: b.name })),
    ) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          onClose();
        }}
      />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Prost an {displayName}</h2>
            <Beer size={18} className="text-amber-500" />
          </div>
          <Button
            onClick={() => {
              onClose();
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-3 flex-shrink-0">
          Du zahlst jetzt — {displayName} bekommt den Gutschein für den nächsten Kauf.
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-y-auto space-y-2">
            {variants.map((v) => (
              <Button
                key={v.id}
                onClick={() => {
                  send({ toUserId, variantId: v.id }, { onSuccess: onClose });
                }}
                disabled={isPending}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm disabled:opacity-50"
              >
                <span>
                  <span className="font-medium">{v.buyableName}</span>
                  <span className="text-muted-foreground ml-1.5">{v.name}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatCents(v.price)}</span>
              </Button>
            ))}
          </div>
        )}
        {error !== null ? (
          <p className="text-xs text-destructive mt-2 flex-shrink-0">Fehler beim Senden</p>
        ) : null}
      </div>
    </div>
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
          title=''
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
              <span className='text-xl font-bold mr-2'>
                {profile.displayName}
              </span>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  ROLE_STYLE[profile.role],
                )}
              >
                {ROLE_LABEL[profile.role]}
              </span>
            </div>
            {!isOwnProfile && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {profile.friendshipStatus !== null ? (
                  <FriendButton userId={profile.id} status={profile.friendshipStatus} />
                ) : null}
                <Button
                  onClick={() => {
                    setProstOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Beer size={15} />
                  Prost
                </Button>
                <Button
                  onClick={() => {
                    setNudgeOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
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
            <Link
              href={`/stats/${profile.id}`}
              className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
            >
              <BarChart2 size={12} />
              Details
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Käufe" value={String(profile.stats.purchaseCount)} />
            <RankCard rank={profile.stats.leaderboardRank ?? null} />
            <StatCard label="Freunde" value={String(profile.stats.friendCount)} />
            <StatCard label="Lieblingsprodukt" value={profile.stats.favoriteProduct?.name ?? '–'} small />
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

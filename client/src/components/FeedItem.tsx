import { Link } from 'wouter';
import type { FeedEntry } from '../hooks/useFeed';
import { useAuth } from '../hooks/useAuth';
import type { AchievementDef } from '@shared/achievements';
import { ActivityItem, type ActivityUser, ProfileLink } from './ActivityItem';
import { useAchievementMeta } from '@/hooks/useAchievements';
import { type FeedType } from '@shared/types';
import { DynamicIcon } from './ui/DynamicIcon';
import { cn } from '../lib/utils';

interface Item {
  name: string;
  variantName: string;
  count: number;
}

export interface GroupedFeedEntry extends FeedEntry {
  mergedItems?: Item[];
}

// ─── Type icon map ────────────────────────────────────────────────────────────

const TYPE_ICON: Record<FeedType, { name: string; color: string }> = {
  purchase: { name: 'shopping-bag', color: 'text-primary-strong' },
  achievement: { name: 'trophy', color: 'text-accent-strong' },
  prost_sent: { name: 'beer', color: 'text-accent-strong' },
  prost_received: { name: 'beer', color: 'text-accent-strong' },
  nudge: { name: 'hand', color: 'text-muted-foreground' },
  group_join: { name: 'user-plus', color: 'text-confirm-strong' },
  group_created: { name: 'plus-square', color: 'text-primary-strong' },
  group_left: { name: 'user-minus', color: 'text-destructive-strong' },
  group_deleted: { name: 'trash-2', color: 'text-muted-foreground' },
  friendship_started: { name: 'users', color: 'text-secondary-strong' },
  jackpot_win: { name: 'dices', color: 'text-secondary-strong' },
  promotion_started: { name: 'flame', color: 'text-accent-strong' },
  promotion_ended: { name: 'timer', color: 'text-muted-foreground' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActorUser = ActivityUser;
type TargetUser = { id: string; displayName: string; avatarUrl: string | null } | null;

function Actor({
  user,
  currentUserId,
}: {
  user: ActorUser;
  currentUserId: string | undefined;
}): React.JSX.Element {
  if (currentUserId && user.id === currentUserId) return <span className="font-semibold">Du</span>;
  return <ProfileLink user={user} />;
}

function targetName(
  target: TargetUser,
  currentUserId: string | undefined,
  accusative = true,
): React.ReactNode {
  if (!target) return accusative ? 'jemanden' : 'jemandem';
  if (currentUserId && target.id === currentUserId) return accusative ? 'dich' : 'dir';
  return <ProfileLink user={target} />;
}

function GroupLink({ groupId, name }: { groupId: string | null; name: string }): React.JSX.Element {
  if (!groupId) return <span className="font-medium">{name}</span>;
  return (
    <Link href={`/groups/${groupId}`} className="font-medium hover:underline">
      {name}
    </Link>
  );
}

function AchievementLink({ userId, name }: { userId: string; name: string }): React.JSX.Element {
  return (
    <Link href={`/achievements/${userId}`} className="font-medium hover:underline">
      „{name}"
    </Link>
  );
}

// ─── Feed text ────────────────────────────────────────────────────────────────

function feedText(
  entry: GroupedFeedEntry,
  currentUserId: string | undefined,
  achievements: AchievementDef[] | undefined,
): React.ReactNode {
  const { type, user, targetUser, metadata, mergedItems } = entry;
  const isMe = currentUserId !== undefined && user.id === currentUserId;

  switch (type) {
    case 'purchase': {
      const items = mergedItems ?? (metadata?.items as Item[] | undefined);
      const itemStr =
        items
          ?.map((i) => `${i.count}× ${i.name}${i.variantName !== '' ? ` ${i.variantName}` : ''}`)
          .join(', ') ?? 'etwas';
      const groupName = metadata?.groupName as string | undefined;
      if (groupName) {
        return isMe ? (
          <>
            Du hast {itemStr} für die Gruppe{' '}
            <GroupLink groupId={entry.targetGroupId} name={groupName} /> gekauft
          </>
        ) : (
          <>
            <Actor user={user} currentUserId={currentUserId} /> hat {itemStr} für die Gruppe{' '}
            <GroupLink groupId={entry.targetGroupId} name={groupName} /> gekauft
          </>
        );
      }
      return isMe ? (
        <>Du hast {itemStr} gekauft</>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat {itemStr} gekauft
        </>
      );
    }
    case 'achievement': {
      const key = (metadata?.achievementKey ?? metadata?.key) as string | undefined;
      const def = achievements?.find((a) => a.key === key);
      const name = def ? def.name : 'ein Achievement';
      return isMe ? (
        <>
          Du hast <AchievementLink userId={entry.userId} name={name} /> freigeschaltet
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat{' '}
          <AchievementLink userId={entry.userId} name={name} /> freigeschaltet
        </>
      );
    }
    case 'group_join': {
      const groupName = metadata?.groupName as string | undefined;
      return isMe ? (
        <>
          Du bist der Gruppe{' '}
          <GroupLink groupId={entry.targetGroupId} name={groupName ?? 'einer Gruppe'} /> beigetreten
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> ist der Gruppe{' '}
          <GroupLink groupId={entry.targetGroupId} name={groupName ?? 'einer Gruppe'} /> beigetreten
        </>
      );
    }
    case 'group_created': {
      const groupName = metadata?.groupName as string | undefined;
      return isMe ? (
        <>
          Du hast die Gruppe{' '}
          <GroupLink groupId={entry.targetGroupId} name={groupName ?? 'eine Gruppe'} /> erstellt
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat die Gruppe{' '}
          <GroupLink groupId={entry.targetGroupId} name={groupName ?? 'eine Gruppe'} /> erstellt
        </>
      );
    }
    case 'group_left': {
      const groupName = metadata?.groupName as string | undefined;
      return isMe ? (
        <>
          Du hast die Gruppe{' '}
          <GroupLink groupId={entry.targetGroupId} name={groupName ?? 'eine Gruppe'} /> verlassen
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat die Gruppe{' '}
          <GroupLink groupId={entry.targetGroupId} name={groupName ?? 'eine Gruppe'} /> verlassen
        </>
      );
    }
    case 'group_deleted': {
      const groupName = metadata?.groupName as string | undefined;
      return isMe ? (
        <>
          Du hast die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span>{' '}
          gelöscht
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat die Gruppe{' '}
          <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> gelöscht
        </>
      );
    }
    case 'nudge': {
      const message = metadata?.message as string | undefined;
      return isMe ? (
        <>
          Du hast {targetName(targetUser, currentUserId, true)} angestupst
          {message ? (
            <>
              {' '}
              – <span className="italic">„{message}"</span>
            </>
          ) : (
            ''
          )}
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat{' '}
          {targetName(targetUser, currentUserId, true)} angestupst
          {message ? (
            <>
              {' '}
              – <span className="italic">„{message}"</span>
            </>
          ) : (
            ''
          )}
        </>
      );
    }
    case 'prost_sent': {
      const drink = metadata?.buyableName
        ? `${metadata.buyableName as string}${metadata.variantName ? ` ${metadata.variantName as string}` : ''}`
        : null;
      const drinkNode = drink ? (
        <>
          1× <span className="font-medium">{drink}</span>
        </>
      ) : (
        <>einen</>
      );
      return isMe ? (
        <>
          Du hast {targetName(targetUser, currentUserId, true)} {drinkNode} ausgegeben
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat{' '}
          {targetName(targetUser, currentUserId, false)} {drinkNode} ausgegeben
        </>
      );
    }
    case 'prost_received': {
      const drink = metadata?.buyableName
        ? `${metadata.buyableName as string}${metadata.variantName ? ` ${metadata.variantName as string}` : ''}`
        : null;
      const drinkNode = drink ? (
        <>
          1× <span className="font-medium">{drink}</span>
        </>
      ) : (
        <>einen</>
      );
      return isMe ? (
        <>
          Du hast {drinkNode} von {targetName(targetUser, currentUserId, false)} ausgegeben bekommen
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat {drinkNode} von{' '}
          {targetName(targetUser, currentUserId, false)} ausgegeben bekommen
        </>
      );
    }
    case 'friendship_started': {
      const isTarget = currentUserId !== undefined && targetUser?.id === currentUserId;
      if (isMe)
        return <>Du und {targetName(targetUser, currentUserId, true)} seid jetzt befreundet</>;
      if (isTarget)
        return (
          <>
            <ProfileLink user={user} /> und du seid jetzt befreundet
          </>
        );
      return (
        <>
          <Actor user={user} currentUserId={currentUserId} /> und{' '}
          {targetName(targetUser, undefined)} sind jetzt befreundet
        </>
      );
    }
    case 'jackpot_win': {
      const pct = metadata?.multiplierPct as number | undefined;
      const productName = metadata?.productName as string | undefined;
      const variantName = metadata?.variantName as string | undefined;
      const product =
        (productName ?? 'etwas') ? (
          <span className="font-medium">
            {productName}
            {variantName ? ` (${variantName})` : ''}
          </span>
        ) : null;
      // 1. Klar lesbare Logik für den Preis-Text
      let outcome = '';
      if (pct === 0) {
        outcome = 'gratis';
      } else if (pct != null && pct < 100) {
        outcome = `für nur ${pct} % des Preises`;
      } else if (pct === 100) {
        outcome = 'zum Normalpreis'; // Ergänzt, falls jemand exakt 100 erwischt
      } else if (pct === 200) {
        outcome = 'für den doppelten Preis';
      } else if (pct != null) {
        outcome = `für ${pct} % des Preises`;
      }

      return isMe ? (
        <>
          Du hast {product} im Jackpot {outcome} erspielt.
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat {product} im Jackpot {outcome}{' '}
          erspielt.
        </>
      );
    }
    case 'promotion_started': {
      const name = metadata?.promoName as string | undefined;
      const qty = metadata?.quantityLimit as number | undefined;
      return (
        <>
          Eine neue Aktion wurde gestartet:{' '}
          <span className="font-bold text-accent-strong uppercase tracking-tighter">
            „{name ?? 'Sonderangebot'}"
          </span>
          {qty != null ? (
            <>
              {' '}
              – nur <span className="font-bold">{qty}x</span> verfügbar!
            </>
          ) : null}
        </>
      );
    }
    case 'promotion_ended': {
      const name = metadata?.promoName as string | undefined;
      return (
        <>
          Die Aktion <span className="font-medium italic">„{name ?? 'Sonderangebot'}"</span> ist nun
          beendet.
        </>
      );
    }
    default:
      return isMe ? (
        <>Du hast etwas getan</>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat etwas getan
        </>
      );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  entry: GroupedFeedEntry;
  hasConnector?: boolean;
}

const GROUP_TYPES = new Set<FeedType>([
  'group_join',
  'group_created',
  'group_left',
  'group_deleted',
]);

export function FeedItem({ entry, hasConnector = false }: Props): React.JSX.Element {
  const { user: currentUser } = useAuth();
  const { data: achievements } = useAchievementMeta();
  const iconMeta = TYPE_ICON[entry.type];

  const isGroupEvent =
    GROUP_TYPES.has(entry.type) || (entry.type === 'purchase' && entry.targetGroupId !== null);

  const groupName = entry.metadata?.groupName as string | undefined;

  const avatarNode = isGroupEvent ? (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
      {entry.targetGroupImageUrl ? (
        <img src={entry.targetGroupImageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold leading-none">{groupName?.[0]?.toUpperCase()}</span>
      )}
    </div>
  ) : undefined;

  return (
    <ActivityItem
      user={entry.user}
      avatarNode={avatarNode}
      icon={
        <DynamicIcon
          name={iconMeta.name}
          size={16}
          className={cn('bg-background rounded-full p-0.5', iconMeta.color)}
        />
      }
      hasConnector={hasConnector}
      createdAt={entry.createdAt}
    >
      {feedText(entry, currentUser?.id, achievements?.publicMeta)}
    </ActivityItem>
  );
}

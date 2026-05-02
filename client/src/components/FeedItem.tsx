import type { FeedEntry } from '../hooks/useFeed';
import { useAuth } from '../hooks/useAuth';
import type { AchievementDef } from '@shared/achievements';
import { ActivityItem, type ActivityUser, ProfileLink } from './ActivityItem';
import { useAchievementMeta } from '@/hooks/useAchievements';

type Item = { name: string; variantName: string; count: number };

export interface GroupedFeedEntry extends FeedEntry {
  mergedItems?: Item[];
}

// ─── Type emoji map ────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  purchase: '🛒',
  achievement: '🏆',
  prost_sent: '🍺',
  nudge: '👋',
  group_join: '👥',
  group_created: '🏗️',
  group_left: '🚪',
  group_deleted: '🗑️',
  friendship_started: '🤝',
  goal_reached: '🎯',
  jackpot_win: '🎰',
  promotion_started: '🔥',
  promotion_ended: '⌛',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActorUser = ActivityUser;
type TargetUser = { id: string; displayName: string; avatarUrl: string | null } | null;

function Actor({ user, currentUserId }: { user: ActorUser; currentUserId: string | undefined }) {
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

// ─── Feed text ────────────────────────────────────────────────────────────────

function feedText(
  entry: GroupedFeedEntry,
  currentUserId: string | undefined,
  achievements: AchievementDef[] | undefined,
): React.ReactNode {
  const { type, user, targetUser, metadata, mergedItems } = entry;
  const isMe = !!currentUserId && user.id === currentUserId;

  switch (type) {
    case 'purchase': {
      const items = mergedItems ?? (metadata?.items as Item[] | undefined);
      const itemStr =
        items
          ?.map((i) => `${i.count}× ${i.name}${i.variantName ? ` ${i.variantName}` : ''}`)
          .join(', ') ?? 'etwas';
      const groupName = metadata?.groupName as string | undefined;
      if (groupName) {
        return isMe ? (
          <>
            Du hast {itemStr} für die Gruppe <span className="font-medium">{groupName}</span>{' '}
            gekauft
          </>
        ) : (
          <>
            <Actor user={user} currentUserId={currentUserId} /> hat {itemStr} für die Gruppe{' '}
            <span className="font-medium">{groupName}</span> gekauft
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
      const name = def ? `${def.icon} ${def.name}` : 'ein Achievement';
      return isMe ? (
        <>
          Du hast <span className="font-medium">„{name}"</span> freigeschaltet
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat{' '}
          <span className="font-medium">„{name}"</span> freigeschaltet
        </>
      );
    }
    case 'group_join': {
      const groupName = metadata?.groupName as string | undefined;
      return isMe ? (
        <>
          Du bist der Gruppe <span className="font-medium">{groupName ?? 'einer Gruppe'}</span>{' '}
          beigetreten
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> ist der Gruppe{' '}
          <span className="font-medium">{groupName ?? 'einer Gruppe'}</span> beigetreten
        </>
      );
    }
    case 'group_created': {
      const groupName = metadata?.groupName as string | undefined;
      return isMe ? (
        <>
          Du hast die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span>{' '}
          erstellt
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat die Gruppe{' '}
          <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> erstellt
        </>
      );
    }
    case 'group_left': {
      const groupName = metadata?.groupName as string | undefined;
      return isMe ? (
        <>
          Du hast die Gruppe <span className="font-medium">{groupName ?? 'eine Gruppe'}</span>{' '}
          verlassen
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat die Gruppe{' '}
          <span className="font-medium">{groupName ?? 'eine Gruppe'}</span> verlassen
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
          Du hast {targetName(targetUser, currentUserId, true)} {drinkNode} ausgegeben 🍺
        </>
      ) : (
        <>
          <Actor user={user} currentUserId={currentUserId} /> hat{' '}
          {targetName(targetUser, currentUserId, false)} {drinkNode} ausgegeben 🍺
        </>
      );
    }
    case 'friendship_started': {
      const isTarget = !!currentUserId && targetUser?.id === currentUserId;
      if (isMe)
        return <>Du und {targetName(targetUser, currentUserId, true)} seid jetzt befreundet 🤝</>;
      if (isTarget)
        return (
          <>
            <ProfileLink user={user} /> und du seid jetzt befreundet 🤝
          </>
        );
      return (
        <>
          <Actor user={user} currentUserId={currentUserId} /> und{' '}
          {targetName(targetUser, undefined)} sind jetzt befreundet 🤝
        </>
      );
    }
    case 'goal_reached': {
      const title = metadata?.goalTitle as string | undefined;
      return (
        <>
          Spendenziel <span className="font-medium">{title ?? 'Ziel'}</span> wurde erreicht! 🎯
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
      let outcome = '🎰'; // Fallback
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
          <span className="font-bold text-orange-500 uppercase tracking-tighter">
            „{name ?? 'Sonderangebot'}"
          </span>
          {qty != null ? (
            <>
              {' '}
              – nur <span className="font-bold">{qty}x</span> verfügbar!
            </>
          ) : null}{' '}
          🔥
        </>
      );
    }
    case 'promotion_ended': {
      const name = metadata?.promoName as string | undefined;
      return (
        <>
          Die Aktion <span className="font-medium italic">„{name ?? 'Sonderangebot'}"</span> ist nun
          beendet. ⌛
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

export function FeedItem({ entry, hasConnector = false }: Props) {
  const { user: currentUser } = useAuth();
  const { data: achievements } = useAchievementMeta();
  const emoji = TYPE_EMOJI[entry.type] ?? '•';

  return (
    <ActivityItem
      user={entry.user}
      icon={emoji}
      hasConnector={hasConnector}
      createdAt={entry.createdAt}
    >
      {feedText(entry, currentUser?.id, achievements)}
    </ActivityItem>
  );
}

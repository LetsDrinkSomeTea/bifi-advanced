import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { notifications, type Notification } from '../db/schema.ts';
import { type NotificationType } from '../../../shared/src/types.ts';

// ─── SSE client registry ─────────────────────────────────────────────────────
// NOTE: sseClients is process-local. In a multi-instance deployment, broadcastInvalidate
// and pushInvalidate only reach clients connected to this instance. Replace with a
// Redis pub/sub fan-out if horizontal scaling is needed.

type SSEWriter = (event: string, data: unknown) => Promise<void>;
const sseClients = new Map<string, Set<SSEWriter>>();

export function addSSEClient(userId: string, writer: SSEWriter): void {
  let clients = sseClients.get(userId);
  if (!clients) {
    clients = new Set();
    sseClients.set(userId, clients);
  }
  clients.add(writer);
}

export function removeSSEClient(userId: string, writer: SSEWriter): void {
  const set = sseClients.get(userId);
  if (!set) return;
  set.delete(writer);
  if (set.size === 0) sseClients.delete(userId);
}

async function pushToUser(userId: string, event: string, data: unknown): Promise<void> {
  const set = sseClients.get(userId);
  if (!set) return;
  const dead: SSEWriter[] = [];
  for (const writer of set) {
    try {
      await writer(event, data);
    } catch {
      dead.push(writer);
    }
  }
  dead.forEach((w) => {
    set.delete(w);
  });
  if (set.size === 0) sseClients.delete(userId);
}

export function pushInvalidate(userId: string, keys: string[]): void {
  void pushToUser(userId, 'invalidate', { keys }).catch((err: unknown) => {
    console.error(`SSE invalidate failed for user ${userId}:`, err);
  });
}

export function broadcastInvalidate(keys: string[]): void {
  const payload = { keys };
  for (const userId of sseClients.keys()) {
    void pushToUser(userId, 'invalidate', payload).catch((err: unknown) => {
      console.error(`SSE global invalidate failed for user ${userId}:`, err);
    });
  }
}

// ─── Notification creation ────────────────────────────────────────────────────

export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedId,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
}): Promise<Notification> {
  const [notif] = await db
    .insert(notifications)
    .values({ userId, type, title, message, relatedId: relatedId ?? null })
    .returning();

  if (!notif) {
    throw new Error('Failed to create notification');
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  // Push new notification + updated unread count to any open SSE connections
  void pushToUser(userId, 'notification', notif).catch((err: unknown) => {
    console.error('SSE notification push failed:', err);
  });
  void pushToUser(userId, 'unread_count', { count: countRow?.count ?? 0 }).catch((err: unknown) => {
    console.error('SSE unread count push failed:', err);
  });

  return notif;
}

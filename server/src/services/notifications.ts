import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { notifications } from '../db/schema.ts'

// ─── SSE client registry ─────────────────────────────────────────────────────

type SSEWriter = (event: string, data: unknown) => Promise<void>
const sseClients = new Map<string, Set<SSEWriter>>()

export function addSSEClient(userId: string, writer: SSEWriter) {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set())
  sseClients.get(userId)!.add(writer)
}

export function removeSSEClient(userId: string, writer: SSEWriter) {
  const set = sseClients.get(userId)
  if (!set) return
  set.delete(writer)
  if (set.size === 0) sseClients.delete(userId)
}

async function pushToUser(userId: string, event: string, data: unknown) {
  const set = sseClients.get(userId)
  if (!set) return
  const dead: SSEWriter[] = []
  for (const writer of set) {
    try {
      await writer(event, data)
    } catch {
      dead.push(writer)
    }
  }
  dead.forEach((w) => set.delete(w))
  if (set.size === 0) sseClients.delete(userId)
}

export function pushInvalidate(userId: string, keys: string[]): void {
  pushToUser(userId, 'invalidate', { keys }).catch(() => {})
}

export function broadcastInvalidate(keys: string[]): void {
  const payload = { keys }
  for (const userId of sseClients.keys()) {
    pushToUser(userId, 'invalidate', payload).catch(() => {})
  }
}

// ─── Notification creation ────────────────────────────────────────────────────

type NotifType = typeof notifications.$inferInsert['type']

export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedId,
}: {
  userId: string
  type: NotifType
  title: string
  message: string
  relatedId?: string
}) {
  const [notif] = await db
    .insert(notifications)
    .values({ userId, type, title, message, relatedId: relatedId ?? null })
    .returning()

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))

  // Push new notification + updated unread count to any open SSE connections
  await pushToUser(userId, 'notification', notif)
  await pushToUser(userId, 'unread_count', { count: countRow?.count ?? 0 })

  return notif!
}

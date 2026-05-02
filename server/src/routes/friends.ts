import { Hono } from 'hono';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { userFriendships, users } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { createNotification } from '../services/notifications.ts';
import { emitFeedEvent } from '../services/feed.ts';

const router = new Hono();

// ─── GET /api/friends ─────────────────────────────────────────────────────────

router.get('/', requireAuth, async (c) => {
  const user = c.get('user');

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      since: userFriendships.createdAt,
    })
    .from(userFriendships)
    .innerJoin(
      users,
      or(
        and(eq(userFriendships.requesterId, user.id), eq(users.id, userFriendships.addresseeId)),
        and(eq(userFriendships.addresseeId, user.id), eq(users.id, userFriendships.requesterId)),
      ),
    )
    .where(
      and(
        or(eq(userFriendships.requesterId, user.id), eq(userFriendships.addresseeId, user.id)),
        eq(userFriendships.status, 'accepted'),
      ),
    );

  return c.json(rows);
});

// ─── GET /api/friends/requests ────────────────────────────────────────────────

router.get('/requests', requireAuth, async (c) => {
  const user = c.get('user');

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      requestedAt: userFriendships.createdAt,
    })
    .from(userFriendships)
    .innerJoin(users, eq(users.id, userFriendships.requesterId))
    .where(and(eq(userFriendships.addresseeId, user.id), eq(userFriendships.status, 'pending')));

  return c.json(rows);
});

// ─── POST /api/friends/:userId/request ───────────────────────────────────────

router.post('/:userId/request', requireAuth, async (c) => {
  const user = c.get('user');
  const { userId } = c.req.param();

  if (userId === user.id)
    return c.json({ error: 'Cannot friend yourself', code: 'SELF_FRIEND' }, 400);

  // Check if reverse request already exists
  const [reverse] = await db
    .select()
    .from(userFriendships)
    .where(and(eq(userFriendships.requesterId, userId), eq(userFriendships.addresseeId, user.id)));

  if (reverse?.status === 'accepted') return c.json({ status: 'friends' });

  if (reverse?.status === 'pending') {
    // They already sent a request → auto-accept
    await db
      .update(userFriendships)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(userFriendships.id, reverse.id));

    // Notify the original requester that their request was accepted
    createNotification({
      userId,
      type: 'friend_request',
      title: 'Freundschaft angenommen',
      message: `${user.displayName} hat deine Freundschaftsanfrage angenommen.`,
      relatedId: user.id,
    }).catch(console.error);
    emitFeedEvent({ type: 'friendship_started', userId: user.id, targetUserId: userId });

    return c.json({ status: 'friends' });
  }

  // Check if we already sent a request
  const [existing] = await db
    .select()
    .from(userFriendships)
    .where(and(eq(userFriendships.requesterId, user.id), eq(userFriendships.addresseeId, userId)));

  if (existing?.status === 'accepted') return c.json({ status: 'friends' });
  if (existing?.status === 'pending') return c.json({ status: 'pending_sent' });

  // Create new request
  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)));
  if (!targetUser) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);

  await db.insert(userFriendships).values({ requesterId: user.id, addresseeId: userId });

  // Notify the target user
  createNotification({
    userId,
    type: 'friend_request',
    title: 'Neue Freundschaftsanfrage',
    message: `${user.displayName} möchte dein Freund sein.`,
    relatedId: user.id,
  }).catch(console.error);

  return c.json({ status: 'pending_sent' }, 201);
});

// ─── POST /api/friends/:userId/accept ────────────────────────────────────────

router.post('/:userId/accept', requireAuth, async (c) => {
  const user = c.get('user');
  const { userId } = c.req.param();

  const [request] = await db
    .select()
    .from(userFriendships)
    .where(
      and(
        eq(userFriendships.requesterId, userId),
        eq(userFriendships.addresseeId, user.id),
        eq(userFriendships.status, 'pending'),
      ),
    );

  if (!request) return c.json({ error: 'Request not found', code: 'NOT_FOUND' }, 404);

  await db
    .update(userFriendships)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(eq(userFriendships.id, request.id));

  createNotification({
    userId,
    type: 'friend_request',
    title: 'Freundschaft angenommen',
    message: `${user.displayName} hat deine Freundschaftsanfrage angenommen.`,
    relatedId: user.id,
  }).catch(console.error);
  emitFeedEvent({ type: 'friendship_started', userId: user.id, targetUserId: userId });

  return c.json({ status: 'friends' });
});

// ─── DELETE /api/friends/:userId ──────────────────────────────────────────────
// Handles: decline incoming request, cancel sent request, unfriend

router.delete('/:userId', requireAuth, async (c) => {
  const user = c.get('user');
  const { userId } = c.req.param();

  const [row] = await db
    .select()
    .from(userFriendships)
    .where(
      or(
        and(eq(userFriendships.requesterId, user.id), eq(userFriendships.addresseeId, userId)),
        and(eq(userFriendships.requesterId, userId), eq(userFriendships.addresseeId, user.id)),
      ),
    );

  if (!row) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);

  await db.delete(userFriendships).where(eq(userFriendships.id, row.id));

  let action: 'unfriended' | 'request_cancelled' | 'request_declined';
  if (row.status === 'accepted') {
    action = 'unfriended';
  } else if (row.requesterId === user.id) {
    action = 'request_cancelled';
  } else {
    action = 'request_declined';
  }

  return c.json({ action });
});

export default router;

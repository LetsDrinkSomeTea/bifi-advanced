import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, desc, eq, gte, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  prostVouchers,
  transactions,
  userAchievements,
  userFriendships,
  users,
} from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = new Hono();

const QuerySchema = z.object({
  type: z
    .enum(['total_spent', 'total_purchases', 'achievements', 'prost_sent', 'jackpot_spins'])
    .default('total_spent'),
  period: z.enum(['week', 'month', 'alltime']).default('alltime'),
});

router.get('/', requireAuth, zValidator('query', QuerySchema), async (c) => {
  const user = c.get('user');
  const { type, period } = c.req.valid('query');

  // For total_spent: hide values from non-friends
  const friendRows = await db
    .select({ requesterId: userFriendships.requesterId, addresseeId: userFriendships.addresseeId })
    .from(userFriendships)
    .where(
      and(
        eq(userFriendships.status, 'accepted'),
        or(eq(userFriendships.requesterId, user.id), eq(userFriendships.addresseeId, user.id)),
      ),
    );
  const friendIds = new Set(
    friendRows.map((f) => (f.requesterId === user.id ? f.addresseeId : f.requesterId)),
  );
  friendIds.add(user.id);

  const since =
    period === 'week'
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : period === 'month'
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : null;

  interface Row { userId: string; displayName: string; avatarUrl: string | null; value: number }

  let rows: Row[];

  if (type === 'total_spent') {
    rows = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        value: sql<number>`sum(abs(${transactions.totalAmount}))::int`,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(
        and(
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          eq(users.isActive, true),
          since ? gte(transactions.createdAt, since) : undefined,
        ),
      )
      .groupBy(users.id, users.displayName, users.avatarUrl)
      .orderBy(desc(sql`sum(abs(${transactions.totalAmount}))`))
      .limit(50);
  } else if (type === 'total_purchases') {
    rows = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        value: sql<number>`count(${transactions.id})::int`,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(
        and(
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          eq(users.isActive, true),
          since ? gte(transactions.createdAt, since) : undefined,
        ),
      )
      .groupBy(users.id, users.displayName, users.avatarUrl)
      .orderBy(desc(sql`count(${transactions.id})`))
      .limit(50);
  } else if (type === 'achievements') {
    rows = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        value: sql<number>`count(${userAchievements.id})::int`,
      })
      .from(userAchievements)
      .innerJoin(users, eq(userAchievements.userId, users.id))
      .where(
        and(eq(users.isActive, true), since ? gte(userAchievements.unlockedAt, since) : undefined),
      )
      .groupBy(users.id, users.displayName, users.avatarUrl)
      .orderBy(desc(sql`count(${userAchievements.id})`))
      .limit(50);
  } else if (type === 'prost_sent') {
    rows = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        value: sql<number>`count(${prostVouchers.id})::int`,
      })
      .from(prostVouchers)
      .innerJoin(users, eq(prostVouchers.fromUserId, users.id))
      .where(and(eq(users.isActive, true), since ? gte(prostVouchers.createdAt, since) : undefined))
      .groupBy(users.id, users.displayName, users.avatarUrl)
      .orderBy(desc(sql`count(${prostVouchers.id})`))
      .limit(50);
  } else {
    // jackpot_spins
    rows = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        value: sql<number>`count(${transactions.id})::int`,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(
        and(
          eq(transactions.type, 'jackpot'),
          isNull(transactions.cancelledAt),
          eq(users.isActive, true),
          since ? gte(transactions.createdAt, since) : undefined,
        ),
      )
      .groupBy(users.id, users.displayName, users.avatarUrl)
      .orderBy(desc(sql`count(${transactions.id})`))
      .limit(50);
  }

  // Rank and name are public; value is only visible to friends (and self) for monetary types
  const hideValue = type === 'total_spent' || type === 'total_purchases';
  const data = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    value: hideValue && !friendIds.has(r.userId) ? null : r.value,
  }));
  return c.json(data);
});

export default router;

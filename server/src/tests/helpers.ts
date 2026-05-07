import { db } from '../db/index.ts';
import {
  users,
  buyables,
  productVariants,
  groups,
  groupMembers,
  userFriendships,
  notifications,
  promotions,
  nudges,
  prostVouchers,
} from '../db/schema.ts';
import { redis } from '../db/redis.ts';
import { randomUUID } from 'crypto';

export async function createTestUser(
  overrides: Partial<typeof users.$inferInsert> = {},
): Promise<typeof users.$inferSelect> {
  const [user] = await db
    .insert(users)
    .values({
      email: `test-${randomUUID()}@example.com`,
      displayName: 'Test User',
      role: 'member',
      isActive: true,
      ...overrides,
    })
    .returning();
  if (!user) throw new Error('Failed to create test user');
  return user;
}

export async function createTestPromotion(
  overrides: Partial<typeof promotions.$inferInsert> = {},
): Promise<typeof promotions.$inferSelect> {
  const [row] = await db
    .insert(promotions)
    .values({
      name: 'Summer Sale',
      discountPercent: 10,
      isActive: true,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Failed to create test promotion');
  return row;
}

export async function createTestNudge(
  senderId: string,
  recipientId: string,
  overrides: Partial<typeof nudges.$inferInsert> = {},
): Promise<typeof nudges.$inferSelect> {
  const [row] = await db
    .insert(nudges)
    .values({
      senderId,
      recipientId,
      type: 'nudge',
      message: 'Ping!',
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Failed to create test nudge');
  return row;
}

export async function createNotification(
  userId: string,
  overrides: Partial<typeof notifications.$inferInsert> = {},
): Promise<typeof notifications.$inferSelect> {
  const [row] = await db
    .insert(notifications)
    .values({
      userId,
      type: 'system',
      title: 'Test Notification',
      message: 'Hello World',
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Failed to create test notification');
  return row;
}

export async function createTestBuyable(
  overrides: Partial<typeof buyables.$inferInsert> = {},
): Promise<typeof buyables.$inferSelect> {
  const [row] = await db
    .insert(buyables)
    .values({
      name: 'Test Product',
      category: 'soft_drink',
      isActive: true,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Failed to create test buyable');
  return row;
}

export async function createTestVariant(
  buyableId: string,
  overrides: Partial<typeof productVariants.$inferInsert> = {},
): Promise<typeof productVariants.$inferSelect> {
  const [row] = await db
    .insert(productVariants)
    .values({
      buyableId,
      name: 'Standard',
      price: 100, // 1.00 Euro
      isActive: true,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('Failed to create test variant');
  return row;
}

export async function createTestGroup(
  ownerId: string,
  overrides: Partial<typeof groups.$inferInsert> = {},
): Promise<typeof groups.$inferSelect> {
  const [row] = await db
    .insert(groups)
    .values({
      name: 'Test Group',
      createdBy: ownerId,
      inviteCode: randomUUID().slice(0, 8),
      isActive: true,
      ...overrides,
    })
    .returning();

  if (!row) throw new Error('Failed to create test group');

  // Auto-join owner
  await db.insert(groupMembers).values({
    groupId: row.id,
    userId: ownerId,
    role: 'owner',
  });

  return row;
}

export async function createFriendship(
  u1: string,
  u2: string,
  status: 'pending' | 'accepted' = 'accepted',
): Promise<typeof userFriendships.$inferSelect> {
  const [row] = await db
    .insert(userFriendships)
    .values({
      requesterId: u1,
      addresseeId: u2,
      status,
    })
    .returning();
  if (!row) throw new Error('Failed to create friendship');
  return row;
}

export async function createTestVoucher(
  fromId: string,
  toId: string,
  variantId: string,
  amount = 1,
): Promise<typeof prostVouchers.$inferSelect> {
  const [row] = await db
    .insert(prostVouchers)
    .values({
      fromUserId: fromId,
      toUserId: toId,
      variantId,
      amount,
    })
    .returning();
  if (!row) throw new Error('Failed to create voucher');
  return row;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  const sessionData = { userId };
  await redis.setEx(`session:${sessionId}`, 3600, JSON.stringify(sessionData));
  await redis.sAdd(`user:sessions:${userId}`, sessionId);
  return sessionId;
}

export function getAuthCookie(sessionId: string): string {
  return `bifi_session=${sessionId}`;
}

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  buyables,
  productVariants,
  prostVouchers,
  transactionItems,
  transactions,
  users,
} from '../db/schema.ts';
import { emitFeedEvent } from '../services/feed.ts';
import { requireAuth } from '../middleware/auth.ts';
import { createNotification, pushInvalidate } from '../services/notifications.ts';
import { checkAchievements } from '../services/achievements.ts';
import { writeAuditLog } from '../services/audit.ts';
import { getClientIp } from '../lib/ip.ts';

const router = new Hono();

const ProstSchema = z.object({
  toUserId: z.string().uuid(),
  variantId: z.string().uuid(),
});

// ─── POST /api/prost ──────────────────────────────────────────────────────────

router.post('/', requireAuth, zValidator('json', ProstSchema), async (c) => {
  const sender = c.get('user');
  const { toUserId, variantId } = c.req.valid('json');

  if (toUserId === sender.id) {
    return c.json({ error: 'Cannot prost yourself', code: 'SELF_PROST' }, 400);
  }

  const [recipient] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, toUserId), eq(users.isActive, true)));
  if (!recipient) return c.json({ error: 'Recipient not found', code: 'NOT_FOUND' }, 404);

  const [variant] = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      price: productVariants.price,
      isActive: productVariants.isActive,
      buyableId: productVariants.buyableId,
      buyableName: buyables.name,
    })
    .from(productVariants)
    .innerJoin(buyables, eq(productVariants.buyableId, buyables.id))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.isActive, true)));
  if (!variant)
    return c.json({ error: 'Variant not found or inactive', code: 'VARIANT_NOT_FOUND' }, 404);

  const amount = variant.price;

  const { txn, voucher } = await db.transaction(async (tx) => {
    // Debit sender
    const [txn] = await tx
      .insert(transactions)
      .values({
        userId: sender.id,
        initiatedBy: sender.id,
        type: 'prost',
        totalAmount: -amount,
        note: recipient.displayName,
      })
      .returning();

    if (!txn) {
      throw new Error('Failed to create transaction');
    }

    await tx.insert(transactionItems).values({
      transactionId: txn.id,
      buyableId: variant.buyableId,
      variantId: variant.id,
      unitPrice: amount,
      totalPrice: amount,
    });
    await tx
      .update(users)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(users.id, sender.id));

    const [voucher] = await tx
      .insert(prostVouchers)
      .values({
        fromUserId: sender.id,
        toUserId,
        variantId,
        amount,
        fromTransactionId: txn.id,
      })
      .returning();

    if (!voucher) {
      throw new Error('Failed to create voucher');
    }

    return { txn, voucher };
  });

  await writeAuditLog({
    actorId: sender.id,
    action: 'prost.sent',
    resourceType: 'transaction',
    resourceId: txn.id,
    resourceName: `${sender.displayName} ➔ ${recipient.displayName}`,
    changes: { after: { toUserId, variantId, amount } },
    severity: 'low',
    ipAddress: getClientIp(c),
  });

  emitFeedEvent({
    type: 'prost_sent',
    userId: sender.id,
    targetUserId: toUserId,
    metadata: {
      variantId,
      amount,
      buyableName: variant.buyableName,
      variantName: variant.name,
    },
  });

  checkAchievements({ type: 'prost_sent', userId: sender.id }).catch(console.error);
  checkAchievements({ type: 'prost_received', userId: toUserId }).catch(console.error);

  pushInvalidate(toUserId, ['vouchers']);

  createNotification({
    userId: toUserId,
    type: 'prost',
    title: `${sender.displayName} hat dir einen ausgegeben! 🍺`,
    message: `Du hast einen ${variant.buyableName} ${variant.name} von ${sender.displayName} bekommen.`,
    relatedId: voucher.id,
  }).catch(console.error);

  return c.json({ txnId: txn.id, voucherId: voucher.id, amount }, 201);
});

// ─── GET /api/prost/vouchers ──────────────────────────────────────────────────

router.get('/vouchers', requireAuth, async (c) => {
  const user = c.get('user');

  const rows = await db
    .select({
      id: prostVouchers.id,
      fromUserId: prostVouchers.fromUserId,
      variantId: prostVouchers.variantId,
      amount: prostVouchers.amount,
      createdAt: prostVouchers.createdAt,
      buyableName: buyables.name,
      variantName: productVariants.name,
    })
    .from(prostVouchers)
    .innerJoin(productVariants, eq(prostVouchers.variantId, productVariants.id))
    .innerJoin(buyables, eq(productVariants.buyableId, buyables.id))
    .where(
      and(
        eq(prostVouchers.toUserId, user.id),
        isNull(prostVouchers.redeemedAt),
        isNull(prostVouchers.creditedAt),
      ),
    );

  return c.json(rows);
});

export default router;

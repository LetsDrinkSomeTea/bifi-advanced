import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gte, sql } from 'drizzle-orm';
import { TransferSchema } from '../../../shared/src/schemas.ts';
import { db } from '../db/index.ts';
import { transactions, users } from '../db/schema.ts';
import { emitFeedEvent } from '../services/feed.ts';
import { requireAuth } from '../middleware/auth.ts';
import { transferRateLimit } from '../middleware/rateLimit.ts';
import { createNotification, pushInvalidate } from '../services/notifications.ts';
import { writeAuditLog } from '../services/audit.ts';
import { checkAchievements } from '../services/achievements.ts';
import { getClientIp } from '../lib/ip.ts';
import { formatCents } from '../lib/money.ts';

const router = new Hono();

// ─── POST /api/transfers ──────────────────────────────────────────────────────
// Moves balance from the caller to another member. Booked as two linked
// 'transfer' transactions: the sender's debit, and the recipient's credit whose
// parentTransactionId points at the debit.

router.post(
  '/',
  requireAuth,
  async (c, next) => {
    if (process.env.TRANSFERS_ENABLED === 'false') {
      return c.json({ error: 'Transfers are disabled', code: 'TRANSFERS_DISABLED' }, 403);
    }
    return next();
  },
  transferRateLimit,
  zValidator('json', TransferSchema),
  async (c) => {
    const sender = c.get('user');
    const { toUserId, amount, note } = c.req.valid('json');

    if (toUserId === sender.id) {
      return c.json({ error: 'Cannot send money to yourself', code: 'SELF_TRANSFER' }, 400);
    }

    const [recipient] = await db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(and(eq(users.id, toUserId), eq(users.isActive, true)));
    if (!recipient) return c.json({ error: 'Recipient not found', code: 'NOT_FOUND' }, 404);

    const allowNegative = process.env.ALLOW_NEGATIVE_BALANCE !== 'false';

    const { debit, recipientBalanceAfter } = await db.transaction(async (tx) => {
      // Conditional decrement keeps concurrent transfers from overdrawing the account
      const [debited] = await tx
        .update(users)
        .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
        .where(and(eq(users.id, sender.id), allowNegative ? undefined : gte(users.balance, amount)))
        .returning({ id: users.id });
      if (!debited) {
        throw Object.assign(new Error('Unzureichendes Guthaben'), {
          status: 402,
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      const [debit] = await tx
        .insert(transactions)
        .values({
          userId: sender.id,
          initiatedBy: sender.id,
          type: 'transfer',
          totalAmount: -amount,
          note: note ?? null,
        })
        .returning();
      if (!debit) throw new Error('Failed to create transaction');

      await tx.insert(transactions).values({
        userId: recipient.id,
        initiatedBy: sender.id,
        type: 'transfer',
        totalAmount: amount,
        parentTransactionId: debit.id,
        note: note ?? null,
      });
      const [credited] = await tx
        .update(users)
        .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
        .where(eq(users.id, recipient.id))
        .returning({ balance: users.balance });
      if (!credited) throw new Error('Failed to credit recipient');

      return { debit, recipientBalanceAfter: credited.balance };
    });

    await writeAuditLog({
      actorId: sender.id,
      action: 'transfer.sent',
      resourceType: 'transaction',
      resourceId: debit.id,
      resourceName: `${sender.displayName} ➔ ${recipient.displayName}`,
      changes: { after: { toUserId, amount, note: note ?? null } },
      severity: 'low',
      ipAddress: getClientIp(c),
    });

    emitFeedEvent({ type: 'transfer_sent', userId: sender.id, targetUserId: recipient.id });

    checkAchievements({ type: 'transfer_sent', userId: sender.id, amount }).catch(console.error);
    checkAchievements({
      type: 'transfer_received',
      userId: recipient.id,
      amount,
      balanceBefore: recipientBalanceAfter - amount,
      balanceAfter: recipientBalanceAfter,
    }).catch(console.error);

    pushInvalidate(recipient.id, ['balance', 'transactions']);

    createNotification({
      userId: recipient.id,
      type: 'transfer',
      title: `${sender.displayName} hat dir ${formatCents(amount)} geschickt 💸`,
      message: note ?? 'Das Geld ist schon auf deinem Konto.',
      relatedId: debit.id,
    }).catch(console.error);

    return c.json({ txnId: debit.id, amount }, 201);
  },
);

export default router;

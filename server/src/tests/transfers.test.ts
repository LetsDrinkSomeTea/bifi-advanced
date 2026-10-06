import { describe, it, expect, afterEach } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';
import { db } from '../db/index.ts';
import {
  activityFeed,
  notifications,
  transactions,
  userAchievements,
  users,
} from '../db/schema.ts';
import { and, eq } from 'drizzle-orm';
import { drainBackground } from '../lib/background.ts';

async function balanceOf(userId: string): Promise<number> {
  const [row] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
  if (!row) throw new Error('user not found');
  return row.balance;
}

async function sendTransfer(session: string, body: Record<string, unknown>): Promise<Response> {
  return app.request('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: getAuthCookie(session) },
    body: JSON.stringify(body),
  });
}

async function cancelTxn(session: string, id: string): Promise<Response> {
  return app.request(`/api/transactions/${id}`, {
    method: 'DELETE',
    headers: { Cookie: getAuthCookie(session) },
  });
}

describe('Transfer Endpoints', () => {
  const originalAllowNegative = process.env.ALLOW_NEGATIVE_BALANCE;
  const originalEnabled = process.env.TRANSFERS_ENABLED;

  afterEach(() => {
    if (originalAllowNegative === undefined) delete process.env.ALLOW_NEGATIVE_BALANCE;
    else process.env.ALLOW_NEGATIVE_BALANCE = originalAllowNegative;
    if (originalEnabled === undefined) delete process.env.TRANSFERS_ENABLED;
    else process.env.TRANSFERS_ENABLED = originalEnabled;
  });

  describe('POST /api/transfers', () => {
    it('moves money from sender to recipient with two linked transactions', async () => {
      const sender = await createTestUser({ displayName: 'Anna', balance: 1000 });
      const recipient = await createTestUser({ displayName: 'Ben', balance: 200 });
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, {
        toUserId: recipient.id,
        amount: 850,
        note: 'Pizza',
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.amount).toBe(850);

      expect(await balanceOf(sender.id)).toBe(150);
      expect(await balanceOf(recipient.id)).toBe(1050);

      const [debit] = await db.select().from(transactions).where(eq(transactions.id, body.txnId));
      expect(debit).toMatchObject({
        userId: sender.id,
        type: 'transfer',
        totalAmount: -850,
        note: 'Pizza',
        parentTransactionId: null,
      });

      const [credit] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.parentTransactionId, body.txnId));
      expect(credit).toMatchObject({
        userId: recipient.id,
        initiatedBy: sender.id,
        type: 'transfer',
        totalAmount: 850,
        note: 'Pizza',
      });
    });

    it('notifies the recipient and emits a feed event without the amount', async () => {
      const sender = await createTestUser({ displayName: 'Anna', balance: 1000 });
      const recipient = await createTestUser({ displayName: 'Ben' });
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, { toUserId: recipient.id, amount: 850 });
      expect(res.status).toBe(201);
      await drainBackground();

      const notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, recipient.id));
      expect(notifs).toHaveLength(1);
      expect(notifs[0]?.type).toBe('transfer');
      expect(notifs[0]?.title).toContain('8,50 €');

      const feed = await db
        .select()
        .from(activityFeed)
        .where(and(eq(activityFeed.userId, sender.id), eq(activityFeed.type, 'transfer_sent')));
      expect(feed).toHaveLength(1);
      expect(feed[0]?.type).toBe('transfer_sent');
      expect(feed[0]?.targetUserId).toBe(recipient.id);
      expect(JSON.stringify(feed[0]?.metadata ?? null)).not.toContain('850');
    });

    it('rejects transfers to yourself', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, { toUserId: sender.id, amount: 100 });
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe('SELF_TRANSFER');
      expect(await balanceOf(sender.id)).toBe(1000);
    });

    it('rejects inactive recipients', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser({ isActive: false });
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, { toUserId: recipient.id, amount: 100 });
      expect(res.status).toBe(404);
      expect(await balanceOf(sender.id)).toBe(1000);
    });

    it('rejects non-positive and non-integer amounts', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      for (const amount of [0, -100, 1.5]) {
        const res = await sendTransfer(session, { toUserId: recipient.id, amount });
        expect(res.status).toBe(400);
      }
      expect(await balanceOf(sender.id)).toBe(1000);
    });

    it('rejects notes longer than 140 characters', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, {
        toUserId: recipient.id,
        amount: 100,
        note: 'x'.repeat(141),
      });
      expect(res.status).toBe(400);
    });

    it('fails with insufficient balance when ALLOW_NEGATIVE_BALANCE is false', async () => {
      process.env.ALLOW_NEGATIVE_BALANCE = 'false';
      const sender = await createTestUser({ balance: 500 });
      const recipient = await createTestUser({ balance: 0 });
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, { toUserId: recipient.id, amount: 501 });
      expect(res.status).toBe(402);
      expect((await res.json()).code).toBe('INSUFFICIENT_BALANCE');
      expect(await balanceOf(sender.id)).toBe(500);
      expect(await balanceOf(recipient.id)).toBe(0);
      expect(await db.select().from(transactions)).toHaveLength(0);
    });

    it('allows sending the exact balance when ALLOW_NEGATIVE_BALANCE is false', async () => {
      process.env.ALLOW_NEGATIVE_BALANCE = 'false';
      const sender = await createTestUser({ balance: 500 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, { toUserId: recipient.id, amount: 500 });
      expect(res.status).toBe(201);
      expect(await balanceOf(sender.id)).toBe(0);
    });

    it('never overdraws with concurrent transfers when ALLOW_NEGATIVE_BALANCE is false', async () => {
      process.env.ALLOW_NEGATIVE_BALANCE = 'false';
      const sender = await createTestUser({ balance: 500 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          sendTransfer(session, { toUserId: recipient.id, amount: 200 }),
        ),
      );

      expect(results.filter((r) => r.status === 201)).toHaveLength(2);
      expect(await balanceOf(sender.id)).toBe(100);
      expect(await balanceOf(recipient.id)).toBe(400);
    });

    it('allows going negative when ALLOW_NEGATIVE_BALANCE is not false', async () => {
      process.env.ALLOW_NEGATIVE_BALANCE = 'true';
      const sender = await createTestUser({ balance: 0 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, { toUserId: recipient.id, amount: 300 });
      expect(res.status).toBe(201);
      expect(await balanceOf(sender.id)).toBe(-300);
    });

    it('is disabled when TRANSFERS_ENABLED is false', async () => {
      process.env.TRANSFERS_ENABLED = 'false';
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      const res = await sendTransfer(session, { toUserId: recipient.id, amount: 100 });
      expect(res.status).toBe(403);
      expect((await res.json()).code).toBe('TRANSFERS_DISABLED');
      expect(await balanceOf(sender.id)).toBe(1000);
    });

    it('requires authentication', async () => {
      const res = await app.request('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: crypto.randomUUID(), amount: 100 }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/config', () => {
    it('reports transfersEnabled (default true)', async () => {
      delete process.env.TRANSFERS_ENABLED;
      const res = await app.request('/api/auth/config');
      expect((await res.json()).transfersEnabled).toBe(true);

      process.env.TRANSFERS_ENABLED = 'false';
      const res2 = await app.request('/api/auth/config');
      expect((await res2.json()).transfersEnabled).toBe(false);
    });
  });

  describe('GET /api/transactions', () => {
    it('includes the counterparty for both sides of a transfer', async () => {
      const sender = await createTestUser({ displayName: 'Anna', balance: 1000 });
      const recipient = await createTestUser({ displayName: 'Ben' });
      const senderSession = await createSession(sender.id);
      const recipientSession = await createSession(recipient.id);

      await sendTransfer(senderSession, { toUserId: recipient.id, amount: 100, note: 'Kino' });

      const senderHist = await (
        await app.request('/api/transactions', {
          headers: { Cookie: getAuthCookie(senderSession) },
        })
      ).json();
      expect(senderHist.data[0]).toMatchObject({
        type: 'transfer',
        totalAmount: -100,
        note: 'Kino',
        counterparty: { id: recipient.id, displayName: 'Ben' },
      });

      const recipientHist = await (
        await app.request('/api/transactions', {
          headers: { Cookie: getAuthCookie(recipientSession) },
        })
      ).json();
      expect(recipientHist.data[0]).toMatchObject({
        type: 'transfer',
        totalAmount: 100,
        counterparty: { id: sender.id, displayName: 'Anna' },
      });
    });
  });

  describe('Cancelling a transfer', () => {
    async function setup(): Promise<{
      sender: typeof users.$inferSelect;
      recipient: typeof users.$inferSelect;
      senderSession: string;
      recipientSession: string;
      debitId: string;
      creditId: string;
    }> {
      const sender = await createTestUser({ displayName: 'Anna', balance: 1000 });
      const recipient = await createTestUser({ displayName: 'Ben', balance: 0 });
      const senderSession = await createSession(sender.id);
      const recipientSession = await createSession(recipient.id);
      const res = await sendTransfer(senderSession, { toUserId: recipient.id, amount: 400 });
      const { txnId } = await res.json();
      const [credit] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.parentTransactionId, txnId));
      if (!credit) throw new Error('credit not found');
      return {
        sender,
        recipient,
        senderSession,
        recipientSession,
        debitId: txnId,
        creditId: credit.id,
      };
    }

    it('lets the sender cancel within 5 minutes and reverses both sides', async () => {
      const { sender, recipient, senderSession, debitId, creditId } = await setup();

      const res = await cancelTxn(senderSession, debitId);
      expect(res.status).toBe(204);

      expect(await balanceOf(sender.id)).toBe(1000);
      expect(await balanceOf(recipient.id)).toBe(0);

      const rows = await db.select().from(transactions);
      expect(rows.find((r) => r.id === debitId)?.cancelledAt).not.toBeNull();
      expect(rows.find((r) => r.id === creditId)?.cancelledAt).not.toBeNull();

      await drainBackground();
      const notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, recipient.id));
      expect(notifs.some((n) => n.title.includes('storniert'))).toBe(true);
    });

    it('does not let the recipient cancel', async () => {
      const { sender, recipient, recipientSession, creditId } = await setup();

      const res = await cancelTxn(recipientSession, creditId);
      expect(res.status).toBe(403);
      expect(await balanceOf(sender.id)).toBe(600);
      expect(await balanceOf(recipient.id)).toBe(400);
    });

    it('rejects cancellation after 5 minutes', async () => {
      const { sender, senderSession, debitId } = await setup();
      await db
        .update(transactions)
        .set({ createdAt: new Date(Date.now() - 6 * 60 * 1000) })
        .where(eq(transactions.id, debitId));

      const res = await cancelTxn(senderSession, debitId);
      expect(res.status).toBe(403);
      expect((await res.json()).code).toBe('CANCEL_WINDOW_EXPIRED');
      expect(await balanceOf(sender.id)).toBe(600);
    });

    it('lets a moderator cancel via either side', async () => {
      const { sender, recipient, creditId } = await setup();
      const mod = await createTestUser({ role: 'moderator' });
      const modSession = await createSession(mod.id);

      const res = await cancelTxn(modSession, creditId);
      expect(res.status).toBe(204);
      expect(await balanceOf(sender.id)).toBe(1000);
      expect(await balanceOf(recipient.id)).toBe(0);
    });

    it('lets the cancellation push the recipient below zero if they spent the money', async () => {
      const { sender, recipient, senderSession, debitId } = await setup();
      await db.update(users).set({ balance: 0 }).where(eq(users.id, recipient.id));

      const res = await cancelTxn(senderSession, debitId);
      expect(res.status).toBe(204);
      expect(await balanceOf(sender.id)).toBe(1000);
      expect(await balanceOf(recipient.id)).toBe(-400);
    });
  });

  describe('Achievements', () => {
    async function unlocked(userId: string): Promise<string[]> {
      await drainBackground();
      const rows = await db
        .select({ key: userAchievements.achievementKey })
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      return rows.map((r) => r.key);
    }

    it('awards "Bargeldlos" for the first transfer sent', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      await sendTransfer(session, { toUserId: recipient.id, amount: 100 });

      expect(await unlocked(sender.id)).toContain('bargeldlos');
      expect(await unlocked(recipient.id)).not.toContain('bargeldlos');
    });

    it('awards the bronze sent/received tiers after 5 transfers', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      for (let i = 0; i < 4; i++) {
        await sendTransfer(session, { toUserId: recipient.id, amount: 100 });
      }
      expect(await unlocked(sender.id)).not.toContain('transfer_sent_bronze');
      expect(await unlocked(recipient.id)).not.toContain('transfer_received_bronze');

      await sendTransfer(session, { toUserId: recipient.id, amount: 100 });
      expect(await unlocked(sender.id)).toContain('transfer_sent_bronze');
      expect(await unlocked(recipient.id)).toContain('transfer_received_bronze');
    });

    it('does not count cancelled transfers towards the tiers', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      for (let i = 0; i < 4; i++) {
        await sendTransfer(session, { toUserId: recipient.id, amount: 100 });
      }
      const [first] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, sender.id));
      if (!first) throw new Error('no transfer');
      await cancelTxn(session, first.id);

      await sendTransfer(session, { toUserId: recipient.id, amount: 100 });
      expect(await unlocked(sender.id)).not.toContain('transfer_sent_bronze');
    });

    it('awards "Großer Schein" for a transfer of 50 € or more', async () => {
      const sender = await createTestUser({ balance: 10000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      await sendTransfer(session, { toUserId: recipient.id, amount: 4999 });
      expect(await unlocked(sender.id)).not.toContain('grosser_schein');

      await sendTransfer(session, { toUserId: recipient.id, amount: 5000 });
      expect(await unlocked(sender.id)).toContain('grosser_schein');
    });

    it('awards "Centfuchs" for sending exactly one cent', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      await sendTransfer(session, { toUserId: recipient.id, amount: 1 });
      expect(await unlocked(sender.id)).toContain('centfuchs');
    });

    it('awards "Gerettet" when a received transfer clears a negative balance', async () => {
      const sender = await createTestUser({ balance: 1000 });
      const inDebt = await createTestUser({ balance: -300 });
      const stillInDebt = await createTestUser({ balance: -300 });
      const session = await createSession(sender.id);

      await sendTransfer(session, { toUserId: stillInDebt.id, amount: 299 });
      await sendTransfer(session, { toUserId: inDebt.id, amount: 300 });

      expect(await unlocked(inDebt.id)).toContain('gerettet');
      expect(await unlocked(stillInDebt.id)).not.toContain('gerettet');
    });

    it('awards the debt achievements when a transfer pushes the sender below the limit', async () => {
      process.env.ALLOW_NEGATIVE_BALANCE = 'true';
      const sender = await createTestUser({ balance: 0 });
      const recipient = await createTestUser();
      const session = await createSession(sender.id);

      await sendTransfer(session, { toUserId: recipient.id, amount: 1001 });
      expect(await unlocked(sender.id)).toContain('pleite');
    });
  });
});

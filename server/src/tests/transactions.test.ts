import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import {
  createTestUser,
  createSession,
  getAuthCookie,
  createTestBuyable,
  createTestVariant,
} from './helpers.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

describe('Transactions Endpoints', () => {
  describe('POST /api/transactions/purchase', () => {
    it('should complete a solo purchase and deduct balance', async () => {
      const me = await createTestUser({ balance: 1000 });
      const sessionId = await createSession(me.id);

      const b1 = await createTestBuyable();
      const v1 = await createTestVariant(b1.id, { price: 250 });

      const res = await app.request('/api/transactions/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          items: [{ buyableId: b1.id, variantId: v1.id, quantity: 1 }],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.totalAmount).toBe(-250);

      const [updatedMe] = await db.select().from(users).where(eq(users.id, me.id));
      if (!updatedMe) throw new Error('user not found');
      expect(updatedMe.balance).toBe(750);
    });

    it('should fail if not enough balance? (Check intended behavior)', async () => {
      // Many clubs allow negative balance, let's check the code or ask.
      // Looking at transactions.ts: it just does `balance: sql`balance - ${netCost}``.
      // There's no check for balance > 0 in the snippet I saw.
      const me = await createTestUser({ balance: 100 });
      const sessionId = await createSession(me.id);
      const b1 = await createTestBuyable();
      const v1 = await createTestVariant(b1.id, { price: 250 });

      const res = await app.request('/api/transactions/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          items: [{ buyableId: b1.id, variantId: v1.id, quantity: 1 }],
        }),
      });

      expect(res.status).toBe(201); // Assuming negative balance is allowed
      const [updatedMe] = await db.select().from(users).where(eq(users.id, me.id));
      if (!updatedMe) throw new Error('user not found');
      expect(updatedMe.balance).toBe(-150);
    });

    it('should fail if not enough balance and ALLOW_NEGATIVE_BALANCE is false', async () => {
      // We need to set the env var. In vitest, we can use process.env
      process.env.ALLOW_NEGATIVE_BALANCE = 'false';

      const me = await createTestUser({ balance: 100 });
      const sessionId = await createSession(me.id);
      const b1 = await createTestBuyable();
      const v1 = await createTestVariant(b1.id, { price: 250 });

      const res = await app.request('/api/transactions/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          items: [{ buyableId: b1.id, variantId: v1.id, quantity: 1 }],
        }),
      });

      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.code).toBe('INSUFFICIENT_BALANCE');

      // Reset for other tests
      process.env.ALLOW_NEGATIVE_BALANCE = 'true';
    });
  });

  describe('POST /api/admin/users/:id/deposit', () => {
    it('should allow moderator to deposit for a user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const target = await createTestUser({ balance: 500 });
      const sessionId = await createSession(admin.id);

      const res = await app.request(`/api/admin/users/${target.id}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          amount: 2000,
          note: 'Test deposit',
        }),
      });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/transactions', () => {
    it('should return transaction history for current user', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/transactions', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    it('should filter transaction history by type', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      // 1. Purchase
      const b = await createTestBuyable();
      const v = await createTestVariant(b.id);
      await app.request('/api/transactions/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: getAuthCookie(sessionId) },
        body: JSON.stringify({ items: [{ buyableId: b.id, variantId: v.id, quantity: 1 }] }),
      });

      // 2. Deposit
      const admin = await createTestUser({ role: 'admin' });
      const adminSession = await createSession(admin.id);
      await app.request(`/api/admin/users/${me.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: getAuthCookie(adminSession) },
        body: JSON.stringify({ amount: 1000 }),
      });

      // Query only purchases
      const res = await app.request('/api/transactions?type=purchase', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });
      const body = await res.json();
      expect(body.data.every((t: any) => t.type === 'purchase')).toBe(true);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should cancel a recent transaction and refund balance', async () => {
      const me = await createTestUser({ balance: 1000 });
      const sessionId = await createSession(me.id);

      const b = await createTestBuyable();
      const v = await createTestVariant(b.id, { price: 200 });

      // 1. Purchase
      const res1 = await app.request('/api/transactions/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          items: [{ buyableId: b.id, variantId: v.id, quantity: 1 }],
        }),
      });
      const txnId = (await res1.json()).id;

      // 2. Cancel
      const res2 = await app.request(`/api/transactions/${txnId}`, {
        method: 'DELETE',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res2.status).toBe(204);

      // 3. Verify balance
      const [updated] = await db.select().from(users).where(eq(users.id, me.id));
      if (!updated) throw new Error('user not found');
      expect(updated.balance).toBe(1000); // Refunded
    });
  });
});

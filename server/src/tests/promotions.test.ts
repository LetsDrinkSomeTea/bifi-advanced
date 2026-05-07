import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import {
  createTestUser,
  createSession,
  getAuthCookie,
  createTestBuyable,
  createTestVariant,
} from './helpers.ts';

describe('Promotions Endpoints (Admin)', () => {
  describe('POST /api/admin/promotions', () => {
    it('should allow admin to create a promotion', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const sessionId = await createSession(admin.id);

      const res = await app.request('/api/admin/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          name: 'Happy Hour',
          discountPercent: 50,
          isActive: true,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('Happy Hour');
    });
  });

  describe('Promotion logic in purchase', () => {
    it('should apply active promotion to purchase', async () => {
      const me = await createTestUser({ balance: 1000 });
      const sessionId = await createSession(me.id);

      const b1 = await createTestBuyable();
      const v1 = await createTestVariant(b1.id, { price: 200 });

      // Create admin to set up promotion
      const admin = await createTestUser({ role: 'admin' });
      const adminSession = await createSession(admin.id);
      await app.request('/api/admin/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(adminSession),
        },
        body: JSON.stringify({
          name: 'Half Price',
          discountPercent: 50,
          isActive: true,
          appliesTo: { buyableId: b1.id },
        }),
      });

      // Now purchase as user
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
      expect(body.totalAmount).toBe(-100); // 200 - 50%
    });
  });
});

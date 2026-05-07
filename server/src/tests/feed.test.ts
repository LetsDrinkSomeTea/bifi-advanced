import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import {
  createTestUser,
  createSession,
  getAuthCookie,
  createTestBuyable,
  createTestVariant,
} from './helpers.ts';

describe('Feed Endpoints', () => {
  describe('GET /api/feed', () => {
    it('should return activities in the feed', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const b = await createTestBuyable();
      const v = await createTestVariant(b.id);

      // Perform an action that generates feed events
      await app.request('/api/transactions/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          items: [{ buyableId: b.id, variantId: v.id, quantity: 1 }],
        }),
      });

      const res = await app.request('/api/feed', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // Look for the purchase event specifically
      const hasPurchase = body.data.some((item: any) => item.type === 'purchase');
      expect(hasPurchase).toBe(true);
    });
  });
});

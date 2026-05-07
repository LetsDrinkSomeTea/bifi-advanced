import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import {
  createTestUser,
  createSession,
  getAuthCookie,
  createTestBuyable,
  createTestVariant,
} from './helpers.ts';

describe('Buyables Endpoints', () => {
  describe('GET /api/buyables', () => {
    it('should return list of active buyables with variants', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const b1 = await createTestBuyable({ name: 'Cola' });
      const v1 = await createTestVariant(b1.id, { name: '0.33l', price: 150 });

      const res = await app.request('/api/buyables', {
        headers: {
          Cookie: getAuthCookie(sessionId),
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);

      const cola = body.find((b: any) => b.id === b1.id);
      expect(cola).toBeDefined();
      expect(cola.variants.some((v: any) => v.id === v1.id)).toBe(true);
    });

    it('should not return inactive buyables', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const b2 = await createTestBuyable({ name: 'Old Stuff', isActive: false });

      const res = await app.request('/api/buyables', {
        headers: {
          Cookie: getAuthCookie(sessionId),
        },
      });

      const body = await res.json();
      expect(body.some((b: any) => b.id === b2.id)).toBe(false);
    });
  });
});

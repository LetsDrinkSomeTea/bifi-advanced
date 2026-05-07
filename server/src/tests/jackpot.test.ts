import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import {
  createTestUser,
  createSession,
  getAuthCookie,
  createTestBuyable,
  createTestVariant,
} from './helpers.ts';

describe('Jackpot Endpoints', () => {
  describe('GET /api/jackpot/eligibility', () => {
    it('should return current jackpot eligibility', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/jackpot/eligibility', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('eligible');
    });
  });

  describe('POST /api/jackpot/spin', () => {
    it('should perform a spin if user has enough balance and is allowed', async () => {
      const me = await createTestUser({ balance: 1000, jackpotAllowed: true });
      const sessionId = await createSession(me.id);

      const b1 = await createTestBuyable({ name: 'Jackpot Juice' });
      const v1 = await createTestVariant(b1.id, { price: 200 });

      // We need to enable jackpot in env
      process.env.JACKPOT_ENABLED = 'true';

      const res = await app.request('/api/jackpot/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          buyableId: b1.id,
          variantId: v1.id,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('multiplierDecimal');
      expect(body).toHaveProperty('pricePaid');

      process.env.JACKPOT_ENABLED = 'false';
    });
  });
});

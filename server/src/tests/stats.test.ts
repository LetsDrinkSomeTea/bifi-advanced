import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';

describe('Stats Endpoints', () => {
  describe('GET /api/stats/user/:id', () => {
    it('should return user stats', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request(`/api/stats/user/${me.id}`, {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('social');
      expect(body).toHaveProperty('consumption');
    });
  });

  describe('GET /api/stats/system', () => {
    it('should return system stats', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/stats/system', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('totalUsers');
      expect(body).toHaveProperty('totalRevenue');
    });
  });
});

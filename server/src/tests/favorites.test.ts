import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import {
  createTestUser,
  createSession,
  getAuthCookie,
  createTestBuyable,
  createTestVariant,
} from './helpers.ts';

describe('Favorites Endpoints', () => {
  describe('GET /api/favorites', () => {
    it('should return empty list initially', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/favorites', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });

  describe('POST /api/favorites/:variantId', () => {
    it('should add a variant to favorites', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const b = await createTestBuyable();
      const v = await createTestVariant(b.id);

      const res = await app.request(`/api/favorites/${v.id}`, {
        method: 'POST',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/favorites/:variantId', () => {
    it('should remove a variant from favorites', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const b = await createTestBuyable();
      const v = await createTestVariant(b.id);

      // Add first
      await app.request(`/api/favorites/${v.id}`, {
        method: 'POST',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      // Then delete
      const res = await app.request(`/api/favorites/${v.id}`, {
        method: 'DELETE',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(204);
    });
  });
});

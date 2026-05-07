import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';

describe('Users Endpoints', () => {
  describe('GET /api/users/search', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await app.request('/api/users/search?q=test');
      expect(res.status).toBe(401);
    });

    it('should return search results excluding self', async () => {
      const me = await createTestUser();
      const other = await createTestUser({ displayName: 'Other User' });
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/users/search?q=Other', {
        headers: {
          Cookie: getAuthCookie(sessionId),
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((u: any) => u.id === other.id)).toBe(true);
      expect(body.some((u: any) => u.id === me.id)).toBe(false);
    });
  });

  describe('GET /api/users/:id/profile', () => {
    it('should return user profile with stats', async () => {
      const me = await createTestUser();
      const target = await createTestUser({ displayName: 'Target User' });
      const sessionId = await createSession(me.id);

      const res = await app.request(`/api/users/${target.id}/profile`, {
        headers: {
          Cookie: getAuthCookie(sessionId),
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(target.id);
      expect(body.displayName).toBe('Target User');
      expect(body).toHaveProperty('stats');
      expect(body).toHaveProperty('achievements');
    });

    it('should return 404 for non-existent user', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await app.request(`/api/users/${fakeId}/profile`, {
        headers: {
          Cookie: getAuthCookie(sessionId),
        },
      });

      expect(res.status).toBe(404);
    });
  });
});

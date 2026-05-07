import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie, createNotification } from './helpers.ts';

describe('Notifications Endpoints', () => {
  describe('GET /api/notifications', () => {
    it('should return list of notifications', async () => {
      const me = await createTestUser();
      const n1 = await createNotification(me.id, { title: 'First' });
      await createNotification(me.id, { title: 'Second' });

      const sessionId = await createSession(me.id);
      const res = await app.request('/api/notifications', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(body.some((n: any) => n.id === n1.id)).toBe(true);
    });
  });

  describe('POST /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const me = await createTestUser();
      const n = await createNotification(me.id);
      const sessionId = await createSession(me.id);

      const res = await app.request(`/api/notifications/${n.id}/read`, {
        method: 'POST',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const me = await createTestUser();
      await createNotification(me.id);
      await createNotification(me.id);
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/notifications/read-all', {
        method: 'POST',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});

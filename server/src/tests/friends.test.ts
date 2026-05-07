import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie, createFriendship } from './helpers.ts';

describe('Friends Endpoints', () => {
  describe('GET /api/friends', () => {
    it('should return list of friends', async () => {
      const me = await createTestUser();
      const friend = await createTestUser({ displayName: 'My Friend' });
      await createFriendship(me.id, friend.id, 'accepted');

      const sessionId = await createSession(me.id);
      const res = await app.request('/api/friends', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((f: any) => f.id === friend.id)).toBe(true);
    });
  });

  describe('POST /api/friends/:userId/request', () => {
    it('should send a friend request', async () => {
      const me = await createTestUser();
      const target = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request(`/api/friends/${target.id}/request`, {
        method: 'POST',
        headers: {
          Cookie: getAuthCookie(sessionId),
        },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe('pending_sent');
    });
  });

  describe('POST /api/friends/:userId/accept', () => {
    it('should accept a friend request', async () => {
      const me = await createTestUser();
      const sender = await createTestUser();
      await createFriendship(sender.id, me.id, 'pending');
      const sessionId = await createSession(me.id);

      const res = await app.request(`/api/friends/${sender.id}/accept`, {
        method: 'POST',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
    });
  });
});

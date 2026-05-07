import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';

describe('Nudges Endpoints', () => {
  describe('POST /api/nudges/:recipientId', () => {
    it('should send a nudge to a friend', async () => {
      const me = await createTestUser();
      const target = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request(`/api/nudges/${target.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          message: 'Poke!',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  describe('GET /api/nudges/presets', () => {
    it('should return nudge presets', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/nudges/presets', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0]).toHaveProperty('key');
      expect(body[0]).toHaveProperty('text');
    });
  });
});

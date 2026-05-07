import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

describe('Admin User Management', () => {
  describe('GET /api/admin/users', () => {
    it('should allow admin to list all users', async () => {
      const admin = await createTestUser({ role: 'admin' });
      await createTestUser({ displayName: 'Alice' });
      await createTestUser({ displayName: 'Bob' });
      const sessionId = await createSession(admin.id);

      const res = await app.request('/api/admin/users', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    it('should allow admin to change user role and active status', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const target = await createTestUser({ role: 'member', isActive: true });
      const sessionId = await createSession(admin.id);

      const res = await app.request(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          role: 'moderator',
          isActive: false,
        }),
      });

      expect(res.status).toBe(200);

      const [updated] = await db.select().from(users).where(eq(users.id, target.id));
      if (!updated) throw new Error('user not found');
      expect(updated.role).toBe('moderator');
      expect(updated.isActive).toBe(false);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should allow admin to create a new user manually', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const sessionId = await createSession(admin.id);

      const res = await app.request('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          email: 'manual@example.com',
          displayName: 'Manual User',
          password: 'password123',
          role: 'member',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.email).toBe('manual@example.com');

      const [found] = await db.select().from(users).where(eq(users.email, 'manual@example.com'));
      expect(found).toBeDefined();
    });
  });
});

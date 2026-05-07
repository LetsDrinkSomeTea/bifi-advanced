import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';

describe('Audit Logs Endpoints (Admin)', () => {
  describe('GET /api/admin/audit-log', () => {
    it('should allow admin to see recent audit logs', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const sessionId = await createSession(admin.id);

      // Perform an action that logs (e.g., create a user or promotion)
      await app.request('/api/admin/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          name: 'Loggable Promo',
          discountPercent: 10,
          isActive: true,
        }),
      });

      const res = await app.request('/api/admin/audit-logs', {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0]).toHaveProperty('action');
    });
  });
});

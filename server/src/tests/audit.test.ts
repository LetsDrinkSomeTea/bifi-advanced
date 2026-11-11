import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';
import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { pruneAuditIpAddresses } from '../services/audit.ts';

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

describe('pruneAuditIpAddresses', () => {
  it('removes IP addresses older than the retention period and keeps the entries', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await db.insert(auditLogs).values([
      { action: 'auth.login', resourceType: 'user', ipAddress: '203.0.113.1', createdAt: old },
      { action: 'auth.login', resourceType: 'user', ipAddress: '203.0.113.2' },
    ]);

    const pruned = await pruneAuditIpAddresses();

    expect(pruned).toBe(1);
    const rows = await db.select().from(auditLogs).orderBy(auditLogs.createdAt);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.ipAddress).toBeNull();
    expect(rows[1]?.ipAddress).toBe('203.0.113.2');
  });
});

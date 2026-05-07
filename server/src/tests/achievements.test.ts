import { describe, it, expect } from 'vitest';
import app from '../index.ts';

describe('Achievements Endpoints', () => {
  describe('GET /api/achievements/meta', () => {
    it('should return achievements metadata', async () => {
      const res = await app.request('/api/achievements/meta');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('publicMeta');
      expect(Array.isArray(body.publicMeta)).toBe(true);
      expect(body.publicMeta.length).toBeGreaterThan(0);
    });
  });
});

import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser } from './helpers.ts';
import * as argon2 from 'argon2';

describe('Auth Endpoints', () => {
  describe('POST /api/auth/local/bootstrap', () => {
    it('should create the first admin user and then fail on subsequent attempts', async () => {
      // First attempt: success
      const res1 = await app.request('/api/auth/local/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          displayName: 'Admin User',
          password: 'password123',
        }),
      });

      expect(res1.status).toBe(201);
      const body1 = await res1.json();
      expect(body1.email).toBe('admin@example.com');

      // Second attempt: failure
      const res2 = await app.request('/api/auth/local/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'second@example.com',
          displayName: 'Second Admin',
          password: 'password123',
        }),
      });

      expect(res2.status).toBe(403);
    });
  });

  describe('POST /api/auth/local/login', () => {
    it('should login with valid credentials', async () => {
      const password = 'secure-password';
      const hash = await argon2.hash(password);
      const user = await createTestUser({
        email: 'login-test@example.com',
        username: 'logintest',
        passwordHash: hash,
      });

      const res = await app.request('/api/auth/local/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: 'logintest',
          password: password,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.user.id).toBe(user.id);

      const setCookie = res.headers.get('Set-Cookie');
      expect(setCookie).toContain('bifi_session=');
    });

    it('should fail with invalid password', async () => {
      const hash = await argon2.hash('correct-password');
      await createTestUser({
        email: 'fail-test@example.com',
        username: 'failtest',
        passwordHash: hash,
      });

      const res = await app.request('/api/auth/local/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: 'failtest',
          password: 'wrong-password',
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});

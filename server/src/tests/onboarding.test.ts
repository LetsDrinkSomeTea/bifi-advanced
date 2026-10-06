import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';

async function getMe(cookie: string): Promise<{ onboardingCompletedAt: string | null }> {
  const res = await app.request('/api/auth/me', { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  return res.json() as Promise<{ onboardingCompletedAt: string | null }>;
}

describe('Onboarding', () => {
  it('reports a new user as not onboarded', async () => {
    const user = await createTestUser();
    const cookie = getAuthCookie(await createSession(user.id));

    const me = await getMe(cookie);
    expect(me.onboardingCompletedAt).toBeNull();
  });

  it('marks the onboarding as completed', async () => {
    const user = await createTestUser();
    const cookie = getAuthCookie(await createSession(user.id));

    const res = await app.request('/api/users/me/onboarding', {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { onboardingCompletedAt: string | null };
    expect(body.onboardingCompletedAt).not.toBeNull();

    const me = await getMe(cookie);
    expect(me.onboardingCompletedAt).not.toBeNull();
  });

  it('keeps the first completion timestamp on repeat calls', async () => {
    const completedAt = new Date('2026-01-01T12:00:00Z');
    const user = await createTestUser({ onboardingCompletedAt: completedAt });
    const cookie = getAuthCookie(await createSession(user.id));

    const res = await app.request('/api/users/me/onboarding', {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { onboardingCompletedAt: string };
    expect(new Date(body.onboardingCompletedAt).getTime()).toBe(completedAt.getTime());
  });

  it('requires authentication', async () => {
    const res = await app.request('/api/users/me/onboarding', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index.ts';
import { runMigrations } from '../db/migrate.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';

interface Me {
  onboardingCompletedAt: string | null;
  onboardingVariant: 'new' | 'returning';
}

async function getMe(cookie: string): Promise<Me> {
  const res = await app.request('/api/auth/me', { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  return res.json() as Promise<Me>;
}

describe('Onboarding', () => {
  // Records when the onboarding migration was applied, which decides the variant.
  beforeAll(async () => {
    await runMigrations();
  });

  it('shows the full onboarding to users created after the feature shipped', async () => {
    const user = await createTestUser();
    const cookie = getAuthCookie(await createSession(user.id));

    const me = await getMe(cookie);
    expect(me.onboardingVariant).toBe('new');
  });

  it('shows the returning variant to users that existed before the feature', async () => {
    const user = await createTestUser({ createdAt: new Date('2020-01-01T00:00:00Z') });
    const cookie = getAuthCookie(await createSession(user.id));

    const me = await getMe(cookie);
    expect(me.onboardingVariant).toBe('returning');
  });

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

import { pool } from '../db/index.ts';
import { MIGRATIONS_TABLE } from '../db/migrate.ts';

export type OnboardingVariant = 'new' | 'returning';

const ONBOARDING_MIGRATION = '0002_onboarding';

let introducedAt: Date | null = null;

// When the onboarding reached this install. Fresh installs record it on first start, before
// any user exists, so only accounts from before the feature count as returning.
async function onboardingIntroducedAt(): Promise<Date | null> {
  if (introducedAt) return introducedAt;
  try {
    const { rows } = await pool.query<{ applied_at: Date }>(
      `SELECT applied_at FROM ${MIGRATIONS_TABLE} WHERE id = $1`,
      [ONBOARDING_MIGRATION],
    );
    introducedAt = rows[0]?.applied_at ?? null;
  } catch {
    return null; // migrations table not created yet
  }
  return introducedAt;
}

export async function onboardingVariant(user: { createdAt: Date }): Promise<OnboardingVariant> {
  const since = await onboardingIntroducedAt();
  return since && user.createdAt < since ? 'returning' : 'new';
}

import { beforeAll, beforeEach } from 'vitest';
import { redis, initRedis } from '../db/redis.ts';
import { db } from '../db/index.ts';
import { sql } from 'drizzle-orm';

beforeAll(async () => {
  if (!redis.isOpen) {
    await initRedis();
  }
});

beforeEach(async () => {
  // Clear redis
  await redis.flushAll();

  const tables = [
    'user_favorites',
    'prost_vouchers',
    'user_friendships',
    'activity_feed',
    'user_achievements',
    'transaction_items',
    'transactions',
    'group_members',
    'groups',
    'product_variants',
    'buyables',
    'notifications',
    'nudges',
    'audit_logs',
    'promotions',
    'donation_contributions',
    'donation_goals',
    'users',
  ];

  // Single truncate command is faster and handles circular dependencies better
  const query = `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE`;
  await db.execute(sql.raw(query));
});

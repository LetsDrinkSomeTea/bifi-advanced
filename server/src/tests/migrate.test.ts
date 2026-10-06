import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, pool } from '../db/index.ts';
import { MIGRATIONS, MIGRATIONS_TABLE, runMigrations, type Migration } from '../db/migrate.ts';

const TEST_PREFIX = 'test_';

async function appliedIds(): Promise<string[]> {
  const res = await pool.query<{ id: string }>(`SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY id`);
  return res.rows.map((r) => r.id);
}

async function enumValues(typeName: string): Promise<string[]> {
  const res = await pool.query<{ v: string }>(
    `SELECT unnest(enum_range(NULL::${typeName}))::text AS v`,
  );
  return res.rows.map((r) => r.v);
}

describe('runMigrations', () => {
  afterEach(async () => {
    await db.execute(sql.raw('DROP TABLE IF EXISTS test_migrate_a, test_migrate_b'));
    await pool.query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE id LIKE '${TEST_PREFIX}%'`);
  });

  it('applies the bundled migrations idempotently on an up-to-date schema', async () => {
    await runMigrations();
    await runMigrations();

    const ids = await appliedIds();
    for (const m of MIGRATIONS) expect(ids).toContain(m.id);

    expect(await enumValues('transaction_type')).toContain('transfer');
    expect(await enumValues('notification_type')).toContain('transfer');
    expect(await enumValues('feed_type')).toContain('transfer_sent');

    const col = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_completed_at'",
    );
    expect(col.rowCount).toBe(1);
  });

  it('applies pending migrations in order and records them once', async () => {
    const migrations: Migration[] = [
      { id: 'test_0001', sql: ['CREATE TABLE test_migrate_a (id int)'] },
      { id: 'test_0002', sql: ['ALTER TABLE test_migrate_a ADD COLUMN name text'] },
    ];

    await runMigrations(migrations);
    await runMigrations(migrations);

    const ids = await appliedIds();
    expect(ids.filter((id) => id.startsWith(TEST_PREFIX))).toEqual(['test_0001', 'test_0002']);
    await pool.query("INSERT INTO test_migrate_a (id, name) VALUES (1, 'ok')");
  });

  it('rolls back a failing migration and does not record it', async () => {
    const migrations: Migration[] = [
      { id: 'test_0001', sql: ['CREATE TABLE test_migrate_a (id int)'] },
      {
        id: 'test_0002',
        sql: ['CREATE TABLE test_migrate_b (id int)', 'SELECT * FROM does_not_exist'],
      },
    ];

    await expect(runMigrations(migrations)).rejects.toThrow();

    const ids = await appliedIds();
    expect(ids).toContain('test_0001');
    expect(ids).not.toContain('test_0002');
    const res = await pool.query("SELECT to_regclass('test_migrate_b') AS t");
    expect(res.rows[0].t).toBeNull();
  });

  it('serialises concurrent runners so each migration runs exactly once', async () => {
    const migrations: Migration[] = [
      { id: 'test_0001', sql: ['CREATE TABLE test_migrate_a (id int)'] },
    ];

    // Without the advisory lock, the second CREATE TABLE would fail.
    await Promise.all([runMigrations(migrations), runMigrations(migrations)]);

    const ids = await appliedIds();
    expect(ids.filter((id) => id.startsWith(TEST_PREFIX))).toEqual(['test_0001']);
  });
});

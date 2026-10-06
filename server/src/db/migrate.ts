import { pool } from './index.ts';

// ─── Startup schema migrations ────────────────────────────────────────────────
// Fresh installs get the full schema from the bifi-postgres image (schema.sql,
// generated from schema.ts). Existing installs never re-run that init script, so
// every schema change after the initial install must also be listed here; the app
// applies pending entries on startup.
//
// Rules for new entries:
//   - Append only, never edit or reorder an entry that has shipped.
//   - Statements must be idempotent (IF NOT EXISTS, …): on a fresh install the
//     change is already part of schema.sql when the migration runs.
//   - Each entry runs in its own transaction. A new enum value cannot be used
//     in the same entry that adds it.

export interface Migration {
  id: string;
  sql: string[];
}

export const MIGRATIONS_TABLE = 'bifi_schema_migrations';

export const MIGRATIONS: Migration[] = [
  {
    id: '0001_money_transfers',
    sql: [
      "ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'transfer'",
      "ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'transfer'",
      "ALTER TYPE feed_type ADD VALUE IF NOT EXISTS 'transfer_sent'",
    ],
  },
];

export async function runMigrations(migrations: Migration[] = MIGRATIONS): Promise<void> {
  const client = await pool.connect();
  try {
    // Session-level lock: several app instances starting at once apply each migration once.
    await client.query(`SELECT pg_advisory_lock(hashtext('${MIGRATIONS_TABLE}'))`);
    try {
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
          id text PRIMARY KEY,
          applied_at timestamp NOT NULL DEFAULT now()
        )`,
      );
      const { rows } = await client.query<{ id: string }>(`SELECT id FROM ${MIGRATIONS_TABLE}`);
      const applied = new Set(rows.map((r) => r.id));

      for (const migration of migrations) {
        if (applied.has(migration.id)) continue;
        await client.query('BEGIN');
        try {
          for (const statement of migration.sql) {
            await client.query(statement);
          }
          await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (id) VALUES ($1)`, [migration.id]);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw new Error(`Migration ${migration.id} failed`, { cause: err });
        }
        console.log(`[migrate] applied ${migration.id}`);
      }
    } finally {
      await client.query(`SELECT pg_advisory_unlock(hashtext('${MIGRATIONS_TABLE}'))`);
    }
  } finally {
    client.release();
  }
}

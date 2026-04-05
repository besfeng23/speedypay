import 'server-only';

import { Pool, PoolClient, QueryResultRow } from 'pg';
import { getDatabaseUrlOrThrow, validateDatabaseConfig } from './config';
import { dbMigrations } from './migrations';
import { seedAuditLogs, seedMerchants, seedPayments, seedSettlements } from './seed-data';

type MigrationRow = { version: number };

declare global {
  // eslint-disable-next-line no-var
  var __speedypayPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __speedypayDbInitPromise: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!globalThis.__speedypayPool) {
    validateDatabaseConfig();
    globalThis.__speedypayPool = new Pool({
      connectionString: getDatabaseUrlOrThrow(),
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_MS ?? 10_000),
    });
  }

  return globalThis.__speedypayPool;
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function queryRows<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureDatabaseInitialized();
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await queryRows<T>(sql, params);
  return rows[0];
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureDatabaseInitialized();
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (!globalThis.__speedypayDbInitPromise) {
    globalThis.__speedypayDbInitPromise = bootstrapDatabase();
  }

  return globalThis.__speedypayDbInitPromise;
}

async function bootstrapDatabase(): Promise<void> {
  await withClient(async (client) => {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', ['speedypay_schema_migration_lock']);

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const appliedRows = await client.query<MigrationRow>('SELECT version FROM schema_migrations');
      const appliedSet = new Set(appliedRows.rows.map((row) => row.version));

      for (const migration of dbMigrations) {
        if (appliedSet.has(migration.version)) continue;

        await client.query('BEGIN');
        try {
          await client.query(migration.sql);
          await client.query('INSERT INTO schema_migrations(version, name) VALUES ($1, $2)', [migration.version, migration.name]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }

      await seedCoreData(client);
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', ['speedypay_schema_migration_lock']);
    }
  });
}

async function seedCoreData(client: PoolClient): Promise<void> {
  const merchantCountResult = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM merchants');
  const merchantCount = Number(merchantCountResult.rows[0]?.count ?? '0');

  if (merchantCount > 0) return;

  for (const merchant of seedMerchants) {
    await client.query(
      'INSERT INTO merchants(id, created_at, payload) VALUES ($1, $2::timestamptz, $3::jsonb) ON CONFLICT (id) DO NOTHING',
      [merchant.id, merchant.createdAt, JSON.stringify(merchant)]
    );
  }

  for (const payment of seedPayments) {
    await client.query(
      'INSERT INTO payments(id, merchant_id, created_at, payload) VALUES ($1, $2, $3::timestamptz, $4::jsonb) ON CONFLICT (id) DO NOTHING',
      [payment.id, payment.merchantId, payment.createdAt, JSON.stringify(payment)]
    );
  }

  for (const settlement of seedSettlements) {
    await client.query(
      'INSERT INTO settlements(id, payment_id, merchant_id, created_at, payload) VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb) ON CONFLICT (id) DO NOTHING',
      [settlement.id, settlement.paymentId, settlement.merchantId, settlement.createdAt, JSON.stringify(settlement)]
    );
  }

  for (const log of seedAuditLogs) {
    await client.query(
      'INSERT INTO audit_logs(id, timestamp, event_identifier, entity_id, payload) VALUES ($1, $2::timestamptz, $3, $4, $5::jsonb) ON CONFLICT (id) DO NOTHING',
      [log.id, log.timestamp, log.eventIdentifier ?? null, log.entityId, JSON.stringify(log)]
    );
  }
}

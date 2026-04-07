import 'server-only';

import { Pool, PoolClient, QueryResultRow } from 'pg';
import { getDatabaseUrlOrThrow, validateDatabaseConfig } from './config';
import { dbMigrations } from './migrations';
import { seedAuditLogs, seedEntities, seedMerchantAccounts, seedPayments, seedSettlementDestinations, seedSettlements, seedTenants, seedAllocationRules, seedPayouts } from './seed-data';

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
  const entityCountResult = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM entities');
  const entityCount = Number(entityCountResult.rows[0]?.count ?? '0');

  if (entityCount > 0) return;

  for (const entity of seedEntities) {
    await client.query(
      'INSERT INTO entities (id, legal_name, display_name, entity_type, parent_entity_id, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
      [entity.id, entity.legalName, entity.displayName, entity.entityType, entity.parentEntityId, entity.status, entity.metadata, entity.createdAt, entity.updatedAt]
    );
  }
  
  for (const tenant of seedTenants) {
    await client.query(
      'INSERT INTO tenants (id, entity_id, tenant_code, status, settings, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
      [tenant.id, tenant.entityId, tenant.tenantCode, tenant.status, tenant.settings, tenant.createdAt, tenant.updatedAt]
    );
  }

  for (const merchant of seedMerchantAccounts) {
    await client.query(
      'INSERT INTO merchant_accounts (id, entity_id, tenant_id, onboarding_status, kyc_status, settlement_status, default_settlement_destination_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
      [merchant.id, merchant.entityId, merchant.tenantId, merchant.onboardingStatus, merchant.kycStatus, merchant.settlementStatus, merchant.defaultSettlementDestinationId, merchant.createdAt, merchant.updatedAt]
    );
  }

  for (const destination of seedSettlementDestinations) {
    await client.query(
      'INSERT INTO settlement_destinations (id, merchant_account_id, destination_type, account_name, account_number_masked, bank_code, provider_reference, verification_status, is_default, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING',
      [destination.id, destination.merchantAccountId, destination.destinationType, destination.accountName, destination.accountNumberMasked, destination.bankCode, destination.providerReference, destination.verificationStatus, destination.isDefault, destination.createdAt, destination.updatedAt]
    );
  }
  
  for (const rule of seedAllocationRules) {
      await client.query(
          'INSERT INTO allocation_rules (id, tenant_id, merchant_account_id, payment_method, rule_type, percentage_value, flat_value, recipient_entity_id, priority, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING',
          [rule.id, rule.tenantId, rule.merchantAccountId, rule.paymentMethod, rule.ruleType, rule.percentageValue, rule.flatValue, rule.recipientEntityId, rule.priority, rule.active, rule.createdAt, rule.updatedAt]
      );
  }

  for (const payment of seedPayments) {
    await client.query(
      'INSERT INTO payments(id, tenant_id, merchant_id, created_at, payload, merchant_account_id) VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb, $3) ON CONFLICT (id) DO NOTHING',
      [payment.id, payment.tenantId, payment.merchantId, payment.createdAt, JSON.stringify(payment)]
    );
  }

  for (const settlement of seedSettlements) {
    await client.query(
      'INSERT INTO settlements(id, tenant_id, payment_id, merchant_id, created_at, payload, merchant_account_id, status) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::jsonb, $4, $7) ON CONFLICT (id) DO NOTHING',
      [settlement.id, settlement.tenantId, settlement.paymentId, settlement.merchantId, settlement.createdAt, JSON.stringify(settlement), settlement.status]
    );
  }
  
  for (const payout of seedPayouts) {
    await client.query(
      'INSERT INTO payouts(id, settlement_id, merchant_account_id, settlement_destination_id, amount_cents, currency, status, provider_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
      [payout.id, payout.settlementId, payout.merchantAccountId, payout.settlementDestinationId, Math.round(payout.amount * 100), payout.currency, payout.status, payout.providerName, payout.createdAt, payout.updatedAt]
    );
  }

  for (const log of seedAuditLogs) {
    await client.query(
      'INSERT INTO audit_logs(id, timestamp, event_identifier, entity_id, payload) VALUES ($1, $2::timestamptz, $3, $4, $5::jsonb) ON CONFLICT (id) DO NOTHING',
      [log.id, log.timestamp, log.eventIdentifier ?? null, log.entityId, JSON.stringify(log)]
    );
  }
}

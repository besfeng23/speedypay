export type DbMigration = {
  version: number;
  name: string;
  sql: string;
};

export const dbMigrations: DbMigration[] = [
  {
    version: 1,
    name: 'initial_managed_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        merchant_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        event_identifier TEXT,
        entity_id TEXT,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS uat_logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        event_identifier TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        order_seq TEXT,
        trans_seq TEXT,
        received_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        lease_expires_at TIMESTAMPTZ,
        last_error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_merchants_created_at ON merchants(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_merchant_id ON payments(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_settlements_merchant_id ON settlements(merchant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_payment_id ON settlements(payment_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_event_identifier ON audit_logs(event_identifier) WHERE event_identifier IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_webhook_events_state ON webhook_events(state);
    `,
  },
];

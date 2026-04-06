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
      CREATE TABLE IF NOT EXISTS merchants_v1_deprecated (
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
  {
    version: 2,
    name: 'add_tenants_v1',
    sql: `
      CREATE TABLE IF NOT EXISTS tenants_v1_deprecated (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      ALTER TABLE merchants_v1_deprecated ADD COLUMN IF NOT EXISTS tenant_id TEXT;
      
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);

      ALTER TABLE settlements ADD COLUMN IF NOT EXISTS tenant_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_settlements_tenant_id ON settlements(tenant_id);
    `
  },
  {
    version: 3,
    name: 'multi_entity_refactor',
    sql: `
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        legal_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        parent_entity_id TEXT,
        status TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_entities_entity_type ON entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entities_parent_entity_id ON entities(parent_entity_id);

      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL UNIQUE REFERENCES entities(id),
        tenant_code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        settings JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

      CREATE TABLE IF NOT EXISTS merchant_accounts (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL UNIQUE REFERENCES entities(id),
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        onboarding_status TEXT NOT NULL,
        kyc_status TEXT NOT NULL,
        settlement_status TEXT NOT NULL,
        default_settlement_destination_id TEXT,
        fee_profile_id TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_accounts_tenant_id ON merchant_accounts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_merchant_accounts_onboarding_status ON merchant_accounts(onboarding_status);
      
      CREATE TABLE IF NOT EXISTS settlement_destinations (
        id TEXT PRIMARY KEY,
        merchant_account_id TEXT NOT NULL REFERENCES merchant_accounts(id),
        destination_type TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_number_masked TEXT NOT NULL,
        bank_code TEXT NOT NULL,
        provider_reference TEXT,
        verification_status TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_settlement_destinations_merchant_account_id ON settlement_destinations(merchant_account_id);

      CREATE TABLE IF NOT EXISTS fee_profiles (
        id TEXT PRIMARY KEY,
        owner_entity_id TEXT NOT NULL REFERENCES entities(id),
        tenant_id TEXT REFERENCES tenants(id),
        merchant_account_id TEXT REFERENCES merchant_accounts(id),
        fee_type TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        percentage_value NUMERIC,
        flat_value NUMERIC,
        priority INTEGER NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_fee_profiles_owner_entity_id ON fee_profiles(owner_entity_id);

      -- Add foreign key constraint to payments and settlements table to link to new merchant_accounts table
      -- We keep the old merchant_id column for now for a gradual migration if needed, but new logic will use merchant_account_id
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS merchant_account_id TEXT;
      ALTER TABLE settlements ADD COLUMN IF NOT EXISTS merchant_account_id TEXT;
    `
  },
  {
    version: 4,
    name: 'add_allocation_engine',
    sql: `
      DROP TABLE IF EXISTS fee_profiles;
      
      ALTER TABLE merchant_accounts DROP COLUMN IF EXISTS fee_profile_id;
      
      CREATE TABLE IF NOT EXISTS allocation_rules (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        merchant_account_id TEXT,
        payment_method TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        percentage_value NUMERIC,
        flat_value NUMERIC,
        recipient_entity_id TEXT NOT NULL,
        priority INTEGER NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_allocation_rules_active ON allocation_rules(active);
      CREATE INDEX IF NOT EXISTS idx_allocation_rules_priority ON allocation_rules(priority);

      CREATE TABLE IF NOT EXISTS payment_allocations (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        allocation_type TEXT NOT NULL,
        recipient_entity_id TEXT NOT NULL,
        basis_type TEXT NOT NULL,
        amount_cents BIGINT NOT NULL,
        currency TEXT NOT NULL,
        rule_reference TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
    `
  }
];

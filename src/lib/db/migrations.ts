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
        entity_id TEXT NOT NULL UNIQUE,
        tenant_code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        settings JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

      CREATE TABLE IF NOT EXISTS merchant_accounts (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL UNIQUE,
        tenant_id TEXT NOT NULL,
        onboarding_status TEXT NOT NULL,
        kyc_status TEXT NOT NULL,
        settlement_status TEXT NOT NULL,
        default_settlement_destination_id TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_accounts_tenant_id ON merchant_accounts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_merchant_accounts_onboarding_status ON merchant_accounts(onboarding_status);
      
      CREATE TABLE IF NOT EXISTS settlement_destinations (
        id TEXT PRIMARY KEY,
        merchant_account_id TEXT NOT NULL,
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
        payment_id TEXT NOT NULL,
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
  },
  {
    version: 5,
    name: 'add_ledger_layer',
    sql: `
      CREATE TABLE IF NOT EXISTS ledger_transactions (
        id TEXT PRIMARY KEY,
        payment_id TEXT,
        payout_id TEXT,
        transaction_type TEXT NOT NULL,
        status TEXT NOT NULL,
        reference TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_transactions_payment_id ON ledger_transactions(payment_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_transactions_transaction_type ON ledger_transactions(transaction_type);

      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        ledger_transaction_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        account_code TEXT NOT NULL,
        entry_type TEXT NOT NULL, -- 'debit' or 'credit'
        amount_cents BIGINT NOT NULL,
        currency TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger_transaction_id ON ledger_entries(ledger_transaction_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_code ON ledger_entries(account_code);
    `
  },
  {
    version: 6,
    name: 'refactor_payout_architecture',
    sql: `
      CREATE TABLE IF NOT EXISTS payouts (
        id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        merchant_account_id TEXT NOT NULL,
        settlement_destination_id TEXT NOT NULL,
        amount_cents BIGINT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        provider_name TEXT,
        provider_trans_seq TEXT,
        provider_resp_code TEXT,
        provider_resp_message TEXT,
        provider_trans_state TEXT,
        provider_trans_state_label TEXT,
        signature_verified BOOLEAN,
        payout_channel_proc_id TEXT,
        payout_channel_description TEXT,
        provider_timestamp TIMESTAMPTZ,
        last_query_at TIMESTAMPTZ,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_settlement_id ON payouts(settlement_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_merchant_account_id ON payouts(merchant_account_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

      -- Modify settlements table to be purely internal
      ALTER TABLE settlements RENAME COLUMN settlement_status TO status;
      ALTER TABLE settlements ALTER COLUMN payload DROP NOT NULL;
      ALTER TABLE settlements ADD COLUMN payout_id TEXT;
      ALTER TABLE settlements DROP COLUMN IF EXISTS remittance_status;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_name;
      ALTER TABLE settlements DROP COLUMN IF EXISTS payout_reference;
      ALTER TABLE settlements DROP COLUMN IF EXISTS failure_reason;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_order_seq;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_trans_seq;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_resp_code;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_resp_message;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_trans_state;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_trans_state_label;
      ALTER TABLE settlements DROP COLUMN IF EXISTS signature_verified;
      ALTER TABLE settlements DROP COLUMN IF EXISTS payout_channel_proc_id;
      ALTER TABLE settlements DROP COLUMN IF EXISTS payout_channel_description;
      ALTER TABLE settlements DROP COLUMN IF EXISTS last_query_at;
      ALTER TABLE settlements DROP COLUMN IF EXISTS provider_timestamp;

      -- Modify payments table to simplify settlement status
      ALTER TABLE payments ALTER COLUMN payload DROP NOT NULL;
    `
  }
];

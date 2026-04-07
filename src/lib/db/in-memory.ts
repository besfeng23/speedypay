/**
 * @file Managed Postgres-backed repository implementation.
 *
 * NOTE: File retained as `in-memory.ts` to preserve repository import seams.
 */

import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog, Merchant, Payment, Settlement, Tenant, UATLog, UATTestCase, Entity, MerchantAccount, TenantRecord, SettlementDestination, AllocationRule, PaymentAllocation, LedgerTransaction, LedgerEntry } from '@/lib/types';
import { uatTestCases, seedEntities, seedMerchantAccounts, seedTenants, seedSettlementDestinations, seedPayments, seedSettlements, seedAuditLogs, seedAllocationRules } from './seed-data';
import { queryOne, queryRows, withTransaction } from './postgres';
import type { PoolClient } from 'pg';

type WebhookEventState = 'received' | 'processing' | 'processed' | 'failed';

const PROCESSING_LEASE_INTERVAL = '2 minutes';


// =================================================================
// NEW MULTI-ENTITY DATA ACCESS
// =================================================================

// --- Read operations ---

export const getAllEntities = async (): Promise<Entity[]> => {
  const rows = await queryRows<{ payload: Entity }>('SELECT payload FROM entities ORDER BY created_at DESC');
  return rows.map((row) => row.payload);
};

export const findEntityById = async (id: string): Promise<Entity | undefined> => {
  const row = await queryOne<{ payload: Entity }>('SELECT payload FROM entities WHERE id = $1', [id]);
  return row?.payload;
};

export const getAllTenants = async (): Promise<Tenant[]> => {
  const rows = await queryRows<TenantRecord>('SELECT * FROM tenants ORDER BY created_at DESC');
  const entities = await getAllEntities();
  const entityMap = new Map(entities.map(e => [e.id, e]));

  return rows.map(tenantRecord => ({
    ...tenantRecord,
    name: entityMap.get(tenantRecord.entityId)?.displayName || 'Unknown',
    notes: entityMap.get(tenantRecord.entityId)?.metadata?.notes || '',
    platformFeeType: entityMap.get(tenantRecord.entityId)?.metadata?.platformFeeType || 'percentage',
    platformFeeValue: entityMap.get(tenantRecord.entityId)?.metadata?.platformFeeValue || 0,
    entity: entityMap.get(tenantRecord.entityId)!,
  }));
};

export const findTenantById = async (id: string): Promise<Tenant | undefined> => {
    const tenantRecord = await queryOne<TenantRecord>('SELECT * FROM tenants WHERE id = $1', [id]);
    if (!tenantRecord) return undefined;

    const entity = await findEntityById(tenantRecord.entityId);
    if (!entity) return undefined;

    return { 
        ...tenantRecord, 
        name: entity.displayName,
        notes: entity.metadata?.notes,
        platformFeeType: entity.metadata?.platformFeeType,
        platformFeeValue: entity.metadata?.platformFeeValue,
        entity 
    };
};

export const getAllMerchants = async (): Promise<Merchant[]> => {
    const merchantAccounts = await queryRows<MerchantAccount>('SELECT * FROM merchant_accounts ORDER BY created_at DESC');
    const tenants = await getAllTenants();
    const entities = await getAllEntities();
    const settlementDests = await queryRows<SettlementDestination>('SELECT * FROM settlement_destinations');

    const tenantMap = new Map(tenants.map(t => [t.id, t]));
    const entityMap = new Map(entities.map(e => [e.id, e]));
    const settlementDestMap = new Map(settlementDests.map(d => [d.id, d]));

    return merchantAccounts.map(ma => {
        const entity = entityMap.get(ma.entityId)!;
        return {
            ...ma,
            businessName: entity.legalName,
            displayName: entity.displayName,
            contactName: entity.metadata.contactName,
            email: entity.metadata.email,
            mobile: entity.metadata.mobile,
            notes: entity.metadata.notes,
            status: entity.status as 'active' | 'inactive' | 'suspended',
            propertyAssociations: entity.metadata.propertyAssociations || [],
            defaultFeeType: entity.metadata.defaultFeeType || 'percentage',
            defaultFeeValue: entity.metadata.defaultFeeValue || 0,
            settlementAccountName: settlementDestMap.get(ma.defaultSettlementDestinationId || '')?.accountName || '',
            settlementAccountNumberOrWalletId: settlementDestMap.get(ma.defaultSettlementDestinationId || '')?.accountNumberMasked || '',
            defaultPayoutChannel: settlementDestMap.get(ma.defaultSettlementDestinationId || '')?.bankCode || '',
            entity,
            tenant: tenantMap.get(ma.tenantId)!,
            defaultSettlementDestination: ma.defaultSettlementDestinationId ? settlementDestMap.get(ma.defaultSettlementDestinationId) ?? null : null,
        }
    });
}

export const findMerchantById = async (id: string): Promise<Merchant | undefined> => {
    const merchantAccount = await queryOne<MerchantAccount>('SELECT * FROM merchant_accounts WHERE id = $1', [id]);
    if (!merchantAccount) return undefined;

    const [tenant, entity, settlementDests] = await Promise.all([
        findTenantById(merchantAccount.tenantId),
        findEntityById(merchantAccount.entityId),
        queryRows<SettlementDestination>('SELECT * FROM settlement_destinations WHERE merchant_account_id = $1', [id])
    ]);
    
    if (!tenant || !entity) return undefined;
    
    const settlementDestMap = new Map(settlementDests.map(d => [d.id, d]));
    const defaultDest = merchantAccount.defaultSettlementDestinationId ? settlementDestMap.get(merchantAccount.defaultSettlementDestinationId) ?? null : null;

    return {
        ...merchantAccount,
        businessName: entity.legalName,
        displayName: entity.displayName,
        contactName: entity.metadata.contactName,
        email: entity.metadata.email,
        mobile: entity.metadata.mobile,
        notes: entity.metadata.notes,
        status: entity.status as 'active' | 'inactive' | 'suspended',
        propertyAssociations: entity.metadata.propertyAssociations || [],
        defaultFeeType: entity.metadata.defaultFeeType || 'percentage',
        defaultFeeValue: entity.metadata.defaultFeeValue || 0,
        settlementAccountName: defaultDest?.accountName || '',
        settlementAccountNumberOrWalletId: defaultDest?.accountNumberMasked || '',
        defaultPayoutChannel: defaultDest?.bankCode || '',
        entity,
        tenant,
        defaultSettlementDestination: defaultDest,
    };
}

export const getMerchantsByTenantId = async (tenantId: string): Promise<Merchant[]> => {
    const allMerchants = await getAllMerchants();
    return allMerchants.filter(m => m.tenantId === tenantId);
}


// Tenants
export const addTenant = async (tenant: Tenant): Promise<Tenant> => {
  await withTransaction(async client => {
    await client.query(
      'INSERT INTO entities (id, legal_name, display_name, entity_type, parent_entity_id, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [tenant.entity.id, tenant.entity.legalName, tenant.entity.displayName, tenant.entity.entityType, tenant.entity.parentEntityId, tenant.entity.status, tenant.entity.metadata, tenant.entity.createdAt, tenant.entity.updatedAt]
    );
    await client.query(
      'INSERT INTO tenants (id, entity_id, tenant_code, status, settings, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [tenant.id, tenant.entityId, tenant.tenantCode, tenant.status, tenant.settings, tenant.createdAt, tenant.updatedAt]
    );
  });
  return tenant;
};

// Merchants
export const addMerchant = async (merchant: Merchant): Promise<Merchant> => {
  await withTransaction(async client => {
     await client.query(
      'INSERT INTO entities (id, legal_name, display_name, entity_type, parent_entity_id, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [merchant.entity.id, merchant.entity.legalName, merchant.entity.displayName, merchant.entity.entityType, merchant.entity.parentEntityId, merchant.entity.status, merchant.entity.metadata, merchant.entity.createdAt, merchant.entity.updatedAt]
    );
    await client.query(
      'INSERT INTO merchant_accounts (id, entity_id, tenant_id, onboarding_status, kyc_status, settlement_status, default_settlement_destination_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [merchant.id, merchant.entityId, merchant.tenantId, merchant.onboardingStatus, merchant.kycStatus, merchant.settlementStatus, merchant.defaultSettlementDestinationId, merchant.createdAt, merchant.updatedAt]
    );
  });
  return merchant;
};

// Payments
export const getAllPayments = async (): Promise<Payment[]> => {
  const rows = await queryRows<{ payload: Payment }>('SELECT payload FROM payments ORDER BY created_at DESC');
  return rows.map((row) => row.payload);
};

export const findPaymentById = async (id: string): Promise<Payment | undefined> => {
  const row = await queryOne<{ payload: Payment }>('SELECT payload FROM payments WHERE id = $1', [id]);
  return row?.payload;
};

export const addPayment = async (payment: Payment, client?: PoolClient): Promise<Payment> => {
  const query = 'INSERT INTO payments (id, tenant_id, merchant_id, created_at, payload, merchant_account_id) VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb, $3)';
  const params = [payment.id, payment.tenantId, payment.merchantId, payment.createdAt, JSON.stringify(payment)];
  
  if (client) {
      await client.query(query, params);
  } else {
      await queryRows(query, params);
  }
  return payment;
};

export const updatePayment = async (id: string, updatedData: Partial<Payment>): Promise<Payment | undefined> => {
  const current = await findPaymentById(id);
  if (!current) return undefined;
  const updated: Payment = { ...current, ...updatedData, updatedAt: formatISO(new Date()) };

  await queryRows(
    'UPDATE payments SET tenant_id = $1, merchant_id = $2, created_at = $3::timestamptz, payload = $4::jsonb, merchant_account_id = $2 WHERE id = $5',
    [updated.tenantId, updated.merchantId, updated.createdAt, JSON.stringify(updated), id]
  );

  return updated;
};

// Settlements
export const getAllSettlements = async (): Promise<Settlement[]> => {
  const rows = await queryRows<{ payload: Settlement }>('SELECT payload FROM settlements ORDER BY created_at DESC');
  return rows.map((row) => row.payload);
};

export const findSettlementById = async (id: string): Promise<Settlement | undefined> => {
  const row = await queryOne<{ payload: Settlement }>('SELECT payload FROM settlements WHERE id = $1', [id]);
  return row?.payload;
};

export const findSettlementByPaymentId = async (paymentId: string): Promise<Settlement | undefined> => {
  const row = await queryOne<{ payload: Settlement }>('SELECT payload FROM settlements WHERE payment_id = $1', [paymentId]);
  return row?.payload;
};

export const addSettlement = async (settlement: Settlement): Promise<Settlement> => {
  await queryRows(
    'INSERT INTO settlements (id, tenant_id, payment_id, merchant_id, created_at, payload, merchant_account_id) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::jsonb, $4)',
    [settlement.id, settlement.tenantId, settlement.paymentId, settlement.merchantId, settlement.createdAt, JSON.stringify(settlement)]
  );

  return settlement;
};

export const updateSettlement = async (id: string, updatedData: Partial<Settlement>): Promise<Settlement | undefined> => {
  const current = await findSettlementById(id);
  if (!current) return undefined;
  const updated: Settlement = { ...current, ...updatedData, updatedAt: formatISO(new Date()) };

  await queryRows(
    'UPDATE settlements SET tenant_id = $1, payment_id = $2, merchant_id = $3, created_at = $4::timestamptz, payload = $5::jsonb, merchant_account_id = $3 WHERE id = $6',
    [updated.tenantId, updated.paymentId, updated.merchantId, updated.createdAt, JSON.stringify(updated), id]
  );

  return updated;
};

// Audit Logs
export const getAllAuditLogs = async (): Promise<AuditLog[]> => {
  const rows = await queryRows<{ payload: AuditLog }>('SELECT payload FROM audit_logs ORDER BY timestamp DESC');
  return rows.map((row) => row.payload);
};

export const findAuditLogByEventIdentifier = async (eventIdentifier: string): Promise<AuditLog | undefined> => {
  const row = await queryOne<{ payload: AuditLog }>('SELECT payload FROM audit_logs WHERE event_identifier = $1 LIMIT 1', [eventIdentifier]);
  return row?.payload;
};

export const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
  const now = formatISO(new Date());
  const newLog: AuditLog = {
    ...log,
    id: `log-${uuidv4()}`,
    timestamp: now,
  };

  await queryRows(
    'INSERT INTO audit_logs (id, timestamp, event_identifier, entity_id, payload) VALUES ($1, $2::timestamptz, $3, $4, $5::jsonb)',
    [newLog.id, newLog.timestamp, newLog.eventIdentifier ?? null, newLog.entityId, JSON.stringify(newLog)]
  );

  return newLog;
};

// --- Allocation Engine ---
export const getAllocationRules = async(): Promise<AllocationRule[]> => {
    return queryRows<AllocationRule>('SELECT * FROM allocation_rules WHERE active = true ORDER BY priority ASC');
}

export const getPaymentAllocationsByPaymentId = async (paymentId: string): Promise<PaymentAllocation[]> => {
    const rows = await queryRows<{payload: any}>('SELECT payload FROM payment_allocations WHERE payment_id = $1 ORDER BY created_at ASC', [paymentId]);
    return rows.map(r => ({ ...r.payload, amount: r.payload.amount_cents / 100 }));
}

export const addPaymentAllocations = async (allocations: Omit<PaymentAllocation, 'id'|'createdAt'>[], client?: PoolClient): Promise<void> => {
    const now = new Date();
    const query = 'INSERT INTO payment_allocations (id, payment_id, allocation_type, recipient_entity_id, basis_type, amount_cents, currency, rule_reference, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    
    for (const alloc of allocations) {
        const fullAlloc: PaymentAllocation = {
            ...alloc,
            id: `alloc-${uuidv4()}`,
            createdAt: formatISO(now),
        };
        const params = [
            fullAlloc.id,
            fullAlloc.paymentId,
            fullAlloc.allocationType,
            fullAlloc.recipientEntityId,
            fullAlloc.basisType,
            Math.round(fullAlloc.amount * 100), // Store as cents
            fullAlloc.currency,
            fullAlloc.ruleReference,
            fullAlloc.createdAt
        ];
        if (client) {
            await client.query(query, params);
        } else {
            await queryRows(query, params);
        }
    }
}

// --- Ledger ---
export async function addLedgerTransactionAndEntries(
    transaction: Omit<LedgerTransaction, 'id' | 'createdAt' | 'updatedAt'>,
    entries: Omit<LedgerEntry, 'id' | 'createdAt'>[],
    client?: PoolClient
): Promise<void> {
    const now = formatISO(new Date());
    const fullTransaction: LedgerTransaction = {
        ...transaction,
        id: `lgr-txn-${uuidv4()}`,
        createdAt: now,
        updatedAt: now,
    };

    const transactionQuery = 'INSERT INTO ledger_transactions (id, payment_id, payout_id, transaction_type, status, reference, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    const transactionParams = [fullTransaction.id, fullTransaction.paymentId, fullTransaction.payoutId, fullTransaction.transactionType, fullTransaction.status, fullTransaction.reference, fullTransaction.createdAt, fullTransaction.updatedAt];

    if (client) {
        await client.query(transactionQuery, transactionParams);
    } else {
        await queryRows(transactionQuery, transactionParams);
    }

    const entryQuery = 'INSERT INTO ledger_entries (id, ledger_transaction_id, entity_id, account_code, entry_type, amount_cents, currency, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    for (const entry of entries) {
        const fullEntry: LedgerEntry = {
            ...entry,
            id: `lgr-ent-${uuidv4()}`,
            ledgerTransactionId: fullTransaction.id,
            createdAt: now,
        };
        const entryParams = [
            fullEntry.id,
            fullEntry.ledgerTransactionId,
            fullEntry.entityId,
            fullEntry.accountCode,
            fullEntry.entryType,
            Math.round(fullEntry.amount * 100), // Store as cents
            fullEntry.currency,
            fullEntry.description,
            fullEntry.createdAt,
        ];
        if (client) {
            await client.query(entryQuery, entryParams);
        } else {
            await queryRows(entryQuery, entryParams);
        }
    }
}


// Webhook events (durable idempotency)
export const claimWebhookEventForProcessing = async (
  eventIdentifier: string,
  orderSeq?: string,
  transSeq?: string
): Promise<'started' | 'already-processed' | 'in-progress'> => {
  return withTransaction(async (client) => {
    const existing = await client.query<{ state: WebhookEventState; lease_expires_at: string | null }>(
      'SELECT state, lease_expires_at FROM webhook_events WHERE event_identifier = $1 FOR UPDATE',
      [eventIdentifier]
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO webhook_events (event_identifier, state, order_seq, trans_seq, received_at, updated_at, lease_expires_at)
         VALUES ($1, 'processing', $2, $3, NOW(), NOW(), NOW() + INTERVAL '${PROCESSING_LEASE_INTERVAL}')`,
        [eventIdentifier, orderSeq ?? null, transSeq ?? null]
      );
      return 'started';
    }

    const row = existing.rows[0];
    if (row.state === 'processed') {
      return 'already-processed';
    }

    const leaseExpired = row.lease_expires_at ? new Date(row.lease_expires_at).getTime() <= Date.now() : true;
    if (row.state === 'failed' || leaseExpired) {
      await client.query(
        `UPDATE webhook_events
         SET state = 'processing',
             order_seq = COALESCE(order_seq, $2),
             trans_seq = COALESCE(trans_seq, $3),
             updated_at = NOW(),
             lease_expires_at = NOW() + INTERVAL '${PROCESSING_LEASE_INTERVAL}',
             last_error = NULL
         WHERE event_identifier = $1`,
        [eventIdentifier, orderSeq ?? null, transSeq ?? null]
      );
      return 'started';
    }

    return 'in-progress';
  });
};

export const markWebhookEventProcessed = async (eventIdentifier: string): Promise<void> => {
  await queryRows(
    "UPDATE webhook_events SET state = 'processed', updated_at = NOW(), lease_expires_at = NULL, last_error = NULL WHERE event_identifier = $1",
    [eventIdentifier]
  );
};

export const releaseWebhookEventClaim = async (eventIdentifier: string, errorMessage?: string): Promise<void> => {
  await queryRows(
    "UPDATE webhook_events SET state = 'failed', updated_at = NOW(), lease_expires_at = NULL, last_error = $2 WHERE event_identifier = $1",
    [eventIdentifier, errorMessage ?? null]
  );
};

// UAT
export const getAllUATLogs = async (): Promise<UATLog[]> => {
  const rows = await queryRows<{ payload: UATLog }>('SELECT payload FROM uat_logs ORDER BY timestamp DESC');
  return rows.map((row) => row.payload);
};

export const getUATTestCases = (): UATTestCase[] => uatTestCases;

export const addUATLog = async (log: Omit<UATLog, 'id' | 'timestamp'>): Promise<UATLog> => {
  const newLog: UATLog = {
    ...log,
    id: `uatlog-${uuidv4()}`,
    timestamp: formatISO(new Date()),
  };

  await queryRows(
    'INSERT INTO uat_logs (id, timestamp, payload) VALUES ($1, $2::timestamptz, $3::jsonb)',
    [newLog.id, newLog.timestamp, JSON.stringify(newLog)]
  );

  return newLog;
};

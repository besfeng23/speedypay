/**
 * @file In-memory mock database implementation for development and testing.
 * This implementation uses seed data and operates on in-memory arrays,
 * allowing the application to run without a live database connection.
 */

import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { PoolClient } from 'pg';
import type { AuditLog, Merchant, Payment, Settlement, Tenant, UATLog, UATTestCase, Entity, MerchantAccount, TenantRecord, SettlementDestination, AllocationRule, PaymentAllocation, LedgerTransaction, LedgerEntry, Payout } from '@/lib/types';
import { uatTestCases, seedEntities, seedMerchantAccounts, seedTenants, seedSettlementDestinations, seedPayments, seedSettlements, seedAuditLogs, seedAllocationRules, seedPayouts } from './seed-data';

// --- In-Memory Data Stores ---
const entities: Entity[] = [...seedEntities];
const tenants: TenantRecord[] = [...seedTenants];
const merchantAccounts: MerchantAccount[] = [...seedMerchantAccounts];
const settlementDestinations: SettlementDestination[] = [...seedSettlementDestinations];
const allocationRules: AllocationRule[] = [...seedAllocationRules];
const payments: Payment[] = [...seedPayments];
const settlements: Settlement[] = [...seedSettlements];
const payouts: Payout[] = [...seedPayouts];
const auditLogs: AuditLog[] = [...seedAuditLogs];
const uatLogs: UATLog[] = [];
const paymentAllocations: PaymentAllocation[] = [];
const ledgerTransactions: LedgerTransaction[] = [];
const ledgerEntries: LedgerEntry[] = [];
const webhookEvents: any[] = [];


// =================================================================
// DATA ACCESS IMPLEMENTATION
// =================================================================

// --- Read operations ---

export const getAllEntities = async (): Promise<Entity[]> => Promise.resolve(entities);

export const findEntityById = async (id: string): Promise<Entity | undefined> => {
  return Promise.resolve(entities.find(e => e.id === id));
};

export const getAllTenants = async (): Promise<Tenant[]> => {
  const entityMap = new Map(entities.map(e => [e.id, e]));

  return Promise.resolve(tenants.map(tenantRecord => ({
    ...tenantRecord,
    name: entityMap.get(tenantRecord.entityId)?.displayName || 'Unknown',
    notes: entityMap.get(tenantRecord.entityId)?.metadata?.notes || '',
    platformFeeType: entityMap.get(tenantRecord.entityId)?.metadata?.platformFeeType || 'percentage',
    platformFeeValue: entityMap.get(tenantRecord.entityId)?.metadata?.platformFeeValue || 0,
    entity: entityMap.get(tenantRecord.entityId)!,
  })));
};

export const findTenantById = async (id: string): Promise<Tenant | undefined> => {
    const tenantRecord = tenants.find(t => t.id === id);
    if (!tenantRecord) return undefined;

    const entity = await findEntityById(tenantRecord.entityId);
    if (!entity) return undefined;

    return Promise.resolve({ 
        ...tenantRecord, 
        name: entity.displayName,
        notes: entity.metadata?.notes,
        platformFeeType: entity.metadata?.platformFeeType,
        platformFeeValue: entity.metadata?.platformFeeValue,
        entity 
    });
};

export const getAllMerchants = async (): Promise<Merchant[]> => {
    const allTenants = await getAllTenants();
    const allEntities = await getAllEntities();
    
    const tenantMap = new Map(allTenants.map(t => [t.id, t]));
    const entityMap = new Map(allEntities.map(e => [e.id, e]));
    const settlementDestMap = new Map(settlementDestinations.map(d => [d.id, d]));

    return Promise.resolve(merchantAccounts.map(ma => {
        const entity = entityMap.get(ma.entityId)!;
        const defaultDest = ma.defaultSettlementDestinationId ? settlementDestMap.get(ma.defaultSettlementDestinationId) : null;
        return {
            ...ma,
            businessName: entity.legalName,
            displayName: entity.displayName,
            contactName: entity.metadata.contactName,
            email: entity.metadata.email,
            mobile: entity.metadata.mobile,
            notes: entity.metadata.notes,
            status: entity.status as 'active' | 'inactive' | 'suspended',
            defaultFeeType: entity.metadata.defaultFeeType || 'percentage',
            defaultFeeValue: entity.metadata.defaultFeeValue || 0,
            settlementAccountName: defaultDest?.accountName || '',
            settlementAccountNumberOrWalletId: defaultDest?.accountNumberMasked || '',
            defaultPayoutChannel: defaultDest?.bankCode || '',
            entity,
            tenant: tenantMap.get(ma.tenantId)!,
            defaultSettlementDestination: defaultDest || null,
            propertyAssociations: entity.metadata.propertyAssociations || [],
        }
    }));
}

export const findMerchantById = async (id: string): Promise<Merchant | undefined> => {
    const merchantAccount = merchantAccounts.find(m => m.id === id);
    if (!merchantAccount) return undefined;

    const [tenant, entity] = await Promise.all([
        findTenantById(merchantAccount.tenantId),
        findEntityById(merchantAccount.entityId)
    ]);
    
    if (!tenant || !entity) return undefined;
    
    const defaultDest = merchantAccount.defaultSettlementDestinationId 
        ? settlementDestinations.find(d => d.id === merchantAccount.defaultSettlementDestinationId) ?? null 
        : null;

    return Promise.resolve({
        ...merchantAccount,
        businessName: entity.legalName,
        displayName: entity.displayName,
        contactName: entity.metadata.contactName,
        email: entity.metadata.email,
        mobile: entity.metadata.mobile,
        notes: entity.metadata.notes,
        status: entity.status as 'active' | 'inactive' | 'suspended',
        defaultFeeType: entity.metadata.defaultFeeType || 'percentage',
        defaultFeeValue: entity.metadata.defaultFeeValue || 0,
        settlementAccountName: defaultDest?.accountName || '',
        settlementAccountNumberOrWalletId: defaultDest?.accountNumberMasked || '',
        defaultPayoutChannel: defaultDest?.bankCode || '',
        entity,
        tenant,
        defaultSettlementDestination: defaultDest,
        propertyAssociations: entity.metadata.propertyAssociations || [],
    });
}

export const getMerchantsByTenantId = async (tenantId: string): Promise<Merchant[]> => {
    const allMerchants = await getAllMerchants();
    return Promise.resolve(allMerchants.filter(m => m.tenantId === tenantId));
}

// --- Write operations ---

export const addTenant = async (tenant: Tenant): Promise<Tenant> => {
  entities.push(tenant.entity);
  tenants.push({
      id: tenant.id,
      entityId: tenant.entityId,
      tenantCode: tenant.tenantCode,
      status: tenant.status,
      settings: tenant.settings,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
  });
  return Promise.resolve(tenant);
};

export const addMerchant = async (merchant: Merchant): Promise<Merchant> => {
  entities.push(merchant.entity);
  merchantAccounts.push({
      id: merchant.id,
      entityId: merchant.entityId,
      tenantId: merchant.tenantId,
      onboardingStatus: merchant.onboardingStatus,
      kycStatus: merchant.kycStatus,
      riskStatus: merchant.riskStatus,
      activationStatus: merchant.activationStatus,
      settlementStatus: merchant.settlementStatus,
      defaultSettlementDestinationId: merchant.defaultSettlementDestinationId,
      
      // New production-ready fields
      merchantOfRecordType: merchant.merchantOfRecordType,
      providerMerchantMode: merchant.providerMerchantMode,
      settlementMode: merchant.settlementMode,
      settlementSchedule: merchant.settlementSchedule,
      providerMerchantId: merchant.providerMerchantId,
      providerSubMerchantId: merchant.providerSubMerchantId,
      isProviderOnboarded: merchant.isProviderOnboarded,
      providerOnboardingStatus: merchant.providerOnboardingStatus,
      providerCapabilityProfile: merchant.providerCapabilityProfile,

      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
  });
  if (merchant.defaultSettlementDestination) {
      settlementDestinations.push(merchant.defaultSettlementDestination);
  }
  return Promise.resolve(merchant);
};

// Payments
export const getAllPayments = async (): Promise<Payment[]> => Promise.resolve([...payments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
export const findPaymentById = async (id: string): Promise<Payment | undefined> => Promise.resolve(payments.find(p => p.id === id));

export const addPayment = async (payment: Payment, client?: PoolClient): Promise<Payment> => {
  payments.unshift(payment);
  return Promise.resolve(payment);
};

export const updatePayment = async (id: string, updatedData: Partial<Payment>, client?: PoolClient): Promise<Payment | undefined> => {
  const index = payments.findIndex(p => p.id === id);
  if (index === -1) return undefined;
  payments[index] = { ...payments[index], ...updatedData, updatedAt: formatISO(new Date()) };
  return Promise.resolve(payments[index]);
};

// Settlements
export const getAllSettlements = async (): Promise<Settlement[]> => Promise.resolve([...settlements].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
export const findSettlementById = async (id: string): Promise<Settlement | undefined> => Promise.resolve(settlements.find(s => s.id === id));
export const findSettlementByPaymentId = async (paymentId: string): Promise<Settlement | undefined> => Promise.resolve(settlements.find(s => s.paymentId === paymentId));

export const addSettlement = async (settlement: Settlement, client?: PoolClient): Promise<Settlement> => {
  settlements.unshift(settlement);
  return Promise.resolve(settlement);
};

export const updateSettlement = async (id: string, updatedData: Partial<Settlement>, client?: PoolClient): Promise<Settlement | undefined> => {
  const index = settlements.findIndex(s => s.id === id);
  if (index === -1) return undefined;
  settlements[index] = { ...settlements[index], ...updatedData, updatedAt: formatISO(new Date()) };
  return Promise.resolve(settlements[index]);
};

// Audit Logs
export const getAllAuditLogs = async (): Promise<AuditLog[]> => Promise.resolve([...auditLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

export const findAuditLogByEventIdentifier = async (eventIdentifier: string): Promise<AuditLog | undefined> => {
    return Promise.resolve(auditLogs.find(l => l.eventIdentifier === eventIdentifier));
};

export const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
  const newLog: AuditLog = {
    ...log,
    id: `log-${uuidv4()}`,
    timestamp: formatISO(new Date()),
  };
  auditLogs.unshift(newLog);
  return Promise.resolve(newLog);
};

// Allocation Engine
export const getAllocationRules = async(): Promise<AllocationRule[]> => Promise.resolve(allocationRules.filter(r => r.active).sort((a,b) => a.priority - b.priority));
export const getPaymentAllocationsByPaymentId = async (paymentId: string): Promise<PaymentAllocation[]> => Promise.resolve(paymentAllocations.filter(pa => pa.paymentId === paymentId));

export const addPaymentAllocations = async (allocations: Omit<PaymentAllocation, 'id' | 'createdAt'>[], client?: PoolClient): Promise<void> => {
    const now = new Date();
    for (const alloc of allocations) {
        paymentAllocations.push({
            ...alloc,
            id: `alloc-${uuidv4()}`,
            createdAt: formatISO(now),
        });
    }
    return Promise.resolve();
}

// Ledger
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
    ledgerTransactions.push(fullTransaction);

    for (const entry of entries) {
        ledgerEntries.push({
            ...entry,
            id: `lgr-ent-${uuidv4()}`,
            ledgerTransactionId: fullTransaction.id,
            createdAt: now,
        });
    }
    return Promise.resolve();
}


// Webhook events
export const claimWebhookEventForProcessing = async (
  eventIdentifier: string,
  orderSeq?: string,
  transSeq?: string
): Promise<'started' | 'already-processed' | 'in-progress'> => {
  const existing = webhookEvents.find(e => e.eventIdentifier === eventIdentifier);
  if (existing) {
      if (existing.state === 'processed') return Promise.resolve('already-processed');
      if (existing.state === 'processing' && new Date(existing.lease_expires_at).getTime() > Date.now()) {
          return Promise.resolve('in-progress');
      }
  }

  const newEvent = {
      eventIdentifier,
      state: 'processing',
      orderSeq,
      transSeq,
      receivedAt: new Date(),
      updatedAt: new Date(),
      lease_expires_at: new Date(Date.now() + 2 * 60 * 1000), // 2 minute lease
      last_error: null,
  };

  if (existing) {
      const index = webhookEvents.findIndex(e => e.eventIdentifier === eventIdentifier);
      webhookEvents[index] = newEvent;
  } else {
      webhookEvents.push(newEvent);
  }

  return Promise.resolve('started');
};

export const markWebhookEventProcessed = async (eventIdentifier: string): Promise<void> => {
  const index = webhookEvents.findIndex(e => e.eventIdentifier === eventIdentifier);
  if (index !== -1) {
      webhookEvents[index].state = 'processed';
      webhookEvents[index].updatedAt = new Date();
      webhookEvents[index].lease_expires_at = null;
  }
  return Promise.resolve();
};

export const releaseWebhookEventClaim = async (eventIdentifier: string, errorMessage?: string): Promise<void> => {
  const index = webhookEvents.findIndex(e => e.eventIdentifier === eventIdentifier);
  if (index !== -1) {
      webhookEvents[index].state = 'failed';
      webhookEvents[index].updatedAt = new Date();
      webhookEvents[index].lease_expires_at = null;
      webhookEvents[index].last_error = errorMessage;
  }
  return Promise.resolve();
};

// UAT
export const getAllUATLogs = async (): Promise<UATLog[]> => Promise.resolve([...uatLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
export const getUATTestCases = (): UATTestCase[] => uatTestCases;
export const addUATLog = async (log: Omit<UATLog, 'id' | 'timestamp'>): Promise<UATLog> => {
  const newLog: UATLog = {
    ...log,
    id: `uatlog-${uuidv4()}`,
    timestamp: formatISO(new Date()),
  };
  uatLogs.unshift(newLog);
  return Promise.resolve(newLog);
};

// Payouts
export async function findPayoutById(id: string): Promise<Payout | undefined> {
    return Promise.resolve(payouts.find(p => p.id === id));
}

export async function updatePayout(id: string, data: Partial<Payout>, client?: PoolClient): Promise<Payout | undefined> {
    const index = payouts.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    payouts[index] = { ...payouts[index], ...data, updatedAt: formatISO(new Date()) };
    return Promise.resolve(payouts[index]);
}

export async function findPayoutByOrderSeq(orderSeq: string): Promise<Payout | undefined> {
    return Promise.resolve(payouts.find(p => p.id === orderSeq));
}

export async function addPayout(payout: Payout, client?: PoolClient): Promise<Payout> {
    payouts.unshift(payout);
    return Promise.resolve(payout);
}

export async function withTransaction<T>(fn: (client?: PoolClient) => Promise<T>): Promise<T> {
  // In-memory does not have transactions, so just execute the function.
  // The optional client argument is handled by the in-memory data functions.
  return fn();
}

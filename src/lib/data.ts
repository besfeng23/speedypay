/**
 * @file Repository facade for application data access.
 * Keeps a stable seam while delegating persistence to the current DB adapter.
 */
import type { PoolClient } from 'pg';
import type { Merchant, Payment, Settlement, AuditLog, DashboardStats, UATTestCase, UATLog, Tenant, PaymentAllocation, AllocationRule, LedgerTransaction, LedgerEntry, Payout, Entity } from '@/lib/types';
import * as db from './db/in-memory';

const SIMULATED_LATENCY_MS = 200;

async function withLatency<T>(work: () => Promise<T>, delay = SIMULATED_LATENCY_MS): Promise<T> {
  const [result] = await Promise.all([
    work(),
    new Promise((resolve) => setTimeout(resolve, delay)),
  ]);
  return result;
}

// --- Data Fetching Functions (Public API of the Data Layer) ---

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const allPayments = await db.getAllPayments();
  const allSettlements = await db.getAllSettlements();
  const allMerchants = await db.getAllMerchants();
  const recentPayments = await getRecentPayments();
  const recentSettlements = await getRecentSettlements();

  return withLatency(async () => ({
    totalGrossVolume: allPayments.filter((p) => p.paymentStatus === 'succeeded').reduce((sum, p) => sum + p.grossAmount, 0),
    totalPlatformFees: allPayments.filter((p) => p.paymentStatus === 'succeeded').reduce((sum, p) => sum + p.platformFeeAmount, 0),
    totalMerchantNetRemittances: allSettlements.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.merchantNetAmount, 0),
    activeMerchants: allMerchants.filter((m) => m.entity.status === 'active').length,
    pendingSettlements: allSettlements.filter((s) => s.status === 'unpaid').length,
    failedSettlements: allSettlements.filter((s) => s.status === 'failed').length,
    processingPayments: allPayments.filter((p) => p.paymentStatus === 'processing').length,
    failedPayments: allPayments.filter((p) => p.paymentStatus === 'failed').length,
    recentTransactionsCount: recentPayments.length,
    recentSettlementEventsCount: recentSettlements.length,
  }));
};

export const getTenants = async (): Promise<Tenant[]> => withLatency(() => db.getAllTenants());
export const getTenantById = async (id: string): Promise<Tenant | undefined> => withLatency(() => db.findTenantById(id));
export const getMerchants = async (): Promise<Merchant[]> => withLatency(() => db.getAllMerchants());
export const getMerchantsByTenantId = async (tenantId: string): Promise<Merchant[]> => withLatency(() => db.getMerchantsByTenantId(tenantId));

export const getMerchantById = async (id: string): Promise<Merchant | undefined> => withLatency(() => db.findMerchantById(id));
export const findEntityById = async (id: string): Promise<Entity | undefined> => withLatency(() => db.findEntityById(id));


export const getPayments = async (): Promise<Payment[]> => withLatency(() => db.getAllPayments());

export const getPaymentById = async (id: string): Promise<Payment | undefined> => withLatency(() => db.findPaymentById(id));

export const getRecentPayments = async (limit = 5): Promise<Payment[]> => {
  const allPayments = await getPayments();
  return allPayments.slice(0, limit);
};

export const getPaymentsByMerchantId = async (merchantId: string, limit?: number): Promise<Payment[]> => {
  const allPayments = await getPayments();
  const merchantPayments = allPayments.filter((p) => p.merchantId === merchantId);
  return withLatency(async () => (limit ? merchantPayments.slice(0, limit) : merchantPayments));
};

export const getSettlements = async (): Promise<Settlement[]> => withLatency(() => db.getAllSettlements());

export const getSettlementById = async (id: string): Promise<Settlement | undefined> => withLatency(async () => {
    const settlement = await db.findSettlementById(id);
    if (!settlement) {
        return undefined;
    }
    if (settlement.payoutId) {
        settlement.payout = await db.findPayoutById(settlement.payoutId);
    }
    return settlement;
});


export const getSettlementByPaymentId = async (paymentId: string): Promise<Settlement | undefined> =>
  withLatency(() => db.findSettlementByPaymentId(paymentId));

export const getRecentSettlements = async (limit = 5): Promise<Settlement[]> => {
  const allSettlements = await getSettlements();
  return allSettlements.slice(0, limit);
};

export const getSettlementsByMerchantId = async (merchantId: string, limit?: number): Promise<Settlement[]> => {
  const allSettlements = await getSettlements();
  const merchantSettlements = allSettlements.filter((s) => s.merchantId === merchantId);
  return withLatency(async () => (limit ? merchantSettlements.slice(0, limit) : merchantSettlements));
};

export const getAuditLogs = async (): Promise<AuditLog[]> => withLatency(() => db.getAllAuditLogs());

export const getAuditLogsByEntity = async (entityType: 'payment' | 'settlement' | 'tenant' | 'merchant' | 'payout', entityId: string): Promise<AuditLog[]> => {
  const relatedIds: string[] = [entityId];
  
  if (entityType === 'settlement') {
    const settlement = await getSettlementById(entityId);
    if (settlement) {
      relatedIds.push(settlement.paymentId);
      if (settlement.payoutId) {
        relatedIds.push(settlement.payoutId);
      }
    }
  }
  if (entityType === 'payment') {
    const settlement = await getSettlementByPaymentId(entityId);
    if (settlement) {
        relatedIds.push(settlement.id);
        if (settlement.payoutId) {
            relatedIds.push(settlement.payoutId);
        }
    }
  }

  const allLogs = await getAuditLogs();
  const entityLogs = allLogs
    .filter((log) => log.entityId && relatedIds.includes(log.entityId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return withLatency(async () => entityLogs);
};

export const getAuditLogsByEventTypePrefix = async (prefix: string, limit = 5): Promise<AuditLog[]> => {
  const allLogs = await getAuditLogs();
  const filteredLogs = allLogs.filter((log) => log.eventType.startsWith(prefix));
  return withLatency(async () => (limit ? filteredLogs.slice(0, limit) : filteredLogs));
};

export async function findAuditLogByEventIdentifier(eventIdentifier: string): Promise<AuditLog | undefined> {
  return withLatency(() => db.findAuditLogByEventIdentifier(eventIdentifier), 50);
}

export async function claimWebhookEventForProcessing(
  eventIdentifier: string,
  orderSeq?: string,
  transSeq?: string
): Promise<'started' | 'already-processed' | 'in-progress'> {
  return db.claimWebhookEventForProcessing(eventIdentifier, orderSeq, transSeq);
}

export async function markWebhookEventProcessed(eventIdentifier: string): Promise<void> {
  await db.markWebhookEventProcessed(eventIdentifier);
}

export async function releaseWebhookEventClaim(eventIdentifier: string, errorMessage?: string): Promise<void> {
  await db.releaseWebhookEventClaim(eventIdentifier, errorMessage);
}

export const getUATTestCases = async (): Promise<UATTestCase[]> => withLatency(async () => db.getUATTestCases(), 100);

export const getUATLogs = async (): Promise<UATLog[]> => withLatency(() => db.getAllUATLogs(), 100);

export const getAllocationRules = async (): Promise<AllocationRule[]> => withLatency(() => db.getAllocationRules());

export const getPaymentAllocations = async (paymentId: string): Promise<PaymentAllocation[]> => withLatency(() => db.getPaymentAllocationsByPaymentId(paymentId));

export const findPayoutById = async (id: string): Promise<Payout | undefined> => withLatency(() => db.findPayoutById(id));
export const findPayoutByOrderSeq = async (orderSeq: string): Promise<Payout | undefined> => withLatency(() => db.findPayoutByOrderSeq(orderSeq));


// --- Data Mutation Functions ---

export async function addTenant(tenant: Tenant): Promise<Tenant> {
    return db.addTenant(tenant);
}

export async function addMerchant(merchant: Merchant): Promise<Merchant> {
  return db.addMerchant(merchant);
}

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
  return db.addAuditLog(log);
}

export async function addPayment(payment: Payment, client?: PoolClient): Promise<Payment> {
  return db.addPayment(payment, client);
}

export async function addPaymentAllocations(allocations: Omit<PaymentAllocation, 'id' | 'createdAt'>[], client?: PoolClient): Promise<void> {
    return db.addPaymentAllocations(allocations, client);
}

export async function addLedgerTransactionAndEntries(
    transaction: Omit<LedgerTransaction, 'id' | 'createdAt' | 'updatedAt'>,
    entries: Omit<LedgerEntry, 'id' | 'createdAt'>[],
    client?: PoolClient
): Promise<void> {
    return db.addLedgerTransactionAndEntries(transaction, entries, client);
}


export async function addSettlement(settlement: Settlement, client?: PoolClient): Promise<Settlement> {
  return db.addSettlement(settlement, client);
}

export async function addPayout(payout: Payout, client?: PoolClient): Promise<Payout> {
    return db.addPayout(payout, client);
}

export async function addUATLog(log: Omit<UATLog, 'id' | 'timestamp'>): Promise<UATLog> {
  return db.addUATLog(log);
}

export async function updateSettlement(id: string, updatedData: Partial<Settlement>, client?: PoolClient): Promise<Settlement | undefined> {
  return db.updateSettlement(id, updatedData, client);
}

export async function updatePayment(id: string, updatedData: Partial<Payment>, client?: PoolClient): Promise<Payment | undefined> {
  return db.updatePayment(id, updatedData, client);
}

export async function updatePayout(id: string, updatedData: Partial<Payout>, client?: PoolClient): Promise<Payout | undefined> {
  return db.updatePayout(id, updatedData, client);
}

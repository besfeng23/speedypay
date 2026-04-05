import type { Merchant, Payment, Settlement, AuditLog, DashboardStats, UATTestCase, UATLog } from '@/lib/types';
import { subDays, subHours, subMinutes, formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const now = new Date();

// --- In-Memory Mock Database ---

export let merchants: Merchant[] = [
  {
    id: 'mer-1',
    businessName: 'Starlight Apartments',
    displayName: 'Starlight Apts',
    contactName: 'Alice Johnson',
    email: 'alice@starlight.com',
    mobile: '555-0101',
    settlementAccountName: 'Alice B Johnson',
    settlementAccountNumberOrWalletId: '1234567890',
    defaultPayoutChannel: 'BPI',
    status: 'active',
    onboardingStatus: 'completed',
    propertyAssociations: ['P-001', 'P-002'],
    defaultFeeType: 'percentage',
    defaultFeeValue: 3.2,
    notes: 'Primary client for property management. High volume.',
    createdAt: formatISO(subDays(now, 45)),
    updatedAt: formatISO(subDays(now, 2)),
  },
  {
    id: 'mer-2',
    businessName: 'Oceanview Properties',
    displayName: 'Oceanview',
    contactName: 'Bob Williams',
    email: 'bob@oceanview.co',
    mobile: '555-0102',
    settlementAccountName: 'Bob Williams',
    settlementAccountNumberOrWalletId: '09171234567',
    defaultPayoutChannel: 'GCASH',
    status: 'active',
    onboardingStatus: 'completed',
    propertyAssociations: ['P-003'],
    defaultFeeType: 'fixed',
    defaultFeeValue: 0.50,
    notes: 'Handles luxury rentals. Prefers wallet payouts.',
    createdAt: formatISO(subDays(now, 120)),
    updatedAt: formatISO(subDays(now, 15)),
  },
   {
    id: 'mer-3',
    businessName: 'Greenwood Heights HOA',
    displayName: 'Greenwood HOA',
    contactName: 'Carol White',
    email: 'carol@greenwood.org',
    mobile: '555-0103',
    settlementAccountName: 'Carol White',
    settlementAccountNumberOrWalletId: '9876543210',
    defaultPayoutChannel: 'BDO',
    status: 'active',
    onboardingStatus: 'completed',
    propertyAssociations: ['P-004'],
    defaultFeeType: 'percentage',
    defaultFeeValue: 2.5,
    notes: 'Awaiting updated compliance documents.',
    createdAt: formatISO(subDays(now, 200)),
    updatedAt: formatISO(subDays(now, 1)),
  },
];

export let payments: Payment[] = [
  {
    id: 'pay-1',
    externalReference: 'ch_3Pq...V54',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-001',
    customerName: 'David Miller',
    customerEmail: 'david.miller@example.com',
    merchantId: 'mer-1',
    grossAmount: 1250.00,
    currency: 'PHP',
    feeType: 'percentage',
    feeValue: 3.2,
    platformFeeAmount: 40.00,
    merchantNetAmount: 1210.00,
    paymentStatus: 'succeeded',
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    sourceChannel: 'Web',
    createdAt: formatISO(subDays(now, 1)),
    updatedAt: formatISO(subHours(now, 20)),
    providerPaymentUrl: 'https://test.e-mango.ph/cashier/pay?id=someid',
    providerCollectionRespCode: '00000000',
    providerCollectionRespMessage: 'Success',
    providerCollectionSignatureVerified: true,
    providerTransSeq: 'CP2024080112345',
    providerTransState: '00',
    providerStateLabel: 'succeeded',
    providerCreateTime: formatISO(subDays(now, 1)),
    providerNotifyTime: formatISO(subHours(now, 23)),
  },
  {
    id: 'pay-2',
    externalReference: 'ch_3Pq...X67',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-002',
    customerName: 'Emily Clark',
    customerEmail: 'emily.clark@example.com',
    merchantId: 'mer-2',
    grossAmount: 800.00,
    currency: 'PHP',
    feeType: 'fixed',
    feeValue: 0.50,
    platformFeeAmount: 0.50,
    merchantNetAmount: 799.50,
    paymentStatus: 'pending',
    settlementStatus: 'pending',
    remittanceStatus: 'pending',
    sourceChannel: 'Manual',
    createdAt: formatISO(subHours(now, 5)),
    updatedAt: formatISO(subHours(now, 4)),
    providerPaymentUrl: 'https://test.e-mango.ph/cashier/pay?id=anotherid',
    providerCollectionRespCode: '00000000',
    providerCollectionRespMessage: 'Success',
    providerCollectionSignatureVerified: true,
    providerTransState: '07',
    providerStateLabel: 'to-be-paid',
  },
   {
    id: 'pay-3',
    externalReference: 'ch_3Pq...Y89',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-003',
    customerName: 'Frank Harris',
    customerEmail: 'frank.harris@example.com',
    merchantId: 'mer-1',
    grossAmount: 350.00,
    currency: 'PHP',
    feeType: 'percentage',
    feeValue: 3.2,
    platformFeeAmount: 11.20,
    merchantNetAmount: 338.80,
    paymentStatus: 'failed',
    settlementStatus: 'N/A',
    remittanceStatus: 'N/A',
    sourceChannel: 'Web',
    createdAt: formatISO(subHours(now, 2)),
    updatedAt: formatISO(subHours(now, 1)),
  },
   {
    id: 'pay-4',
    externalReference: 'ch_3Pq...Z12',
    bookingReferenceOrInvoiceReference: 'inv-2024-06-105',
    customerName: 'Grace Lee',
    customerEmail: 'grace.lee@example.com',
    merchantId: 'mer-3',
    grossAmount: 2000.00,
    currency: 'PHP',
    feeType: 'percentage',
    feeValue: 2.5,
    platformFeeAmount: 50.00,
    merchantNetAmount: 1950.00,
    paymentStatus: 'succeeded',
    settlementStatus: 'completed',
    remittanceStatus: 'pending',
    sourceChannel: 'API',
    createdAt: formatISO(subDays(now, 5)),
    updatedAt: formatISO(subDays(now, 4)),
  },
  {
    id: 'pay-5',
    externalReference: 'N/A',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-005',
    customerName: 'Demo Customer',
    customerEmail: 'demo@example.com',
    merchantId: 'mer-2',
    grossAmount: 150.00,
    currency: 'PHP',
    feeType: 'fixed',
    feeValue: 0.50,
    platformFeeAmount: 0.50,
    merchantNetAmount: 149.50,
    paymentStatus: 'succeeded',
    settlementStatus: 'completed',
    remittanceStatus: 'failed',
    sourceChannel: 'API',
    createdAt: formatISO(subDays(now, 2)),
    updatedAt: formatISO(subDays(now, 2)),
  }
];

export let settlements: Settlement[] = [
  {
    id: 'set-a1b2c3d4',
    paymentId: 'pay-1',
    merchantId: 'mer-1',
    grossAmount: 1250.00,
    platformFeeAmount: 40.00,
    merchantNetAmount: 1210.00,
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    payoutReference: `payout-set-a1b2c3d4`,
    failureReason: null,
    providerName: 'SpeedyPay',
    providerOrderSeq: 'set-a1b2c3d4',
    providerTransSeq: 'T12345678',
    providerRespCode: '00000000',
    providerRespMessage: 'Transaction Success',
    providerTransState: '00',
    providerTransStateLabel: 'succeeded',
    signatureVerified: true,
    payoutChannelProcId: 'BPI',
    payoutChannelDescription: 'BPI (InstaPay)',
    createdAt: formatISO(subHours(now, 23)),
    updatedAt: formatISO(subHours(now, 20)),
    lastQueryAt: formatISO(subHours(now, 20)),
    providerTimestamp: formatISO(subHours(now, 20)),
  },
  {
    id: 'set-c3d4e5f6',
    paymentId: 'pay-4',
    merchantId: 'mer-3',
    grossAmount: 2000.00,
    platformFeeAmount: 50.00,
    merchantNetAmount: 1950.00,
    settlementStatus: 'completed',
    remittanceStatus: 'pending',
    payoutReference: null,
    failureReason: null,
    createdAt: formatISO(subDays(now, 5)),
    updatedAt: formatISO(subDays(now, 4)),
  },
  {
    id: 'set-d4e5f6g7',
    paymentId: 'pay-5',
    merchantId: 'mer-2',
    grossAmount: 150.00,
    platformFeeAmount: 0.50,
    merchantNetAmount: 149.50,
    settlementStatus: 'completed',
    remittanceStatus: 'failed',
    payoutReference: 'payout-set-d4e5f6g7',
    failureReason: 'Remittance transfer failed due to invalid beneficiary details or network error.',
    providerName: 'SpeedyPay',
    providerOrderSeq: 'set-d4e5f6g7',
    providerTransSeq: 'T54321098',
    providerRespCode: 'ER100100',
    providerRespMessage: 'Transaction Failed: Invalid Account',
    providerTransState: '01',
    providerTransStateLabel: 'failed',
    signatureVerified: true,
    payoutChannelProcId: 'GCASH',
    payoutChannelDescription: 'GCash',
    createdAt: formatISO(subDays(now, 2)),
    updatedAt: formatISO(subDays(now, 2)),
    lastQueryAt: formatISO(subDays(now, 2)),
    providerTimestamp: formatISO(subDays(now, 2)),
  }
];

export let auditLogs: AuditLog[] = [
    {
        id: 'log-1',
        timestamp: formatISO(subMinutes(now, 15)),
        eventType: 'user.login',
        user: 'admin@speedypay.com',
        details: 'User logged in successfully from IP 192.168.1.1',
        entityId: 'usr_admin',
        entityType: 'user',
    },
    {
        id: 'log-2',
        timestamp: formatISO(subHours(now, 23)),
        eventType: 'payment.created',
        user: 'System',
        details: 'Payment created via Web channel.',
        entityId: 'pay-1',
        entityType: 'payment',
    },
];

export let uatLogs: UATLog[] = [];

export const uatTestCases: UATTestCase[] = [
    {
        id: 'COL-01',
        section: 'Collections',
        title: 'Create Collection Payment',
        description: 'Verifies payment link creation. A successful payment via the link should trigger a webhook, which in turn automatically creates a "completed" settlement record.',
        actionLabel: 'Create Test Payment',
        requiresInput: 'payment_amount'
    },
    {
        id: 'COL-02',
        section: 'Collections',
        title: 'Query Collection Status',
        description: 'Verifies direct, server-to-server querying of a pending payment from the provider. This confirms API connectivity and signature generation.',
        actionLabel: 'Query Payment',
        requiresInput: 'latest_payment'
    },
    {
        id: 'PAY-01',
        section: 'Payouts',
        title: 'Initiate Payout/Remittance',
        description: 'Verifies the remittance creation process for a settled transaction. Requires a settlement with status "completed" and remittance "pending".',
        actionLabel: 'Initiate Payout',
        requiresInput: 'latest_settlement'
    },
    {
        id: 'PAY-02',
        section: 'Payouts',
        title: 'Query Payout Status',
        description: 'Verifies direct, server-to-server querying of an initiated payout. This confirms API connectivity and correct request formatting for the payout API.',
        actionLabel: 'Query Payout',
        requiresInput: 'latest_settlement'
    },
     {
        id: 'SYS-01',
        section: 'System & Treasury',
        title: 'Query Collection Balance',
        description: 'Verifies API credentials and connectivity by querying the live balance from the collections provider.',
        actionLabel: 'Query Balance',
    },
     {
        id: 'SYS-02',
        section: 'System & Treasury',
        title: 'Query Payout Balance',
        description: 'Verifies API credentials and connectivity by querying the live balance from the payouts provider.',
        actionLabel: 'Query Balance',
    },
];


// --- Data Fetching Functions (Simulated) ---

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return {
    totalGrossVolume: payments.filter(p => p.paymentStatus === 'succeeded').reduce((sum, p) => sum + p.grossAmount, 0),
    totalPlatformFees: payments.filter(p => p.paymentStatus === 'succeeded').reduce((sum, p) => sum + p.platformFeeAmount, 0),
    totalMerchantNetRemittances: settlements.filter(s => s.remittanceStatus === 'sent').reduce((sum, s) => sum + s.merchantNetAmount, 0),
    activeMerchants: merchants.filter(m => m.status === 'active').length,
    pendingSettlements: settlements.filter(s => s.remittanceStatus === 'pending').length,
    failedSettlements: settlements.filter(s => s.remittanceStatus === 'failed').length,
    processingPayments: payments.filter(p => p.paymentStatus === 'processing').length,
    failedPayments: payments.filter(p => p.paymentStatus === 'failed').length,
  }
}

export const getMerchants = async (): Promise<Merchant[]> => {
  return new Promise(resolve => setTimeout(() => resolve(merchants), 300));
}

export const getMerchantById = async (id: string): Promise<Merchant | undefined> => {
  return new Promise(resolve => setTimeout(() => resolve(merchants.find(m => m.id === id)), 200));
}

export const getPayments = async (): Promise<Payment[]> => {
  const sorted = [...payments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return new Promise(resolve => setTimeout(() => resolve(sorted), 300));
}

export const getPaymentById = async (id: string): Promise<Payment | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(payments.find(p => p.id === id)), 200));
}

export const getRecentPayments = async (limit = 5): Promise<Payment[]> => {
    const sorted = [...payments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return new Promise(resolve => setTimeout(() => resolve(sorted.slice(0, limit)), 250));
}

export const getPaymentsByMerchantId = async (merchantId: string, limit?: number): Promise<Payment[]> => {
    const merchantPayments = payments.filter(p => p.merchantId === merchantId)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const result = limit ? merchantPayments.slice(0, limit) : merchantPayments;
    return new Promise(resolve => setTimeout(() => resolve(result), 300));
}

export const getSettlements = async (): Promise<Settlement[]> => {
  const sorted = [...settlements].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return new Promise(resolve => setTimeout(() => resolve(sorted), 300));
}

export const getSettlementById = async (id: string): Promise<Settlement | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(settlements.find(s => s.id === id)), 200));
}

export const getSettlementByPaymentId = async (paymentId: string): Promise<Settlement | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(settlements.find(s => s.paymentId === paymentId)), 200));
}

export const getRecentSettlements = async (limit = 5): Promise<Settlement[]> => {
    const sorted = [...settlements].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return new Promise(resolve => setTimeout(() => resolve(sorted.slice(0, limit)), 250));
}

export const getSettlementsByMerchantId = async (merchantId: string, limit?: number): Promise<Settlement[]> => {
    const merchantSettlements = settlements.filter(s => s.merchantId === merchantId)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const result = limit ? merchantSettlements.slice(0, limit) : merchantSettlements;
    return new Promise(resolve => setTimeout(() => resolve(result), 300));
}

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const sorted = [...auditLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return new Promise(resolve => setTimeout(() => resolve(sorted), 300));
}

export const getAuditLogsByEntity = async (entityType: 'payment' | 'settlement', entityId: string): Promise<AuditLog[]> => {
    // This is a simple implementation. In a real app, you'd query a database.
    // We are combining logs where the entity is the direct subject, or is related (e.g. payment logs on a settlement page)
    let relatedIds: string[] = [entityId];
    if (entityType === 'settlement') {
        const settlement = await getSettlementById(entityId);
        if (settlement) relatedIds.push(settlement.paymentId);
    }
     if (entityType === 'payment') {
        const settlement = await getSettlementByPaymentId(entityId);
        if (settlement) relatedIds.push(settlement.id);
    }

    const entityLogs = auditLogs.filter(log => log.entityId && relatedIds.includes(log.entityId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return new Promise(resolve => setTimeout(() => resolve(entityLogs), 200));
}

export const getAuditLogsByEventTypePrefix = async (prefix: string, limit = 5): Promise<AuditLog[]> => {
  const filteredLogs = auditLogs.filter(log => log.eventType.startsWith(prefix))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const result = limit ? filteredLogs.slice(0, limit) : filteredLogs;
  return new Promise(resolve => setTimeout(() => resolve(result), 200));
}

export const getUATTestCases = async (): Promise<UATTestCase[]> => {
    return new Promise(resolve => setTimeout(() => resolve(uatTestCases), 100));
}

export const getUATLogs = async (): Promise<UATLog[]> => {
    const sorted = [...uatLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return new Promise(resolve => setTimeout(() => resolve(sorted), 100));
}


// --- Data Mutation Functions (Server-side) ---

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    console.log('[Audit Log]', log.details);
    const newLog: AuditLog = {
        ...log,
        id: `log-${uuidv4()}`,
        timestamp: formatISO(new Date()),
    };
    auditLogs.unshift(newLog);
    return newLog;
}

export async function addUATLog(log: Omit<UATLog, 'id' | 'timestamp'>): Promise<UATLog> {
    console.log(`[UAT Log - ${log.status.toUpperCase()}]`, log.notes);
    const newLog: UATLog = {
        ...log,
        id: `uatlog-${uuidv4()}`,
        timestamp: formatISO(new Date()),
    };
    uatLogs.unshift(newLog);
    return newLog;
}

export async function updateSettlement(id: string, updatedData: Partial<Settlement>): Promise<Settlement | undefined> {
    const index = settlements.findIndex(s => s.id === id);
    if (index > -1) {
        settlements[index] = { ...settlements[index], ...updatedData, updatedAt: formatISO(new Date()) };
        return settlements[index];
    }
    return undefined;
}

export async function updatePayment(id: string, updatedData: Partial<Payment>): Promise<Payment | undefined> {
    const index = payments.findIndex(p => p.id === id);
    if (index > -1) {
        payments[index] = { ...payments[index], ...updatedData, updatedAt: formatISO(new Date()) };
        return payments[index];
    }
    return undefined;
}

import type { Merchant, Payment, Settlement, AuditLog, DashboardStats } from '@/lib/types';
import { subDays, subHours, subMinutes, formatISO, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const now = new Date();

export let merchants: Merchant[] = [
  {
    id: 'mer-1',
    businessName: 'Starlight Apartments',
    displayName: 'Starlight Apts',
    contactName: 'Alice Johnson',
    email: 'alice@starlight.com',
    mobile: '555-0101',
    settlementAccountName: 'Alice B Johnson',
    settlementAccountNumberOrWalletId: '123456789012',
    settlementChannel: 'Bank Account',
    defaultPayoutChannelProcId: 'BPI',
    status: 'Active',
    onboardingStatus: 'Completed',
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
    settlementChannel: 'Digital Wallet',
    defaultPayoutChannelProcId: 'GCASH',
    status: 'Active',
    onboardingStatus: 'Completed',
    propertyAssociations: ['P-003'],
    defaultFeeType: 'fixed',
    defaultFeeValue: 0.50,
    notes: 'Handles luxury rentals. Prefers wallet payouts.',
    createdAt: formatISO(subDays(now, 120)),
    updatedAt: formatISO(subDays(now, 15)),
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
    currency: 'USD',
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
  },
  {
    id: 'pay-2',
    externalReference: 'ch_3Pq...X67',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-002',
    customerName: 'Emily Clark',
    customerEmail: 'emily.clark@example.com',
    merchantId: 'mer-2',
    grossAmount: 800.00,
    currency: 'USD',
    feeType: 'fixed',
    feeValue: 0.50,
    platformFeeAmount: 0.50,
    merchantNetAmount: 799.50,
    paymentStatus: 'succeeded',
    settlementStatus: 'pending',
    remittanceStatus: 'pending',
    sourceChannel: 'Mobile',
    createdAt: formatISO(subHours(now, 5)),
    updatedAt: formatISO(subHours(now, 4)),
  },
  {
    id: 'pay-3',
    externalReference: 'ch_3Pq...Y89',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-003',
    customerName: 'Sophia Lee',
    customerEmail: 'sophia.lee@example.com',
    merchantId: 'mer-1',
    grossAmount: 500.00,
    currency: 'USD',
    feeType: 'percentage',
    feeValue: 3.2,
    platformFeeAmount: 16.00,
    merchantNetAmount: 484.00,
    paymentStatus: 'succeeded',
    settlementStatus: 'completed', // It settled internally
    remittanceStatus: 'failed', // But the final payout failed
    sourceChannel: 'API',
    createdAt: formatISO(subDays(now, 2)),
    updatedAt: formatISO(subDays(now, 1)),
  }
];

export let settlements: Settlement[] = [
  {
    id: 'set-a1b2c3d4',
    paymentId: 'pay-1',
    merchantId: 'mer-1',
    grossAmount: 1250.00,
    platformFeeAmount: 40.00,
    merchantNetAmount: 68902.50, // Approx 1210 USD in PHP
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    payoutReference: `payout-${uuidv4().slice(0,8)}`,
    failureReason: null,
    createdAt: formatISO(subHours(now, 23)),
    updatedAt: formatISO(subHours(now, 20)),
    providerName: 'SpeedyPay',
    providerEndpointType: 'cashOut.do',
    providerOrderSeq: `ord_${Date.now() - 2000000}`,
    providerTransSeq: `T${Date.now() - 2000000}`,
    providerRespCode: '00000000',
    providerRespMessage: 'Transaction is accepted',
    providerTransState: '00',
    providerTimestamp: format(subHours(now, 22), 'yyyyMMddHHmmss'),
    payoutChannelProcId: 'BPI',
    payoutChannelDescription: 'BPI (InstaPay)',
    signatureVerified: true,
    reconciliationStatus: 'reconciled',
    lastQueryAt: null,
    rawProviderRequest: '{"message": "This is a mock request"}',
    rawProviderResponse: '{"message": "This is a mock response"}',
  },
  {
    id: 'set-b2c3d4e5',
    paymentId: 'pay-2',
    merchantId: 'mer-2',
    grossAmount: 800.00,
    platformFeeAmount: 0.50,
    merchantNetAmount: 45251.72, // Approx 799.50 USD in PHP
    settlementStatus: 'pending',
    remittanceStatus: 'pending',
    payoutReference: `payout-${uuidv4().slice(0,8)}`,
    failureReason: null,
    createdAt: formatISO(subHours(now, 5)),
    updatedAt: formatISO(subHours(now, 4)),
    providerName: null,
    providerEndpointType: null,
    providerOrderSeq: null,
    providerTransSeq: null,
    providerRespCode: null,
    providerRespMessage: null,
    providerTransState: null,
    providerTimestamp: null,
    payoutChannelProcId: null,
    payoutChannelDescription: null,
    signatureVerified: null,
    reconciliationStatus: 'pending',
    lastQueryAt: null,
    rawProviderRequest: null,
    rawProviderResponse: null,
  },
   {
    id: 'set-c3d4e5f6',
    paymentId: 'pay-3',
    merchantId: 'mer-1',
    grossAmount: 500.00,
    platformFeeAmount: 16.00,
    merchantNetAmount: 27405.00, // Approx 484 USD in PHP
    settlementStatus: 'completed',
    remittanceStatus: 'failed',
    payoutReference: `payout-${uuidv4().slice(0,8)}`,
    failureReason: 'Provider Error: Invalid recipient account details.',
    createdAt: formatISO(subDays(now, 2)),
    updatedAt: formatISO(subDays(now, 1)),
    providerName: 'SpeedyPay',
    providerEndpointType: 'cashOut.do',
    providerOrderSeq: `ord_${Date.now() - 3000000}`,
    providerTransSeq: `T${Date.now() - 3000000}`,
    providerRespCode: '20000010',
    providerRespMessage: 'Invalid recipient account details.',
    providerTransState: '01',
    providerTimestamp: format(subDays(now, 2), 'yyyyMMddHHmmss'),
    payoutChannelProcId: 'BPI',
    payoutChannelDescription: 'BPI (InstaPay)',
    signatureVerified: true,
    reconciliationStatus: 'reconciled',
    lastQueryAt: null,
    rawProviderRequest: '{"message": "This is a mock request for a failed transaction"}',
    rawProviderResponse: '{"respCode": "20000010", "respMessage": "Invalid recipient account details.", "transState": "01"}',
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
        amount: null,
    },
    {
        id: 'log-2',
        timestamp: formatISO(subHours(now, 23)),
        eventType: 'payment.created',
        user: 'System',
        details: 'Payment created via Web channel.',
        entityId: 'pay-1',
        amount: 1250.00
    },
];

// --- Data Fetching Functions (Simulated) ---

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return {
    totalGrossVolume: 352649.99,
    totalPlatformFees: 12317.85,
    totalMerchantNetRemittances: 340332.14,
    pendingSettlements: settlements.filter(s => s.settlementStatus === 'pending').length,
    failedSettlements: settlements.filter(s => s.remittanceStatus === 'failed').length,
    activeMerchants: merchants.filter(m => m.status === 'Active').length,
  }
}

export const getMerchants = async (): Promise<Merchant[]> => {
  const sorted = [...merchants].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return new Promise(resolve => setTimeout(() => resolve(sorted), 300));
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

export const getAuditLogsByEntity = async (entityId: string): Promise<AuditLog[]> => {
    const relatedSettlement = settlements.find(s => s.paymentId === entityId || s.id === entityId);
    const entityLogs = auditLogs.filter(log => {
      if (log.entityId === entityId) return true;
      if (relatedSettlement && log.entityId === relatedSettlement.id) return true;
      // Also check if the entityId is a payment and the log is for the related settlement
      const payment = payments.find(p => p.id === entityId);
      if (payment) {
          const settlementForPayment = settlements.find(s => s.paymentId === payment.id);
          if (settlementForPayment && log.entityId === settlementForPayment.id) {
              return true;
          }
      }
      return false;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return new Promise(resolve => setTimeout(() => resolve(entityLogs), 200));
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

export async function updateSettlement(id: string, updates: Partial<Settlement>): Promise<Settlement | null> {
    const settlementIndex = settlements.findIndex(s => s.id === id);
    if (settlementIndex > -1) {
        const original = settlements[settlementIndex];
        settlements[settlementIndex] = { ...original, ...updates, updatedAt: formatISO(new Date()) };
        console.log(`[Data Update] Settlement ${id} updated.`);
        
        // Also update the parent payment record for status consistency
        const paymentIndex = payments.findIndex(p => p.id === original.paymentId);
        if (paymentIndex > -1) {
            if (updates.settlementStatus) {
                payments[paymentIndex].settlementStatus = updates.settlementStatus as any;
            }
            if (updates.remittanceStatus) {
                 payments[paymentIndex].remittanceStatus = updates.remittanceStatus as any;
            }
        }
        
        return settlements[settlementIndex];
    }
    return null;
}

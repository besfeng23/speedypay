import type { Merchant, Payment, Settlement, AuditLog, DashboardStats } from '@/lib/types';
import { subDays, formatISO } from 'date-fns';

const now = new Date();

export const merchants: Merchant[] = [
  {
    id: 'mer-1',
    businessName: 'Starlight Apartments',
    displayName: 'Starlight Apts',
    contactName: 'Alice Johnson',
    email: 'alice@starlight.com',
    mobile: '555-0101',
    settlementAccountName: 'Starlight Ops',
    settlementAccountNumberOrWalletId: '1234567890',
    settlementChannel: 'Bank Account',
    status: 'Active',
    onboardingStatus: 'Completed',
    propertyAssociations: ['P-001', 'P-002'],
    defaultFeeType: 'percentage',
    defaultFeeValue: 3.5,
    notes: 'Primary client for property management.',
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
    settlementAccountName: 'Oceanview Finances',
    settlementAccountNumberOrWalletId: 'bob-wallet-id',
    settlementChannel: 'Digital Wallet',
    status: 'Active',
    onboardingStatus: 'Completed',
    propertyAssociations: ['P-003'],
    defaultFeeType: 'fixed',
    defaultFeeValue: 0.5,
    notes: 'Handles luxury rentals.',
    createdAt: formatISO(subDays(now, 120)),
    updatedAt: formatISO(subDays(now, 15)),
  },
  {
    id: 'mer-3',
    businessName: 'City Center Lofts',
    displayName: 'City Lofts',
    contactName: 'Charlie Brown',
    email: 'charlie@citylofts.com',
    mobile: '555-0103',
    settlementAccountName: 'City Center Ops',
    settlementAccountNumberOrWalletId: '0987654321',
    settlementChannel: 'Bank Account',
    status: 'Inactive',
    onboardingStatus: 'Pending',
    propertyAssociations: [],
    defaultFeeType: 'percentage',
    defaultFeeValue: 4.0,
    notes: 'New merchant, onboarding in progress.',
    createdAt: formatISO(subDays(now, 5)),
    updatedAt: formatISO(subDays(now, 1)),
  },
];

export const payments: Payment[] = [
  {
    id: 'pay-1',
    externalReference: 'ext-ref-001',
    bookingReferenceOrInvoiceReference: 'inv-2024-001',
    customerName: 'David Miller',
    customerEmail: 'david.miller@example.com',
    merchantId: 'mer-1',
    grossAmount: 1250.0,
    currency: 'USD',
    feeType: 'percentage',
    feeValue: 3.5,
    platformFeeAmount: 43.75,
    merchantNetAmount: 1206.25,
    paymentStatus: 'succeeded',
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    sourceChannel: 'Web',
    createdAt: formatISO(subDays(now, 1)),
    updatedAt: formatISO(now),
  },
  {
    id: 'pay-2',
    externalReference: 'ext-ref-002',
    bookingReferenceOrInvoiceReference: 'inv-2024-002',
    customerName: 'Emily Clark',
    customerEmail: 'emily.clark@example.com',
    merchantId: 'mer-2',
    grossAmount: 800.0,
    currency: 'USD',
    feeType: 'fixed',
    feeValue: 0.5,
    platformFeeAmount: 0.5,
    merchantNetAmount: 799.5,
    paymentStatus: 'succeeded',
    settlementStatus: 'processing',
    remittanceStatus: 'pending',
    sourceChannel: 'Mobile',
    createdAt: formatISO(subDays(now, 2)),
    updatedAt: formatISO(subDays(now, 1)),
  },
  {
    id: 'pay-3',
    externalReference: 'ext-ref-003',
    bookingReferenceOrInvoiceReference: 'inv-2024-003',
    customerName: 'Frank Wright',
    customerEmail: 'frank.wright@example.com',
    merchantId: 'mer-1',
    grossAmount: 200.0,
    currency: 'USD',
    feeType: 'percentage',
    feeValue: 3.5,
    platformFeeAmount: 7.0,
    merchantNetAmount: 193.0,
    paymentStatus: 'failed',
    settlementStatus: 'N/A',
    remittanceStatus: 'N/A',
    sourceChannel: 'API',
    createdAt: formatISO(subDays(now, 3)),
    updatedAt: formatISO(subDays(now, 3)),
  },
  {
    id: 'pay-4',
    externalReference: 'ext-ref-004',
    bookingReferenceOrInvoiceReference: 'inv-2024-004',
    customerName: 'Grace Hall',
    customerEmail: 'grace.hall@example.com',
    merchantId: 'mer-1',
    grossAmount: 1500.0,
    currency: 'USD',
    feeType: 'percentage',
    feeValue: 3.5,
    platformFeeAmount: 52.50,
    merchantNetAmount: 1447.50,
    paymentStatus: 'pending',
    settlementStatus: 'pending',
    remittanceStatus: 'pending',
    sourceChannel: 'Web',
    createdAt: formatISO(now),
    updatedAt: formatISO(now),
  },
];

export const settlements: Settlement[] = [
  {
    id: 'set-1',
    paymentId: 'pay-1',
    merchantId: 'mer-1',
    grossAmount: 1250.0,
    platformFeeAmount: 43.75,
    merchantNetAmount: 1206.25,
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    payoutReference: 'payout-ref-abc',
    failureReason: null,
    createdAt: formatISO(subDays(now, 1)),
    updatedAt: formatISO(now),
  },
  {
    id: 'set-2',
    paymentId: 'pay-2',
    merchantId: 'mer-2',
    grossAmount: 800.0,
    platformFeeAmount: 0.5,
    merchantNetAmount: 799.5,
    settlementStatus: 'processing',
    remittanceStatus: 'pending',
    payoutReference: 'payout-ref-def',
    failureReason: null,
    createdAt: formatISO(subDays(now, 2)),
    updatedAt: formatISO(subDays(now, 1)),
  },
  {
    id: 'set-3',
    paymentId: 'pay-xyz', // a failed one
    merchantId: 'mer-1',
    grossAmount: 950.0,
    platformFeeAmount: 33.25,
    merchantNetAmount: 916.75,
    settlementStatus: 'failed',
    remittanceStatus: 'failed',
    payoutReference: 'payout-ref-ghi',
    failureReason: 'Invalid merchant bank account.',
    createdAt: formatISO(subDays(now, 7)),
    updatedAt: formatISO(subDays(now, 6)),
  },
];

export const auditLogs: AuditLog[] = [
    {
        id: 'log-1',
        timestamp: formatISO(now),
        eventType: 'user.login',
        user: 'admin@speedypay.com',
        details: 'User logged in successfully from IP 192.168.1.1'
    },
    {
        id: 'log-2',
        timestamp: formatISO(subDays(now, 1)),
        eventType: 'payment.created',
        user: 'System',
        details: 'Payment pay-1 for $1250.00 created for merchant mer-1.'
    },
    {
        id: 'log-3',
        timestamp: formatISO(subDays(now, 1)),
        eventType: 'settlement.status.change',
        user: 'System',
        details: 'Settlement set-1 status changed to completed.'
    },
    {
        id: 'log-4',
        timestamp: formatISO(subDays(now, 2)),
        eventType: 'merchant.updated',
        user: 'admin@speedypay.com',
        details: 'Updated contact name for merchant mer-1.'
    },
    {
        id: 'log-5',
        timestamp: formatISO(subDays(now, 5)),
        eventType: 'merchant.created',
        user: 'admin@speedypay.com',
        details: 'Merchant mer-3 (City Center Lofts) created.'
    }
];

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return {
    totalGrossVolume: 350000.75,
    totalPlatformFees: 12250.25,
    totalMerchantNetRemittances: 337750.50,
    pendingSettlements: 12,
    failedSettlements: 3,
    activeMerchants: 28,
  }
}

// Mock API functions
export const getMerchants = async (): Promise<Merchant[]> => {
  return new Promise(resolve => setTimeout(() => resolve(merchants), 500));
}

export const getMerchantById = async (id: string): Promise<Merchant | undefined> => {
  return new Promise(resolve => setTimeout(() => resolve(merchants.find(m => m.id === id)), 300));
}

export const getPayments = async (): Promise<Payment[]> => {
  return new Promise(resolve => setTimeout(() => resolve(payments), 500));
}

export const getPaymentById = async (id: string): Promise<Payment | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(payments.find(p => p.id === id)), 300));
}

export const getRecentPayments = async (limit = 5): Promise<Payment[]> => {
    const sorted = [...payments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return new Promise(resolve => setTimeout(() => resolve(sorted.slice(0, limit)), 400));
}

export const getSettlements = async (): Promise<Settlement[]> => {
  return new Promise(resolve => setTimeout(() => resolve(settlements), 500));
}

export const getSettlementById = async (id: string): Promise<Settlement | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(settlements.find(s => s.id === id)), 300));
}

export const getRecentSettlements = async (limit = 5): Promise<Settlement[]> => {
    const sorted = [...settlements].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return new Promise(resolve => setTimeout(() => resolve(sorted.slice(0, limit)), 400));
}

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  return new Promise(resolve => setTimeout(() => resolve(auditLogs), 500));
}

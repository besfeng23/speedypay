import type { Merchant, Payment, Settlement, AuditLog, DashboardStats } from '@/lib/types';
import { subDays, subHours, subMinutes, formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const now = new Date();

export const merchants: Merchant[] = [
  {
    id: 'mer-1',
    businessName: 'Starlight Apartments',
    displayName: 'Starlight Apts',
    contactName: 'Alice Johnson',
    email: 'alice@starlight.com',
    mobile: '555-0101',
    settlementAccountName: 'Starlight Ops Checking',
    settlementAccountNumberOrWalletId: '**** **** **** 1234',
    settlementChannel: 'Bank Account',
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
    settlementAccountName: 'Oceanview Payouts',
    settlementAccountNumberOrWalletId: 'bob-wallet@walletprovider.com',
    settlementChannel: 'Digital Wallet',
    status: 'Active',
    onboardingStatus: 'Completed',
    propertyAssociations: ['P-003'],
    defaultFeeType: 'fixed',
    defaultFeeValue: 0.50,
    notes: 'Handles luxury rentals. Prefers wallet payouts.',
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
    settlementAccountNumberOrWalletId: '**** **** **** 5678',
    settlementChannel: 'Bank Account',
    status: 'Suspended',
    onboardingStatus: 'Completed',
    propertyAssociations: [],
    defaultFeeType: 'percentage',
    defaultFeeValue: 4.0,
    notes: 'Account suspended due to chargeback ratio. Under review.',
    createdAt: formatISO(subDays(now, 200)),
    updatedAt: formatISO(subDays(now, 7)),
  },
  {
    id: 'mer-4',
    businessName: 'Innovate SaaS Inc.',
    displayName: 'Innovate SaaS',
    contactName: 'Dana Scully',
    email: 'dana@innovatesaas.io',
    mobile: '555-0104',
    settlementAccountName: 'Innovate Operations',
    settlementAccountNumberOrWalletId: '**** **** **** 9012',
    settlementChannel: 'Bank Account',
    status: 'Active',
    onboardingStatus: 'Completed',
    propertyAssociations: [],
    defaultFeeType: 'percentage',
    defaultFeeValue: 2.9,
    notes: 'Software-as-a-Service, high transaction count, low average value.',
    createdAt: formatISO(subDays(now, 90)),
    updatedAt: formatISO(subDays(now, 10)),
  },
   {
    id: 'mer-5',
    businessName: 'Greenleaf Organics',
    displayName: 'Greenleaf',
    contactName: 'Eve Planter',
    email: 'eve@greenleaforganics.com',
    mobile: '555-0105',
    settlementAccountName: 'Greenleaf Business',
    settlementAccountNumberOrWalletId: '**** **** **** 3456',
    settlementChannel: 'Bank Account',
    status: 'Inactive',
    onboardingStatus: 'Pending',
    propertyAssociations: [],
    defaultFeeType: 'percentage',
    defaultFeeValue: 3.5,
    notes: 'New merchant, onboarding in progress. KYC verification pending.',
    createdAt: formatISO(subDays(now, 5)),
    updatedAt: formatISO(subDays(now, 1)),
  },
];

export const payments: Payment[] = [
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
    settlementStatus: 'processing',
    remittanceStatus: 'pending',
    sourceChannel: 'Mobile',
    createdAt: formatISO(subHours(now, 5)),
    updatedAt: formatISO(subHours(now, 4)),
  },
  {
    id: 'pay-3',
    externalReference: 'ch_3Pq...Y89',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-003',
    customerName: 'Frank Wright',
    customerEmail: 'frank.wright@example.com',
    merchantId: 'mer-1',
    grossAmount: 200.00,
    currency: 'USD',
    feeType: 'percentage',
    feeValue: 3.2,
    platformFeeAmount: 6.40,
    merchantNetAmount: 193.60,
    paymentStatus: 'failed',
    settlementStatus: 'N/A',
    remittanceStatus: 'N/A',
    sourceChannel: 'API',
    createdAt: formatISO(subDays(now, 3)),
    updatedAt: formatISO(subDays(now, 3)),
  },
  {
    id: 'pay-4',
    externalReference: 'ch_3Pq...Z12',
    bookingReferenceOrInvoiceReference: 'inv-2024-06-112',
    customerName: 'Grace Hall',
    customerEmail: 'grace.hall@example.com',
    merchantId: 'mer-4',
    grossAmount: 49.99,
    currency: 'USD',
    feeType: 'percentage',
    feeValue: 2.9,
    platformFeeAmount: 1.45,
    merchantNetAmount: 48.54,
    paymentStatus: 'succeeded',
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    sourceChannel: 'Web',
    createdAt: formatISO(subDays(now, 10)),
    updatedAt: formatISO(subDays(now, 9)),
  },
  {
    id: 'pay-5',
    externalReference: 'ch_3Pq...A34',
    bookingReferenceOrInvoiceReference: 'inv-2024-07-005',
    customerName: 'Heidi Turner',
    customerEmail: 'heidi.turner@example.com',
    merchantId: 'mer-3',
    grossAmount: 1500.00,
    currency: 'USD',
    feeType: 'percentage',
    feeValue: 4.0,
    platformFeeAmount: 60.00,
    merchantNetAmount: 1440.00,
    paymentStatus: 'succeeded',
    settlementStatus: 'failed',
    remittanceStatus: 'N/A',
    sourceChannel: 'Web',
    createdAt: formatISO(subDays(now, 8)),
    updatedAt: formatISO(subDays(now, 7)),
  },
];

export const settlements: Settlement[] = [
  {
    id: 'set-' + uuidv4().slice(0,8),
    paymentId: 'pay-1',
    merchantId: 'mer-1',
    grossAmount: 1250.00,
    platformFeeAmount: 40.00,
    merchantNetAmount: 1210.00,
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    payoutReference: 'po_1Pq...sE1',
    failureReason: null,
    createdAt: formatISO(subHours(now, 23)),
    updatedAt: formatISO(subHours(now, 20)),
  },
  {
    id: 'set-' + uuidv4().slice(0,8),
    paymentId: 'pay-2',
    merchantId: 'mer-2',
    grossAmount: 800.00,
    platformFeeAmount: 0.50,
    merchantNetAmount: 799.50,
    settlementStatus: 'processing',
    remittanceStatus: 'pending',
    payoutReference: 'po_1Pq...tF2',
    failureReason: null,
    createdAt: formatISO(subHours(now, 5)),
    updatedAt: formatISO(subHours(now, 4)),
  },
  {
    id: 'set-' + uuidv4().slice(0,8),
    paymentId: 'pay-5',
    merchantId: 'mer-3',
    grossAmount: 1500.00,
    platformFeeAmount: 60.00,
    merchantNetAmount: 1440.00,
    settlementStatus: 'failed',
    remittanceStatus: 'N/A',
    payoutReference: 'po_1Pq...uG3',
    failureReason: "Merchant's account is suspended. Payouts are blocked.",
    createdAt: formatISO(subDays(now, 8)),
    updatedAt: formatISO(subDays(now, 7)),
  },
  {
    id: 'set-' + uuidv4().slice(0,8),
    paymentId: 'pay-4',
    merchantId: 'mer-4',
    grossAmount: 49.99,
    platformFeeAmount: 1.45,
    merchantNetAmount: 48.54,
    settlementStatus: 'completed',
    remittanceStatus: 'sent',
    payoutReference: 'po_1Pq...vH4',
    failureReason: null,
    createdAt: formatISO(subDays(now, 10)),
    updatedAt: formatISO(subDays(now, 9)),
  },
];

export const auditLogs: AuditLog[] = [
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
    {
        id: 'log-3',
        timestamp: formatISO(subHours(now, 22)),
        eventType: 'payment.status.change',
        user: 'System',
        details: 'Payment status changed to succeeded.',
        entityId: 'pay-1',
        amount: null,
    },
    {
        id: 'log-4',
        timestamp: formatISO(subHours(now, 21)),
        eventType: 'settlement.created',
        user: 'System',
        details: 'Settlement record created.',
        entityId: 'pay-1',
        amount: 1210.00,
    },
    {
        id: 'log-5',
        timestamp: formatISO(subHours(now, 20)),
        eventType: 'settlement.status.change',
        user: 'System',
        details: 'Settlement status changed to completed, remittance sent.',
        entityId: settlements.find(s => s.paymentId === 'pay-1')?.id || '',
        amount: null,
    },
    {
        id: 'log-6',
        timestamp: formatISO(subDays(now, 2)),
        eventType: 'merchant.updated',
        user: 'admin@speedypay.com',
        details: 'Updated contact name for merchant Starlight Apts.',
        entityId: 'mer-1',
        amount: null,
    },
     {
        id: 'log-7',
        timestamp: formatISO(subDays(now, 7)),
        eventType: 'merchant.status.change',
        user: 'System (Automated Risk)',
        details: 'Merchant suspended due to high chargeback rate.',
        entityId: 'mer-3',
        amount: null,
    },
     {
        id: 'log-8',
        timestamp: formatISO(subDays(now, 8)),
        eventType: 'settlement.failed',
        user: 'System',
        details: 'Settlement failed. Reason: Merchant\'s account is suspended.',
        entityId: 'pay-5',
        amount: 1440.00,
    }
];

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return {
    totalGrossVolume: 352649.99,
    totalPlatformFees: 12317.85,
    totalMerchantNetRemittances: 340332.14,
    pendingSettlements: 1,
    failedSettlements: 1,
    activeMerchants: 3,
  }
}

// Mock API functions
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

export const getAuditLogsByEntity = async (entityId: string): Promise<AuditLog[]> => {
    const entityLogs = auditLogs.filter(log => log.entityId === entityId || (log.entityId && settlements.some(s => s.id === log.entityId && s.paymentId === entityId)))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return new Promise(resolve => setTimeout(() => resolve(entityLogs), 200));
}

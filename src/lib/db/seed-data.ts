/**
 * @file This file contains the initial seed data for the in-memory mock database.
 * In a real application, this data would likely be part of a database migration or seed script.
 * THIS IS FOR DEMONSTRATION PURPOSES ONLY.
 */

import type { Payment, Settlement, AuditLog, UATTestCase, Entity, TenantRecord, MerchantAccount, SettlementDestination, AllocationRule, Payout } from '@/lib/types';
import { subDays, subHours, subMinutes, formatISO } from 'date-fns';

const now = new Date();

// --- V2 Seed Data (Multi-Entity) ---

export const seedEntities: Entity[] = [
    // Level 0: The Processor
    {
        id: 'ent-speedypay',
        legalName: 'SpeedyPay Payments Inc.',
        displayName: 'SpeedyPay Inc.',
        entityType: 'speedypay',
        parentEntityId: null,
        status: 'active',
        metadata: { version: '1.0' },
        createdAt: formatISO(subDays(now, 200)),
        updatedAt: formatISO(subDays(now, 200)),
    },
    // Level 1: Our Platform Entity
    {
        id: 'ent-platform',
        legalName: 'Marketplace Platform LLC',
        displayName: 'Our Platform Entity',
        entityType: 'platform',
        parentEntityId: 'ent-speedypay', // Conceptually, the platform is built on the processor
        status: 'active',
        metadata: { version: '1.0' },
        createdAt: formatISO(subDays(now, 100)),
        updatedAt: formatISO(subDays(now, 100)),
    },
    // Level 2: A Tenant of the Platform
    {
        id: 'ent-collo',
        legalName: 'Collo Properties Inc.',
        displayName: 'Collo',
        entityType: 'tenant',
        parentEntityId: 'ent-platform',
        status: 'active',
        metadata: {},
        createdAt: formatISO(subDays(now, 50)),
        updatedAt: formatISO(subDays(now, 1)),
    },
    // Level 3: A Client Merchant of the Tenant
    {
        id: 'ent-collo-client-1',
        legalName: 'Example Collo Client Merchant Corp.',
        displayName: 'Example Collo Client',
        entityType: 'merchant',
        parentEntityId: 'ent-collo',
        status: 'active',
        metadata: { contactName: 'Alice Johnson', email: 'alice@example-client.com', mobile: '555-0101' },
        createdAt: formatISO(subDays(now, 45)),
        updatedAt: formatISO(subDays(now, 2)),
    },
];

export const seedTenants: TenantRecord[] = [
  {
    id: 'tnt-collo',
    entityId: 'ent-collo',
    tenantCode: 'COLLO',
    status: 'active',
    settings: { theme: 'default' },
    createdAt: formatISO(subDays(now, 50)),
    updatedAt: formatISO(subDays(now, 1)),
  },
];

export const seedAllocationRules: AllocationRule[] = [
    {
        id: 'ar-proc-fee',
        tenantId: null,
        merchantAccountId: null,
        paymentMethod: 'all',
        ruleType: 'processing_fee',
        percentageValue: 0.5, // 0.5%
        flatValue: 5.00,      // 5 PHP
        recipientEntityId: 'ent-speedypay',
        priority: 10,
        active: true,
        createdAt: formatISO(subDays(now, 200)),
        updatedAt: formatISO(subDays(now, 200)),
    },
    {
        id: 'ar-platform-fee',
        tenantId: null,
        merchantAccountId: null,
        paymentMethod: 'all',
        ruleType: 'platform_fee',
        percentageValue: 0.2, // 0.2%
        flatValue: null,
        recipientEntityId: 'ent-platform',
        priority: 20,
        active: true,
        createdAt: formatISO(subDays(now, 200)),
        updatedAt: formatISO(subDays(now, 200)),
    },
    {
        id: 'ar-tenant-fee-collo',
        tenantId: 'tnt-collo',
        merchantAccountId: null,
        paymentMethod: 'all',
        ruleType: 'tenant_fee',
        percentageValue: 0.1, // 0.1%
        flatValue: null,
        recipientEntityId: 'ent-collo',
        priority: 30,
        active: true,
        createdAt: formatISO(subDays(now, 50)),
        updatedAt: formatISO(subDays(now, 1)),
    },
];

export const seedMerchantAccounts: MerchantAccount[] = [
  {
    id: 'mer-collo-client-1',
    tenantId: 'tnt-collo',
    entityId: 'ent-collo-client-1',
    onboardingStatus: 'completed',
    kycStatus: 'approved',
    riskStatus: 'low',
    activationStatus: 'active',
    settlementStatus: 'active',
    defaultSettlementDestinationId: 'sd-collo-client-1',
    createdAt: formatISO(subDays(now, 45)),
    updatedAt: formatISO(subDays(now, 2)),
  },
];

export const seedSettlementDestinations: SettlementDestination[] = [
    {
        id: 'sd-collo-client-1',
        merchantAccountId: 'mer-collo-client-1',
        destinationType: 'bank',
        accountName: 'Alice B Johnson',
        accountNumberMasked: '******7890',
        bankCode: 'BPI',
        providerReference: null,
        verificationStatus: 'verified',
        isDefault: true,
        createdAt: formatISO(subDays(now, 45)),
        updatedAt: formatISO(subDays(now, 2)),
    },
];


// --- Transactional Seed Data for Demonstration ---

// Based on a 1000 PHP payment and the allocation rules:
// Processor Fee: (1000 * 0.005) + 5 = 10.00 PHP
// Platform Fee:  1000 * 0.002 = 2.00 PHP
// Tenant Fee:    1000 * 0.001 = 1.00 PHP
// Total Fees: 13.00 PHP
// Merchant Net: 1000 - 13 = 987.00 PHP
export const seedPayments: Payment[] = [
  {
    id: 'pay-demo-1000',
    tenantId: 'tnt-collo',
    merchantId: 'mer-collo-client-1',
    externalReference: 'ch_dem...123',
    bookingReferenceOrInvoiceReference: 'Demo Payment for Collo Client',
    customerName: 'John Q. Customer',
    customerEmail: 'john.q.customer@example.com',
    grossAmount: 1000.00,
    currency: 'PHP',
    platformFeeAmount: 13.00, // Total of all non-merchant allocations
    merchantNetAmount: 987.00,
    paymentStatus: 'succeeded',
    settlementStatus: 'completed',
    createdAt: formatISO(subHours(now, 2)),
    updatedAt: formatISO(subHours(now, 1)),
  },
];

export const seedSettlements: Settlement[] = [
  {
    id: 'set-demo-1000',
    tenantId: 'tnt-collo',
    paymentId: 'pay-demo-1000',
    merchantId: 'mer-collo-client-1',
    grossAmount: 1000.00,
    currency: 'PHP',
    platformFeeAmount: 13.00,
    merchantNetAmount: 987.00,
    status: 'unpaid', // This represents the "payout instruction prepared" state
    payoutId: null,
    createdAt: formatISO(subHours(now, 1)),
    updatedAt: formatISO(subHours(now, 1)),
  },
];

export const seedPayouts: Payout[] = []; // No payouts yet, as the settlement is `unpaid`

export const seedAuditLogs: AuditLog[] = [
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
        timestamp: formatISO(subHours(now, 2)),
        eventType: 'payment.created',
        user: 'System',
        details: 'Payment created via API for John Q. Customer.',
        entityId: 'pay-demo-1000',
        entityType: 'payment',
    },
    {
        id: 'log-3',
        timestamp: formatISO(subHours(now, 1)),
        eventType: 'settlement.created',
        user: 'System',
        details: 'Internal settlement created from successful payment. Status: unpaid.',
        entityId: 'set-demo-1000',
        entityType: 'settlement',
    },
];

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

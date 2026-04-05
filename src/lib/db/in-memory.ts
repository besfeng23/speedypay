/**
 * @file This file contains the in-memory mock database for the application.
 * It initializes with seed data and provides functions for runtime data manipulation.
 * THIS IS FOR DEMONSTRATION PURPOSES ONLY. DO NOT USE IN PRODUCTION.
 * In a real application, this entire file would be replaced by a proper database client
 * and the functions in `src/lib/data.ts` would be updated to call it.
 */

import type { Merchant, Payment, Settlement, AuditLog, UATLog, UATTestCase } from '@/lib/types';
import { seedMerchants, seedPayments, seedSettlements, seedAuditLogs, uatTestCases } from './seed-data';
import { v4 as uuidv4 } from 'uuid';
import { formatISO } from 'date-fns';

// --- In-Memory Data Store ---
let merchants: Merchant[] = [...seedMerchants];
let payments: Payment[] = [...seedPayments];
let settlements: Settlement[] = [...seedSettlements];
let auditLogs: AuditLog[] = [...seedAuditLogs];
let uatLogs: UATLog[] = [];

// --- Data Access Functions for the In-Memory Store ---

// Merchants
export const getAllMerchants = () => [...merchants].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const findMerchantById = (id: string) => merchants.find(m => m.id === id);
export const addMerchant = (merchant: Merchant) => {
    merchants.unshift(merchant);
    return merchant;
};

// Payments
export const getAllPayments = () => [...payments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const findPaymentById = (id: string) => payments.find(p => p.id === id);
export const addPayment = (payment: Payment) => {
    console.log('[Data] Adding new payment:', payment.id);
    payments.unshift(payment);
    return payment;
};
export const updatePayment = (id: string, updatedData: Partial<Payment>) => {
    const index = payments.findIndex(p => p.id === id);
    if (index > -1) {
        payments[index] = { ...payments[index], ...updatedData, updatedAt: formatISO(new Date()) };
        return payments[index];
    }
    return undefined;
};

// Settlements
export const getAllSettlements = () => [...settlements].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const findSettlementById = (id: string) => settlements.find(s => s.id === id);
export const findSettlementByPaymentId = (paymentId: string) => settlements.find(s => s.paymentId === paymentId);
export const addSettlement = (settlement: Settlement) => {
    settlements.unshift(settlement);
    return settlement;
};
export const updateSettlement = (id: string, updatedData: Partial<Settlement>) => {
    const index = settlements.findIndex(s => s.id === id);
    if (index > -1) {
        settlements[index] = { ...settlements[index], ...updatedData, updatedAt: formatISO(new Date()) };
        return settlements[index];
    }
    return undefined;
};

// Audit Logs
export const getAllAuditLogs = () => [...auditLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const findAuditLogByEventIdentifier = (eventIdentifier: string) => auditLogs.find(l => l.eventIdentifier === eventIdentifier);
export const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    console.log('[Audit Log]', log.details);
    const newLog: AuditLog = {
        ...log,
        id: `log-${uuidv4()}`,
        timestamp: formatISO(new Date()),
    };
    auditLogs.unshift(newLog);
    return newLog;
};

// UAT
export const getAllUATLogs = () => [...uatLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const getUATTestCases = () => uatTestCases;
export const addUATLog = (log: Omit<UATLog, 'id' | 'timestamp'>) => {
    console.log(`[UAT Log - ${log.status.toUpperCase()}]`, log.notes);
    const newLog: UATLog = {
        ...log,
        id: `uatlog-${uuidv4()}`,
        timestamp: formatISO(new Date()),
    };
    uatLogs.unshift(newLog);
    return newLog;
};

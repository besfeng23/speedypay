/**
 * @file This file serves as the data access layer (repository) for the application.
 * It abstracts the data source, which is currently a mock in-memory store.
 *
 * To connect to a real database (e.g., Firestore):
 * 1. Replace the import of `db` from `'./db/in-memory'` with your actual database client.
 * 2. Update the implementation of each function to call your database instead of the `db` methods.
 * 3. The function signatures are async and return Promises, so the rest of the application
 *    will not need to change.
 */

import type { Merchant, Payment, Settlement, AuditLog, DashboardStats, UATTestCase, UATLog } from '@/lib/types';
import * as db from './db/in-memory';

const SIMULATED_LATENCY_MS = 200;

// --- Data Fetching Functions (Public API of the Data Layer) ---

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const allPayments = await db.getAllPayments();
  const allSettlements = await db.getAllSettlements();
  const allMerchants = await db.getAllMerchants();
  const recentPayments = await getRecentPayments();
  const recentSettlements = await getRecentSettlements();


  return new Promise(resolve => setTimeout(() => resolve({
    totalGrossVolume: allPayments.filter(p => p.paymentStatus === 'succeeded').reduce((sum, p) => sum + p.grossAmount, 0),
    totalPlatformFees: allPayments.filter(p => p.paymentStatus === 'succeeded').reduce((sum, p) => sum + p.platformFeeAmount, 0),
    totalMerchantNetRemittances: allSettlements.filter(s => s.remittanceStatus === 'sent').reduce((sum, s) => sum + s.merchantNetAmount, 0),
    activeMerchants: allMerchants.filter(m => m.status === 'active').length,
    pendingSettlements: allSettlements.filter(s => s.remittanceStatus === 'pending').length,
    failedSettlements: allSettlements.filter(s => s.remittanceStatus === 'failed').length,
    processingPayments: allPayments.filter(p => p.paymentStatus === 'processing').length,
    failedPayments: allPayments.filter(p => p.paymentStatus === 'failed').length,
    recentTransactionsCount: recentPayments.length,
    recentSettlementEventsCount: recentSettlements.length
  }), SIMULATED_LATENCY_MS));
}

export const getMerchants = async (): Promise<Merchant[]> => {
  return new Promise(resolve => setTimeout(() => resolve(db.getAllMerchants()), SIMULATED_LATENCY_MS));
}

export const getMerchantById = async (id: string): Promise<Merchant | undefined> => {
  return new Promise(resolve => setTimeout(() => resolve(db.findMerchantById(id)), SIMULATED_LATENCY_MS));
}

export const getPayments = async (): Promise<Payment[]> => {
  return new Promise(resolve => setTimeout(() => resolve(db.getAllPayments()), SIMULATED_LATENCY_MS));
}

export const getPaymentById = async (id: string): Promise<Payment | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(db.findPaymentById(id)), SIMULATED_LATENCY_MS));
}

export const getRecentPayments = async (limit = 5): Promise<Payment[]> => {
    const allPayments = await getPayments();
    return allPayments.slice(0, limit);
}

export const getPaymentsByMerchantId = async (merchantId: string, limit?: number): Promise<Payment[]> => {
    const allPayments = await getPayments();
    const merchantPayments = allPayments.filter(p => p.merchantId === merchantId);
    const result = limit ? merchantPayments.slice(0, limit) : merchantPayments;
    return new Promise(resolve => setTimeout(() => resolve(result), SIMULATED_LATENCY_MS));
}

export const getSettlements = async (): Promise<Settlement[]> => {
  return new Promise(resolve => setTimeout(() => resolve(db.getAllSettlements()), SIMULATED_LATENCY_MS));
}

export const getSettlementById = async (id: string): Promise<Settlement | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(db.findSettlementById(id)), SIMULATED_LATENCY_MS));
}

export const getSettlementByPaymentId = async (paymentId: string): Promise<Settlement | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(db.findSettlementByPaymentId(paymentId)), SIMULATED_LATENCY_MS));
}

export const getRecentSettlements = async (limit = 5): Promise<Settlement[]> => {
    const allSettlements = await getSettlements();
    return allSettlements.slice(0, limit);
}

export const getSettlementsByMerchantId = async (merchantId: string, limit?: number): Promise<Settlement[]> => {
    const allSettlements = await getSettlements();
    const merchantSettlements = allSettlements.filter(s => s.merchantId === merchantId);
    const result = limit ? merchantSettlements.slice(0, limit) : merchantSettlements;
    return new Promise(resolve => setTimeout(() => resolve(result), SIMULATED_LATENCY_MS));
}

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  return new Promise(resolve => setTimeout(() => resolve(db.getAllAuditLogs()), SIMULATED_LATENCY_MS));
}

export const getAuditLogsByEntity = async (entityType: 'payment' | 'settlement', entityId: string): Promise<AuditLog[]> => {
    let relatedIds: string[] = [entityId];
    if (entityType === 'settlement') {
        const settlement = await getSettlementById(entityId);
        if (settlement) relatedIds.push(settlement.paymentId);
    }
     if (entityType === 'payment') {
        const settlement = await getSettlementByPaymentId(entityId);
        if (settlement) relatedIds.push(settlement.id);
    }
    
    const allLogs = await getAuditLogs();
    const entityLogs = allLogs
        .filter(log => log.entityId && relatedIds.includes(log.entityId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return new Promise(resolve => setTimeout(() => resolve(entityLogs), SIMULATED_LATENCY_MS));
}

export const getAuditLogsByEventTypePrefix = async (prefix: string, limit = 5): Promise<AuditLog[]> => {
  const allLogs = await getAuditLogs();
  const filteredLogs = allLogs.filter(log => log.eventType.startsWith(prefix));
  const result = limit ? filteredLogs.slice(0, limit) : filteredLogs;
  return new Promise(resolve => setTimeout(() => resolve(result), SIMULATED_LATENCY_MS));
}

export async function findAuditLogByEventIdentifier(eventIdentifier: string): Promise<AuditLog | undefined> {
    const log = db.findAuditLogByEventIdentifier(eventIdentifier);
    return new Promise(resolve => setTimeout(() => resolve(log), 50));
}

export const getUATTestCases = async (): Promise<UATTestCase[]> => {
    return new Promise(resolve => setTimeout(() => resolve(db.getUATTestCases()), 100));
}

export const getUATLogs = async (): Promise<UATLog[]> => {
    return new Promise(resolve => setTimeout(() => resolve(db.getAllUATLogs()), 100));
}

// --- Data Mutation Functions ---

export async function addMerchant(merchant: Merchant): Promise<Merchant> {
    return db.addMerchant(merchant);
}

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    return db.addAuditLog(log);
}

export async function addPayment(payment: Payment): Promise<Payment> {
    return db.addPayment(payment);
}

export async function addSettlement(settlement: Settlement): Promise<Settlement> {
    return db.addSettlement(settlement);
}

export async function addUATLog(log: Omit<UATLog, 'id' | 'timestamp'>): Promise<UATLog> {
    return db.addUATLog(log);
}

export async function updateSettlement(id: string, updatedData: Partial<Settlement>): Promise<Settlement | undefined> {
    return db.updateSettlement(id, updatedData);
}

export async function updatePayment(id: string, updatedData: Partial<Payment>): Promise<Payment | undefined> {
    return db.updatePayment(id, updatedData);
}

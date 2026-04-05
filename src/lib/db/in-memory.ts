/**
 * @file Managed Postgres-backed repository implementation.
 *
 * NOTE: File retained as `in-memory.ts` to preserve repository import seams.
 */

import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog, Merchant, Payment, Settlement, UATLog, UATTestCase } from '@/lib/types';
import { uatTestCases } from './seed-data';
import { queryOne, queryRows, withTransaction } from './postgres';

type WebhookEventState = 'received' | 'processing' | 'processed' | 'failed';

const PROCESSING_LEASE_INTERVAL = '2 minutes';

// Merchants
export const getAllMerchants = async (): Promise<Merchant[]> => {
  const rows = await queryRows<{ payload: Merchant }>('SELECT payload FROM merchants ORDER BY created_at DESC');
  return rows.map((row) => row.payload);
};

export const findMerchantById = async (id: string): Promise<Merchant | undefined> => {
  const row = await queryOne<{ payload: Merchant }>('SELECT payload FROM merchants WHERE id = $1', [id]);
  return row?.payload;
};

export const addMerchant = async (merchant: Merchant): Promise<Merchant> => {
  await queryRows(
    'INSERT INTO merchants (id, created_at, payload) VALUES ($1, $2::timestamptz, $3::jsonb)',
    [merchant.id, merchant.createdAt, JSON.stringify(merchant)]
  );
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

export const addPayment = async (payment: Payment): Promise<Payment> => {
  await queryRows(
    'INSERT INTO payments (id, merchant_id, created_at, payload) VALUES ($1, $2, $3::timestamptz, $4::jsonb)',
    [payment.id, payment.merchantId, payment.createdAt, JSON.stringify(payment)]
  );
  return payment;
};

export const updatePayment = async (id: string, updatedData: Partial<Payment>): Promise<Payment | undefined> => {
  const current = await findPaymentById(id);
  if (!current) return undefined;
  const updated: Payment = { ...current, ...updatedData, updatedAt: formatISO(new Date()) };

  await queryRows(
    'UPDATE payments SET merchant_id = $1, created_at = $2::timestamptz, payload = $3::jsonb WHERE id = $4',
    [updated.merchantId, updated.createdAt, JSON.stringify(updated), id]
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
    'INSERT INTO settlements (id, payment_id, merchant_id, created_at, payload) VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)',
    [settlement.id, settlement.paymentId, settlement.merchantId, settlement.createdAt, JSON.stringify(settlement)]
  );

  return settlement;
};

export const updateSettlement = async (id: string, updatedData: Partial<Settlement>): Promise<Settlement | undefined> => {
  const current = await findSettlementById(id);
  if (!current) return undefined;
  const updated: Settlement = { ...current, ...updatedData, updatedAt: formatISO(new Date()) };

  await queryRows(
    'UPDATE settlements SET payment_id = $1, merchant_id = $2, created_at = $3::timestamptz, payload = $4::jsonb WHERE id = $5',
    [updated.paymentId, updated.merchantId, updated.createdAt, JSON.stringify(updated), id]
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

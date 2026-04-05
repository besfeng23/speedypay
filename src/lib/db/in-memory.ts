/**
 * @file Durable SQLite-backed repository implementation.
 *
 * NOTE: File retained as `in-memory.ts` to avoid import churn, but storage is now SQLite.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog, Merchant, Payment, Settlement, UATLog, UATTestCase } from '@/lib/types';
import { seedAuditLogs, seedMerchants, seedPayments, seedSettlements, uatTestCases } from './seed-data';

type WebhookEventState = 'received' | 'processing' | 'processed' | 'failed';

const DATA_DIR = join(process.cwd(), '.data');
const DB_PATH = join(DATA_DIR, 'speedypay.sqlite');

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      event_identifier TEXT,
      entity_id TEXT,
      payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_event_identifier ON audit_logs(event_identifier) WHERE event_identifier IS NOT NULL;

    CREATE TABLE IF NOT EXISTS uat_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      event_identifier TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      order_seq TEXT,
      trans_seq TEXT,
      received_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_error TEXT
    );
  `);
}

function seedIfEmpty() {
  const insertMerchant = db.prepare('INSERT OR IGNORE INTO merchants (id, created_at, payload) VALUES (@id, @createdAt, @payload)');
  const insertPayment = db.prepare('INSERT OR IGNORE INTO payments (id, merchant_id, created_at, payload) VALUES (@id, @merchantId, @createdAt, @payload)');
  const insertSettlement = db.prepare('INSERT OR IGNORE INTO settlements (id, payment_id, merchant_id, created_at, payload) VALUES (@id, @paymentId, @merchantId, @createdAt, @payload)');
  const insertAuditLog = db.prepare('INSERT OR IGNORE INTO audit_logs (id, timestamp, event_identifier, entity_id, payload) VALUES (@id, @timestamp, @eventIdentifier, @entityId, @payload)');

  const tx = db.transaction(() => {
    for (const merchant of seedMerchants) {
      insertMerchant.run({ id: merchant.id, createdAt: merchant.createdAt, payload: JSON.stringify(merchant) });
    }
    for (const payment of seedPayments) {
      insertPayment.run({ id: payment.id, merchantId: payment.merchantId, createdAt: payment.createdAt, payload: JSON.stringify(payment) });
    }
    for (const settlement of seedSettlements) {
      insertSettlement.run({ id: settlement.id, paymentId: settlement.paymentId, merchantId: settlement.merchantId, createdAt: settlement.createdAt, payload: JSON.stringify(settlement) });
    }
    for (const log of seedAuditLogs) {
      insertAuditLog.run({
        id: log.id,
        timestamp: log.timestamp,
        eventIdentifier: log.eventIdentifier ?? null,
        entityId: log.entityId,
        payload: JSON.stringify(log),
      });
    }
  });

  tx();
}

initSchema();
seedIfEmpty();

function parseRow<T>(payload: string): T {
  return JSON.parse(payload) as T;
}

// Merchants
export const getAllMerchants = (): Merchant[] => {
  const rows = db.prepare('SELECT payload FROM merchants ORDER BY datetime(created_at) DESC').all() as Array<{ payload: string }>;
  return rows.map((row) => parseRow<Merchant>(row.payload));
};

export const findMerchantById = (id: string): Merchant | undefined => {
  const row = db.prepare('SELECT payload FROM merchants WHERE id = ?').get(id) as { payload: string } | undefined;
  return row ? parseRow<Merchant>(row.payload) : undefined;
};

export const addMerchant = (merchant: Merchant): Merchant => {
  db.prepare('INSERT INTO merchants (id, created_at, payload) VALUES (?, ?, ?)').run(merchant.id, merchant.createdAt, JSON.stringify(merchant));
  return merchant;
};

// Payments
export const getAllPayments = (): Payment[] => {
  const rows = db.prepare('SELECT payload FROM payments ORDER BY datetime(created_at) DESC').all() as Array<{ payload: string }>;
  return rows.map((row) => parseRow<Payment>(row.payload));
};

export const findPaymentById = (id: string): Payment | undefined => {
  const row = db.prepare('SELECT payload FROM payments WHERE id = ?').get(id) as { payload: string } | undefined;
  return row ? parseRow<Payment>(row.payload) : undefined;
};

export const addPayment = (payment: Payment): Payment => {
  db.prepare('INSERT INTO payments (id, merchant_id, created_at, payload) VALUES (?, ?, ?, ?)').run(payment.id, payment.merchantId, payment.createdAt, JSON.stringify(payment));
  return payment;
};

export const updatePayment = (id: string, updatedData: Partial<Payment>): Payment | undefined => {
  const current = findPaymentById(id);
  if (!current) return undefined;
  const updated: Payment = { ...current, ...updatedData, updatedAt: formatISO(new Date()) };
  db.prepare('UPDATE payments SET merchant_id = ?, created_at = ?, payload = ? WHERE id = ?').run(updated.merchantId, updated.createdAt, JSON.stringify(updated), id);
  return updated;
};

// Settlements
export const getAllSettlements = (): Settlement[] => {
  const rows = db.prepare('SELECT payload FROM settlements ORDER BY datetime(created_at) DESC').all() as Array<{ payload: string }>;
  return rows.map((row) => parseRow<Settlement>(row.payload));
};

export const findSettlementById = (id: string): Settlement | undefined => {
  const row = db.prepare('SELECT payload FROM settlements WHERE id = ?').get(id) as { payload: string } | undefined;
  return row ? parseRow<Settlement>(row.payload) : undefined;
};

export const findSettlementByPaymentId = (paymentId: string): Settlement | undefined => {
  const row = db.prepare('SELECT payload FROM settlements WHERE payment_id = ?').get(paymentId) as { payload: string } | undefined;
  return row ? parseRow<Settlement>(row.payload) : undefined;
};

export const addSettlement = (settlement: Settlement): Settlement => {
  db.prepare('INSERT INTO settlements (id, payment_id, merchant_id, created_at, payload) VALUES (?, ?, ?, ?, ?)').run(
    settlement.id,
    settlement.paymentId,
    settlement.merchantId,
    settlement.createdAt,
    JSON.stringify(settlement)
  );
  return settlement;
};

export const updateSettlement = (id: string, updatedData: Partial<Settlement>): Settlement | undefined => {
  const current = findSettlementById(id);
  if (!current) return undefined;
  const updated: Settlement = { ...current, ...updatedData, updatedAt: formatISO(new Date()) };
  db.prepare('UPDATE settlements SET payment_id = ?, merchant_id = ?, created_at = ?, payload = ? WHERE id = ?').run(
    updated.paymentId,
    updated.merchantId,
    updated.createdAt,
    JSON.stringify(updated),
    id
  );
  return updated;
};

// Audit Logs
export const getAllAuditLogs = (): AuditLog[] => {
  const rows = db.prepare('SELECT payload FROM audit_logs ORDER BY datetime(timestamp) DESC').all() as Array<{ payload: string }>;
  return rows.map((row) => parseRow<AuditLog>(row.payload));
};

export const findAuditLogByEventIdentifier = (eventIdentifier: string): AuditLog | undefined => {
  const row = db.prepare('SELECT payload FROM audit_logs WHERE event_identifier = ? LIMIT 1').get(eventIdentifier) as { payload: string } | undefined;
  return row ? parseRow<AuditLog>(row.payload) : undefined;
};

export const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog => {
  const now = formatISO(new Date());
  const newLog: AuditLog = {
    ...log,
    id: `log-${uuidv4()}`,
    timestamp: now,
  };

  db.prepare('INSERT INTO audit_logs (id, timestamp, event_identifier, entity_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    newLog.id,
    newLog.timestamp,
    newLog.eventIdentifier ?? null,
    newLog.entityId,
    JSON.stringify(newLog)
  );

  return newLog;
};

// Webhook events (durable idempotency)
export const claimWebhookEventForProcessing = (eventIdentifier: string, orderSeq?: string, transSeq?: string): 'started' | 'already-processed' | 'in-progress' => {
  const now = formatISO(new Date());

  const insert = db.prepare(
    `INSERT INTO webhook_events (event_identifier, state, order_seq, trans_seq, received_at, updated_at)
     VALUES (?, 'processing', ?, ?, ?, ?)
     ON CONFLICT(event_identifier) DO NOTHING`
  );

  const result = insert.run(eventIdentifier, orderSeq ?? null, transSeq ?? null, now, now);
  if (result.changes > 0) return 'started';

  const row = db.prepare('SELECT state FROM webhook_events WHERE event_identifier = ?').get(eventIdentifier) as { state: WebhookEventState } | undefined;
  if (!row) return 'in-progress';
  if (row.state === 'processed') return 'already-processed';
  return 'in-progress';
};

export const markWebhookEventProcessed = (eventIdentifier: string) => {
  const now = formatISO(new Date());
  db.prepare("UPDATE webhook_events SET state = 'processed', updated_at = ?, last_error = NULL WHERE event_identifier = ?").run(now, eventIdentifier);
};

export const releaseWebhookEventClaim = (eventIdentifier: string, errorMessage?: string) => {
  const now = formatISO(new Date());
  db.prepare("UPDATE webhook_events SET state = 'failed', updated_at = ?, last_error = ? WHERE event_identifier = ?").run(now, errorMessage ?? null, eventIdentifier);
};

// UAT
export const getAllUATLogs = (): UATLog[] => {
  const rows = db.prepare('SELECT payload FROM uat_logs ORDER BY datetime(timestamp) DESC').all() as Array<{ payload: string }>;
  return rows.map((row) => parseRow<UATLog>(row.payload));
};

export const getUATTestCases = (): UATTestCase[] => uatTestCases;

export const addUATLog = (log: Omit<UATLog, 'id' | 'timestamp'>): UATLog => {
  const newLog: UATLog = {
    ...log,
    id: `uatlog-${uuidv4()}`,
    timestamp: formatISO(new Date()),
  };
  db.prepare('INSERT INTO uat_logs (id, timestamp, payload) VALUES (?, ?, ?)').run(newLog.id, newLog.timestamp, JSON.stringify(newLog));
  return newLog;
};

/**
 * @fileoverview This file contains the TypeScript types for the SpeedyPay/eMango Pay Payout API.
 * The contracts are based on the provided API documentation.
 */

// ==================================
// Base & Common Types
// ==================================

/** A map for custom metadata. Not part of the core SpeedyPay spec but used internally. */
type InternalMetadata = { [key: string]: string | number | null };

export type SignType = 'SHA256';
export type Currency = 'PHP'; // Default is PHP as per docs

/**
 * Defines the transaction states as per the SpeedyPay API documentation appendix.
 */
export type SpeedyPayTransactionState = 
  | '00' // transaction succeeded
  | '01' // transaction failed
  | '03' // partial refund
  | '04' // full refund
  | '05' // failed refund
  | '06' // in process
  | '07' // order to be paid
  | '08' // cancelled order
  | '09';// order expired

export const transactionStateMap: Record<SpeedyPayTransactionState, string> = {
    '00': 'Transaction Succeeded',
    '01': 'Transaction Failed',
    '03': 'Partial Refund',
    '04': 'Full Refund',
    '05': 'Failed Refund',
    '06': 'In Process',
    '07': 'Order to be Paid',
    '08': 'Cancelled Order',
    '09': 'Order Expired',
};

// ==================================
// API Request Contracts
// ==================================

interface BaseRequest {
  signType: SignType;
  sign: string;
  timestamp: string; // e.g., "20210325160000" (yyyyMMddHHmmss)
  merchSeq: string;
}

export interface PayoutRequest extends BaseRequest {
  orderSeq: string;
  orderDate: string; // e.g., "20210325" (yyyyMMdd)
  amount: string; // e.g., "100.00"
  fee?: string; // Must be "0.00" per docs
  currency: Currency;
  procId: string;
  procDetail: string; // Account/mobile number
  email: string;
  notifyUrl: string;
  mobilePhone: string;
  purposes: string;
  remark?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate?: string; // (yyyy-MM-dd)
  nationality?: string;
  street1?: string;
  street2?: string;
  barangay?: string;
  city?: string;
  province?: string;
  country?: string; // 2-letter country code
}

export interface QueryOrderRequest extends BaseRequest {
  orderSeq: string;
}

export interface QueryBalanceRequest extends BaseRequest {
  // No extra fields besides base
}

// ==================================
// API Response Contracts
// ==================================

interface BaseResponse {
  respCode: string; // "00000000" for success
  respMessage: string;
  signType: SignType;
  sign: string;
  timestamp: string;
  merchSeq: string;
}

export interface PayoutResponse extends BaseResponse {
  orderSeq: string;
  transSeq: string;
  amount: string;
  currency: Currency;
  transState: SpeedyPayTransactionState;
}

export interface QueryOrderResponse extends BaseResponse {
  orderSeq: string;
  transSeq: string;
  amount: string;
  fee: string;
  currency: Currency;
  transState: SpeedyPayTransactionState;
  busiType: string;
  createTime: string; // yyyy-MM-dd HH:mm:ss
  notifyTime: string; // yyyy-MM-dd HH:mm:ss
}

export interface QueryBalanceResponse extends BaseResponse {
  amount: string; // e.g., "10000.00"
}

// ==================================
// Webhook Event Contracts (Assuming structure based on other APIs, as not detailed in Payout docs)
// ==================================

/**
 * This is an assumed structure for webhooks. The provided docs do not detail the webhook payload.
 * This structure should be verified and updated when real webhook documentation is available.
 */
export interface SpeedyPayWebhookPayload {
  signType: SignType;
  sign: string;
  timestamp: string; // e.g., "20210325160000"
  merchSeq: string;
  orderSeq: string;
  transSeq: string;
  amount: string;
  currency: Currency;
  transState: SpeedyPayTransactionState;
  respCode: string;
  respMessage: string;
  notifyTime: string; // yyyy-MM-dd HH:mm:ss
}

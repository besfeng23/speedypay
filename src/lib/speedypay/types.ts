/**
 * This file contains the TypeScript types for the SpeedyPay/eMangoPay API.
 * These are based on the provided API documentation.
 */

// --- Base API Contracts ---

export interface BaseRequest {
    merchSeq: string;
    signType: 'SHA256';
    timestamp: string;
    sign: string;
}

export interface SpeedyPayResponse {
    respCode: string; // e.g., "00000000" for success
    respMessage: string;
    merchSeq: string;
    orderSeq: string;
    transSeq: string;
    amount: number;
    currency: string;
    transState: '00' | '01' | '03' | '04' | '05' | '06' | '07' | '08' | '09'; // From appendix
    signType: 'SHA256';
    sign: string;
    timestamp: string;
}

export interface QryBalanceResponse {
    respCode: string;
    respMessage: string;
    merchSeq: string;
    amount: number;
    signType: 'SHA256';
    sign: string;
    timestamp: string;
}

// --- Payout (Cash Out) API ---

export interface CashOutRequest extends BaseRequest {
    orderSeq: string;
    orderDate: string; // YYYY-MM-DD
    amount: number;
    fee: string; // Reserved, use "0.00"
    currency: 'PHP';
    procId: string; // From payout channel list
    procDetail: string; // Account number or mobile number
    email: string;
    notifyUrl: string;
    mobilePhone: string;
    purposes?: string;
    remark?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    birthDate?: string; // YYYY-MM-DD
    nationality?: string; // ISO 3166-1 alpha-2
    street1?: string;
    street2?: string;
    barangay?: string;
    city?: string;
    province?: string;
    country?: string; // ISO 3166-1 alpha-2
}

// --- Transaction Query API ---

export interface QryOrderRequest extends Omit<BaseRequest, 'sign'> {
    orderSeq: string;
}

export interface QryOrderResponse extends SpeedyPayResponse {
    busiType: string;
    createTime: string; // YYYY-MM-DD HH:mm:ss
    notifyTime: string; // YYYY-MM-DD HH:mm:ss
}

// --- Merchant Balance Query API ---

export interface QryBalanceRequest extends Omit<BaseRequest, 'sign'> {
    // No extra params needed
}

// --- Collection (Cashier) API ---

export interface QrPayRequest extends Omit<BaseRequest, 'sign'> {
    orderSeq: string;
    orderDate: string; // YYYY-MM-DD
    amount: number;
    fee: '0.00';
    currency: 'PHP';
    busiName: string;
    dueTime: number; // Expiration time in minutes
    busiType: '1';
    notifyUrl: string;
    isRedirect?: 'true' | 'false';
    redirectUrl?: string;
    additionInfo?: string;
    remark?: string;
}

export interface QrPayResponse {
    respCode: string;
    respMessage: string;
    merchSeq: string;
    signType: 'SHA256';
    timestamp: string;
    sign: string;
    url?: string;
    qrCode?: string;
}


// --- Webhook ---

/**
 * This represents the payload received from SpeedyPay's webhook.
 * Based on the documentation, it seems the webhook sends a form-urlencoded
 * payload that mirrors the `qryOrder` response shape.
 */
export type SpeedyPayWebhookPayload = SpeedyPayResponse;

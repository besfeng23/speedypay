// TODO: Finalize these contracts based on the actual SpeedyPay API documentation.

/**
 * Standardized error response from the SpeedyPay API.
 */
export interface SpeedyPayErrorResponse {
  error: {
    type: 'invalid_request_error' | 'api_error' | 'authentication_error' | 'rate_limit_error';
    code: string;
    message: string;
    doc_url?: string;
  };
}

// ==================================
// API Request/Response Contracts
// ==================================

/** A map for custom metadata. */
type Metadata = { [key: string]: string | number | null };

export interface CreatePaymentIntentRequest {
  amount: number; // in cents
  currency: string;
  merchant_id: string;
  metadata: Metadata & {
    internal_payment_id: string;
    internal_merchant_id: string;
  };
}

export interface CreatePaymentIntentResponse {
  id: string; // The SpeedyPay payment intent ID (e.g., 'pi_...')
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded';
  client_secret: string;
}

export interface PaymentStatusResponse extends PaymentObject {}

export interface CreateSettlementInstructionRequest {
  payment_id: string;
  net_amount: number;
  currency: string;
  idempotency_key: string;
  metadata: Metadata & {
      internal_settlement_id: string;
      internal_merchant_id: string;
  }
}

export interface CreateSettlementInstructionResponse {
    id: string; // The SpeedyPay settlement ID (e.g., 'set_...')
    payment_id: string;
    status: 'processing' | 'completed' | 'failed';
    net_amount: number;
    currency: string;
}

export interface RemittanceRequest {
    settlement_id: string;
    amount: number;
    currency: string;
    destination_account_id: string;
    idempotency_key: string;
}

export interface RemittanceResponse {
    id: string; // The SpeedyPay remittance ID (e.g., 'remit_...')
    settlement_id: string;
    status: 'pending' | 'sent' | 'failed' | 'canceled';
    amount: number;
    destination: string;
}

// ==================================
// Webhook Event Contracts
// ==================================

export type SpeedyPayWebhookEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'settlement.created'
  | 'settlement.completed'
  | 'settlement.failed'
  | 'remittance.sent'
  | 'remittance.failed';

export interface SpeedyPayWebhookEvent {
  id: string; // The unique ID for the event (e.g., 'evt_...')
  api_version: string;
  type: SpeedyPayWebhookEventType;
  created: string; // ISO 8601 timestamp
  data: {
    object: PaymentObject | SettlementObject | RemittanceObject;
  };
}

// --- Webhook Data Objects ---

export interface PaymentObject {
  object: 'payment';
  id: string; // The SpeedyPay payment ID
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed';
  failure_reason?: string;
  created: string;
  metadata: Metadata & {
    internal_payment_id: string; // Critical for linking back to our system
  };
}

export interface SettlementObject {
    object: 'settlement';
    id: string; // The SpeedyPay settlement ID
    payment_id: string;
    status: 'processing' | 'completed' | 'failed';
    net_amount: number;
    failure_reason?: string;
    metadata: Metadata & {
        internal_settlement_id: string; // Critical for linking
    };
}

export interface RemittanceObject {
    object: 'remittance';
    id: string; // The SpeedyPay remittance ID
    settlement_id: string; // The parent settlement ID
    status: 'sent' | 'failed';
    amount: number;
    failure_reason?: string;
    destination: string;
}

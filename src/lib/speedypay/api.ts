import 'server-only';
import { speedypayConfig } from './config';
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  PaymentStatusResponse,
  CreateSettlementInstructionRequest,
  CreateSettlementInstructionResponse,
  RemittanceRequest,
  RemittanceResponse,
  SpeedyPayErrorResponse,
} from './types';
import crypto from 'crypto';

/**
 * A service adapter for interacting with the SpeedyPay API.
 * Contains placeholder methods for key operations.
 * TODO: Implement actual API calls using fetch() and handle responses/errors.
 */

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${speedypayConfig.apiSecret}`,
  'X-Api-Key': speedypayConfig.apiKey || '',
});

/**
 * Creates a payment intent with SpeedyPay.
 * @param request - The payment intent creation request payload.
 * @returns The response from SpeedyPay.
 */
export async function createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
  console.log('[SpeedyPay API] Initiating createPaymentIntent:', request);
  // TODO: Implement fetch() call to POST /payment_intents
  // const response = await fetch(`${speedypayConfig.apiBaseUrl}/payment_intents`, {
  //   method: 'POST',
  //   headers: getHeaders(),
  //   body: JSON.stringify(request),
  // });
  // if (!response.ok) { ... handle error ... }
  // return await response.json();
  
  // Placeholder response
  return {
    id: `pi_${crypto.randomBytes(12).toString('hex')}`,
    amount: request.amount,
    currency: request.currency,
    status: 'requires_payment_method',
    client_secret: `pi_${crypto.randomBytes(12).toString('hex')}_secret_${crypto.randomBytes(24).toString('hex')}`,
  };
}

/**
 * Retrieves the status of a payment from SpeedyPay.
 * @param paymentId - The ID of the payment to look up.
 * @returns The current status information for the payment.
 */
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  console.log(`[SpeedyPay API] Getting status for payment: ${paymentId}`);
  // TODO: Implement fetch() call to GET /payments/{paymentId}
  
  // Placeholder response
  return {
    id: paymentId,
    amount: 10000,
    currency: 'usd',
    status: 'succeeded',
    created: new Date().toISOString(),
    metadata: {},
  };
}

/**
 * Creates a settlement instruction with SpeedyPay.
 * @param request - The settlement instruction creation request.
 * @returns The response from SpeedyPay.
 */
export async function createSettlementInstruction(request: CreateSettlementInstructionRequest): Promise<CreateSettlementInstructionResponse> {
  console.log('[SpeedyPay API] Creating settlement instruction:', request);
  // TODO: Implement fetch() call to POST /settlements
  // This is an idempotent operation, use the idempotency_key.

  // Placeholder response
  return {
    id: `set_${crypto.randomBytes(12).toString('hex')}`,
    payment_id: request.payment_id,
    status: 'processing',
    net_amount: request.net_amount,
    currency: request.currency,
  };
}

/**
 * Initiates a remittance (payout) to a merchant.
 * @param request - The remittance request details.
 * @returns The response from SpeedyPay.
 */
export async function remitToMerchant(request: RemittanceRequest): Promise<RemittanceResponse> {
  console.log('[SpeedyPay API] Initiating remittance:', request);
  // TODO: Implement fetch() call to POST /remittances
  // This is an idempotent operation, use the idempotency_key.

  // Placeholder response
  return {
    id: `remit_${crypto.randomBytes(12).toString('hex')}`,
    settlement_id: request.settlement_id,
    status: 'sent',
    amount: request.amount,
    destination: request.destination_account_id,
  };
}

/**
 * Verifies the signature of an incoming webhook payload.
 * @param payload - The raw string body of the webhook request.
 * @param signature - The value of the 'speedypay-signature' header.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  console.log('[SpeedyPay Webhook] Verifying webhook signature.');
  if (!speedypayConfig.webhookSecret) {
    console.error('[SpeedyPay Webhook] Webhook secret is not configured. Cannot verify signature.');
    return false;
  }
  
  // TODO: Implement the actual signature verification logic based on SpeedyPay docs.
  // This typically involves creating an HMAC SHA256 hash of the payload with the secret.
  const expectedSignature = crypto
    .createHmac('sha256', speedypayConfig.webhookSecret)
    .update(payload)
    .digest('hex');

  // Placeholder logic: for demo purposes, we'll just check for a simple match.
  // In a real scenario, you must perform a constant-time comparison to prevent timing attacks.
  // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  console.log(`[SpeedyPay Webhook] Received signature: ${signature.substring(0,10)}...`);
  // For this placeholder, we'll just return true if a secret is present.
  // In a real app, this MUST be a real verification.
  return true;
}

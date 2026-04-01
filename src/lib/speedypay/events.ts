import 'server-only';
import type { SpeedyPayWebhookEvent, PaymentObject, SettlementObject, RemittanceObject } from './types';
import { addAuditLog, updatePaymentStatus, updateSettlementAndRemittanceStatus } from '@/lib/data';

/**
 * Handles the logic for processing a verified webhook event from SpeedyPay.
 * This function acts as a dispatcher, routing the event to the appropriate handler based on its type.
 * @param event - The verified SpeedyPayWebhookEvent object.
 */
export async function processWebhookEvent(event: SpeedyPayWebhookEvent): Promise<void> {
  console.log(`[SpeedyPay Event Processor] Processing event type: ${event.type}`);

  switch (event.type) {
    // --- Payment Events ---
    case 'payment.succeeded':
      await handlePaymentSucceeded(event.data.object as PaymentObject);
      break;
    case 'payment.failed':
      await handlePaymentFailed(event.data.object as PaymentObject);
      break;

    // --- Settlement Events ---
    case 'settlement.created':
      // Usually informational, status is 'processing'.
      break;
    case 'settlement.completed':
      await handleSettlementCompleted(event.data.object as SettlementObject);
      break;
    case 'settlement.failed':
       await handleSettlementFailed(event.data.object as SettlementObject);
      break;

    // --- Remittance Events ---
    case 'remittance.sent':
       await handleRemittanceSent(event.data.object as RemittanceObject);
      break;
    case 'remittance.failed':
       await handleRemittanceFailed(event.data.object as RemittanceObject);
      break;
    
    default:
      console.warn(`[SpeedyPay Event Processor] Unhandled event type: ${event.type}`);
      await addAuditLog({
        eventType: 'webhook.unhandled',
        user: 'SpeedyPay Webhook',
        details: `Received an unhandled event type: ${event.type}`,
        entityId: event.data.object.id
      });
  }
}

// --- Specific Event Handlers ---

async function handlePaymentSucceeded(payment: PaymentObject) {
    // A payment succeeded. Now it is ready for settlement.
    await updatePaymentStatus(payment.metadata.internal_payment_id, 'succeeded', 'pending');
    await addAuditLog({
        eventType: 'payment.status.succeeded',
        user: 'SpeedyPay Webhook',
        details: 'Payment confirmed as successful by provider.',
        entityId: payment.metadata.internal_payment_id,
    });
    // TODO: Trigger the creation of a settlement instruction via `createSettlementInstruction`.
}

async function handlePaymentFailed(payment: PaymentObject) {
    // A payment failed. No further action is needed.
    await updatePaymentStatus(payment.metadata.internal_payment_id, 'failed', 'N/A');
    await addAuditLog({
        eventType: 'payment.status.failed',
        user: 'SpeedyPay Webhook',
        details: `Payment failed. Reason: ${payment.failure_reason || 'Unknown'}`,
        entityId: payment.metadata.internal_payment_id,
    });
}

async function handleSettlementCompleted(settlement: SettlementObject) {
    // The funds have been successfully allocated and are ready for remittance.
    // This doesn't mean the money is in the merchant's bank account yet.
    await updateSettlementAndRemittanceStatus(settlement.metadata.internal_settlement_id, 'completed', 'pending');
    await addAuditLog({
        eventType: 'settlement.status.completed',
        user: 'SpeedyPay Webhook',
        details: 'Settlement confirmed as completed by provider. Awaiting remittance.',
        entityId: settlement.metadata.internal_settlement_id,
    });
    // TODO: Trigger the remittance to the merchant via `remitToMerchant`.
}

async function handleSettlementFailed(settlement: SettlementObject) {
    // The settlement process failed.
    await updateSettlementAndRemittanceStatus(settlement.metadata.internal_settlement_id, 'failed', 'N/A', settlement.failure_reason);
    await addAuditLog({
        eventType: 'settlement.status.failed',
        user: 'SpeedyPay Webhook',
        details: `Settlement failed. Reason: ${settlement.failure_reason || 'Unknown'}`,
        entityId: settlement.metadata.internal_settlement_id,
    });
}

async function handleRemittanceSent(remittance: RemittanceObject) {
    // The final payout has been sent to the merchant's account.
    await updateSettlementAndRemittanceStatus(remittance.settlement_id, 'completed', 'sent');
    await addAuditLog({
        eventType: 'remittance.status.sent',
        user: 'SpeedyPay Webhook',
        details: 'Remittance to merchant has been successfully sent by the provider.',
        entityId: remittance.settlement_id, // Link back to the settlement
    });
}

async function handleRemittanceFailed(remittance: RemittanceObject) {
    // The final payout to the merchant failed. This requires manual intervention.
    await updateSettlementAndRemittanceStatus(remittance.settlement_id, 'completed', 'failed', remittance.failure_reason);
     await addAuditLog({
        eventType: 'remittance.status.failed',
        user: 'SpeedyPay Webhook',
        details: `Remittance to merchant failed. Reason: ${remittance.failure_reason || 'Unknown'}`,
        entityId: remittance.settlement_id,
    });
}

import type { SpeedyPayPayoutWebhookPayload, SpeedyPayCollectionWebhookPayload } from './types';
import { 
    addAuditLog, 
    getSettlementById, 
    updateSettlement, 
    getPaymentById, 
    updatePayment, 
    addSettlement, 
    getSettlementByPaymentId,
    findPayoutById,
    updatePayout,
} from '@/lib/data';
import { mapProviderStateToInternal, providerStateLabels, mapCollectionStateToPaymentStatus } from './mappers';
import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Settlement, Payment, Payout, InternalSettlementStatus } from '@/lib/types';


/**
 * Handles the logic for processing a verified PAYOUT webhook event from SpeedyPay.
 * This is triggered by a POST to `/api/webhooks/speedypay`.
 * @param payload - The verified SpeedyPayPayoutWebhookPayload object from the form-urlencoded body.
 */
export async function processPayoutWebhook(payload: SpeedyPayPayoutWebhookPayload): Promise<void> {
  // The orderSeq from the provider maps to our internal Payout ID.
  const payoutId = payload.orderSeq;
  console.log(`[SpeedyPay Event Processor] Processing PAYOUT webhook for Payout ID: ${payoutId}`);
  
  const payout = await findPayoutById(payoutId);

  if (!payout) {
    const errorMsg = `Webhook received for unknown Payout ID (orderSeq): ${payoutId}`;
    await addAuditLog({
        eventType: 'webhook.processing.failed',
        user: 'SpeedyPay Webhook',
        details: errorMsg,
        entityId: payoutId,
        entityType: 'payout'
    });
    throw new Error(errorMsg);
  }

  const internalPayoutStatus = mapProviderStateToInternal(payload.transState);

  const updatedPayout: Partial<Payout> = {
      status: internalPayoutStatus,
      providerTransSeq: payload.transSeq,
      providerRespCode: payload.respCode,
      providerRespMessage: payload.respMessage,
      providerTransState: payload.transState,
      providerTransStateLabel: providerStateLabels[payload.transState] || 'Unknown',
      signatureVerified: true, // Already verified in the API route
      providerTimestamp: payload.timestamp,
      failureReason: payload.transState !== '00' ? payload.respMessage : null,
      updatedAt: formatISO(new Date()),
  };
  
  await updatePayout(payoutId, updatedPayout);

  // Update the parent settlement's status based on the payout outcome
  const settlementStatus: InternalSettlementStatus = internalPayoutStatus === 'sent' ? 'paid' : internalPayoutStatus === 'failed' ? 'failed' : 'processing';
  await updateSettlement(payout.settlementId, { status: settlementStatus });

  await addAuditLog({
    eventType: 'payout.status.updated',
    user: 'SpeedyPay Webhook',
    details: `Payout status updated to ${internalPayoutStatus} via webhook. Provider state: ${payload.transState} (${payload.respMessage})`,
    entityId: payout.id,
    entityType: 'payout'
  });
   await addAuditLog({
    eventType: 'settlement.status.updated',
    user: 'System',
    details: `Settlement status updated to ${settlementStatus} based on payout outcome.`,
    entityId: payout.settlementId,
    entityType: 'settlement'
  });
}


/**
 * Handles the logic for processing a verified COLLECTION webhook event from SpeedyPay.
 * @param payload - The verified SpeedyPayCollectionWebhookPayload object.
 */
export async function processCollectionWebhookEvent(payload: SpeedyPayCollectionWebhookPayload): Promise<void> {
  console.log(`[SpeedyPay Event Processor] Processing COLLECTION webhook for orderSeq: ${payload.orderSeq}`);

  const paymentId = payload.orderSeq;
  const payment = await getPaymentById(paymentId);
  
  if (!payment) {
      const errorMsg = `Webhook received for unknown payment ID (orderSeq): ${paymentId}`;
      await addAuditLog({
        eventType: 'webhook.processing.failed',
        user: 'SpeedyPay Webhook',
        details: errorMsg,
        entityId: paymentId,
        entityType: 'payment'
      });
      throw new Error(errorMsg);
  }
  
  const internalPaymentStatus = mapCollectionStateToPaymentStatus(payload.transState);
  
  const updatedPayment: Partial<Payment> = {
      paymentStatus: internalPaymentStatus,
      providerTransSeq: payload.transSeq,
      providerCollectionRespCode: payload.respCode,
      providerCollectionRespMessage: payload.respMessage,
      providerTransState: payload.transState,
      providerStateLabel: providerStateLabels[payload.transState] || 'Unknown',
      providerCollectionSignatureVerified: true, // Already verified in API route
      providerNotifyTime: payload.notifyTime,
      providerCreateTime: payload.createTime,
  };

  // If payment succeeded, this is the trigger to create the internal settlement record
  if (internalPaymentStatus === 'succeeded' && payment.settlementStatus === 'pending') {
      const existingSettlement = await getSettlementByPaymentId(paymentId);
      if (!existingSettlement) {
          const newSettlement: Omit<Settlement, 'payout'> = {
              id: `set-${uuidv4().slice(0, 8)}`,
              tenantId: payment.tenantId,
              paymentId: payment.id,
              merchantId: payment.merchantId,
              status: 'unpaid', // Ready to be paid out
              grossAmount: payment.grossAmount,
              currency: payment.currency,
              platformFeeAmount: payment.platformFeeAmount,
              merchantNetAmount: payment.merchantNetAmount,
              payoutId: null,
              createdAt: formatISO(new Date()),
              updatedAt: formatISO(new Date()),
          };
          await addSettlement(newSettlement);
          updatedPayment.settlementStatus = 'completed'; // Update the payment's view of settlement
          await addAuditLog({
              eventType: 'settlement.created',
              user: 'System',
              details: `Internal settlement created from successful payment. Status: unpaid.`,
              entityId: newSettlement.id,
              entityType: 'settlement'
          });
      } else {
        // If settlement already exists, just make sure the payment's view of it is correct.
        updatedPayment.settlementStatus = 'completed';
      }
  }
  
  await updatePayment(paymentId, updatedPayment);

   await addAuditLog({
    eventType: 'collection.status.updated',
    user: 'SpeedyPay Webhook',
    details: `Collection status updated via webhook. New provider state: ${payload.transState} (${payload.respMessage})`,
    entityId: payment.id,
    entityType: 'payment'
  });
}

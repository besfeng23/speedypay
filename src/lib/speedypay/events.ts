
import type { SpeedyPayPayoutWebhookPayload, SpeedyPayCollectionWebhookPayload } from './types';
import { addAuditLog, getSettlementById, updateSettlement, getPaymentById, updatePayment, addSettlement, getSettlementByPaymentId } from '@/lib/data';
import { mapProviderStateToInternal, providerStateLabels, mapCollectionStateToPaymentStatus } from './mappers';
import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Settlement, Payment } from '@/lib/types';


/**
 * Handles the logic for processing a verified PAYOUT webhook event from SpeedyPay.
 * This is triggered by a POST to `/api/webhooks/speedypay`.
 * @param payload - The verified SpeedyPayPayoutWebhookPayload object from the form-urlencoded body.
 */
export async function processPayoutWebhookEvent(payload: SpeedyPayPayoutWebhookPayload): Promise<void> {
  console.log(`[SpeedyPay Event Processor] Processing PAYOUT webhook for orderSeq: ${payload.orderSeq}`);

  // The orderSeq from the provider maps to our internal settlement ID.
  const settlementId = payload.orderSeq;
  const settlement = await getSettlementById(settlementId);

  if (!settlement) {
    // This could happen if the webhook arrives before our DB is updated,
    // or if the orderSeq is not one of ours. Log it and throw an error.
    const errorMsg = `Webhook received for unknown settlement ID (orderSeq): ${settlementId}`;
    await addAuditLog({
        eventType: 'webhook.processing.failed',
        user: 'SpeedyPay Webhook',
        details: errorMsg,
        entityId: settlementId,
        entityType: 'settlement'
    });
    throw new Error(errorMsg);
  }

  const internalRemittanceStatus = mapProviderStateToInternal(payload.transState);

  const updatedSettlement: Partial<Settlement> = {
      remittanceStatus: internalRemittanceStatus,
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
  
  await updateSettlement(settlementId, updatedSettlement);

  await addAuditLog({
    eventType: 'payout.status.updated',
    user: 'SpeedyPay Webhook',
    details: `Payout status updated via webhook. New provider state: ${payload.transState} (${payload.respMessage})`,
    entityId: settlement.id,
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
          const newSettlement: Settlement = {
              id: `set-${uuidv4().slice(0, 8)}`,
              paymentId: payment.id,
              merchantId: payment.merchantId,
              grossAmount: payment.grossAmount,
              currency: payment.currency,
              platformFeeAmount: payment.platformFeeAmount,
              merchantNetAmount: payment.merchantNetAmount,
              settlementStatus: 'completed', // Settlement is now ready for payout
              remittanceStatus: 'pending',
              payoutReference: null,
              failureReason: null,
              createdAt: formatISO(new Date()),
              updatedAt: formatISO(new Date()),
          };
          await addSettlement(newSettlement);
          updatedPayment.settlementStatus = 'completed'; // Update the payment's view of settlement
          await addAuditLog({
              eventType: 'settlement.created',
              user: 'System',
              details: `Internal settlement created from successful payment.`,
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

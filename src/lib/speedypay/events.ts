import type { SpeedyPayWebhookPayload } from './types';
import { addAuditLog, getSettlementById, updateSettlement } from '@/lib/data';
import { mapProviderStateToInternal, providerStateLabels } from './mappers';
import { formatISO } from 'date-fns';

/**
 * Handles the logic for processing a verified webhook event from SpeedyPay.
 * This is triggered by a POST to `/api/webhooks/speedypay`.
 * @param payload - The verified SpeedyPayWebhookPayload object from the form-urlencoded body.
 */
export async function processWebhookEvent(payload: SpeedyPayWebhookPayload): Promise<void> {
  console.log(`[SpeedyPay Event Processor] Processing webhook for orderSeq: ${payload.orderSeq}`);

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

  const updatedSettlement = {
      ...settlement,
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

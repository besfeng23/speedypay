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
    addPaymentAllocations,
    addLedgerTransactionAndEntries,
    withTransaction,
} from '@/lib/data';
import { mapProviderStateToInternal, providerStateLabels, mapCollectionStateToPaymentStatus } from './mappers';
import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Settlement, Payment, Payout, InternalSettlementStatus, LedgerTransaction } from '@/lib/types';
import { calculateAllocations } from '../allocation';
import { createLedgerEntriesForPaymentCapture } from '../ledger';


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

  await withTransaction(async (client) => {
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
    
    await updatePayout(payoutId, updatedPayout, client);

    // Update the parent settlement's status based on the payout outcome
    const settlementStatus: InternalSettlementStatus = internalPayoutStatus === 'sent' ? 'paid' : internalPayoutStatus === 'failed' ? 'failed' : 'processing';
    await updateSettlement(payout.settlementId, { status: settlementStatus, updatedAt: formatISO(new Date()) }, client);
  });


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
 * This is where the core financial event recognition happens.
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
  
  // If payment was already successful, do nothing.
  if (payment.paymentStatus === 'succeeded') {
    await addAuditLog({
      eventType: 'webhook.duplicate.ignored',
      user: 'SpeedyPay Webhook',
      details: `Ignoring webhook for already-succeeded payment ${paymentId}.`,
      entityId: paymentId,
      entityType: 'payment',
    });
    return;
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
      updatedAt: formatISO(new Date()),
  };

  // --- CRITICAL: Financial Event Recognition ---
  // If payment succeeded, this is the trigger to create the financial records.
  if (internalPaymentStatus === 'succeeded' && payment.settlementStatus === 'pending') {
      const existingSettlement = await getSettlementByPaymentId(paymentId);
      if (existingSettlement) {
          console.warn(`Webhook for ${paymentId} received, but settlement ${existingSettlement.id} already exists.`);
          await updatePayment(paymentId, updatedPayment);
          return;
      }
      
      const merchant = await (await import('../data')).getMerchantById(payment.merchantId);
      if (!merchant) {
          throw new Error(`Merchant ${payment.merchantId} not found for successful payment ${payment.id}.`);
      }
      
      await withTransaction(async (client) => {
        // 1. Calculate final allocations
        const allocations = await calculateAllocations({
            grossAmount: payment.grossAmount,
            currency: payment.currency,
            merchantAccountId: merchant.id,
            tenantId: merchant.tenantId,
        });

        // 2. Create balanced ledger entries from allocations
        const ledgerEntries = await createLedgerEntriesForPaymentCapture(payment, allocations);
        const ledgerTransaction: Omit<LedgerTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
            paymentId: payment.id,
            payoutId: null,
            transactionType: 'payment_capture',
            status: 'completed',
            reference: `Payment from ${payment.customerName}`,
        };

        // 3. Create the internal settlement (payable) record
        const now = new Date();
        const merchantNet = allocations.find(a => a.allocationType === 'merchant_net');
        const totalFees = allocations.filter(a => a.allocationType !== 'merchant_net').reduce((sum, a) => sum + a.amount, 0);

        const newSettlement: Omit<Settlement, 'payout'> = {
            id: `set-${uuidv4().slice(0, 8)}`,
            tenantId: payment.tenantId,
            paymentId: payment.id,
            merchantId: payment.merchantId,
            status: 'unpaid', // Ready to be paid out
            grossAmount: payment.grossAmount,
            currency: payment.currency,
            platformFeeAmount: totalFees,
            merchantNetAmount: merchantNet?.amount ?? 0,
            payoutId: null,
            // New settlement fields
            settlementMode: merchant.settlementMode,
            settlementSchedule: merchant.settlementSchedule,
            providerSettlementReference: null,
            eligibilityAt: formatISO(now),
            remittedAt: null,
            failedAt: null,
            reversalReference: null,
            failureReason: null,
            createdAt: formatISO(now),
            updatedAt: formatISO(now),
        };
        
        updatedPayment.settlementStatus = 'completed';
        updatedPayment.platformFeeAmount = totalFees;
        updatedPayment.merchantNetAmount = merchantNet?.amount ?? 0;
        
        // 4. Atomically write all records
        await addPaymentAllocations(allocations.map(alloc => ({ ...alloc, paymentId: paymentId })), client);
        await addLedgerTransactionAndEntries(ledgerTransaction, ledgerEntries, client);
        await addSettlement(newSettlement, client);
        await updatePayment(paymentId, updatedPayment, client);

        await addAuditLog({
            eventType: 'payment.capture.success',
            user: 'System',
            details: 'Payment capture successful. Created allocations, ledger entries, and settlement payable.',
            entityId: payment.id,
            entityType: 'payment',
        });
        await addAuditLog({
            eventType: 'settlement.created',
            user: 'System',
            details: `Internal settlement created from successful payment. Status: unpaid.`,
            entityId: newSettlement.id,
            entityType: 'settlement'
        });
      });

  } else {
    // If not a success event, just update the payment status
    await updatePayment(paymentId, updatedPayment);
  }

   await addAuditLog({
    eventType: 'collection.status.updated',
    user: 'SpeedyPay Webhook',
    details: `Collection status updated via webhook. New provider state: ${payload.transState} (${payload.respMessage})`,
    entityId: payment.id,
    entityType: 'payment'
  });
}

    
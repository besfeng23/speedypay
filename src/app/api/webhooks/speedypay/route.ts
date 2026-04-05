import { NextResponse } from 'next/server';
import { verifySignature } from '@/lib/speedypay/crypto';
import { processPayoutWebhookEvent, processCollectionWebhookEvent } from '@/lib/speedypay/events';
import type { SpeedyPayPayoutWebhookPayload, SpeedyPayCollectionWebhookPayload } from '@/lib/speedypay/types';
import { addAuditLog, getPaymentById, getSettlementById, findAuditLogByEventIdentifier } from '@/lib/data';
import { speedypayConfig } from '@/lib/speedypay/config';


/**
 * API route to handle incoming webhooks from SpeedyPay for BOTH payouts and collections.
 * It verifies the signature, ensures idempotency, and then delegates to the appropriate processor.
 */
export async function POST(req: Request) {
  let payload: Record<string, any>;
  let rawBody: string;

  try {
    rawBody = await req.text();
    // SpeedyPay sends webhooks as form-urlencoded, not JSON
    const params = new URLSearchParams(rawBody);
    payload = Object.fromEntries(params.entries());
  } catch (err) {
    return new NextResponse('Invalid webhook body', { status: 400 });
  }
  
  const signature = payload.sign as string;
  const orderSeq = payload.orderSeq as string;
  const transSeq = payload.transSeq as string;

  // 1. Basic validation
  if (!orderSeq || !transSeq) {
    return new NextResponse('Missing orderSeq or transSeq', { status: 400 });
  }

  // A unique identifier for this specific event delivery, used for idempotency.
  const eventIdentifier = `webhook-${orderSeq}-${transSeq}`;

  // 2. Verify webhook signature
  if (!signature || !verifySignature(payload, speedypayConfig.secretKey!)) {
    await addAuditLog({
      eventType: 'webhook.security.failure',
      user: 'SpeedyPay Webhook',
      details: 'Webhook signature verification failed. Signature was missing or invalid.',
      entityId: orderSeq,
      entityType: null,
      eventIdentifier,
    });
    // According to docs, return "failed" to signal an issue to the provider.
    return new NextResponse('failed', { status: 400 });
  }

  // 3. Durable Idempotency Check: Check if we have already successfully processed this exact event delivery.
  try {
      const existingEvent = await findAuditLogByEventIdentifier(eventIdentifier);
      if (existingEvent) {
          // This is a duplicate of an already processed event. Acknowledge it but do not re-process.
          await addAuditLog({
            eventType: 'webhook.duplicate.received',
            user: 'SpeedyPay Webhook',
            details: `Duplicate event received and ignored: ${eventIdentifier}. Original log ID: ${existingEvent.id}`,
            entityId: orderSeq,
            entityType: null,
          });
          // Return "success" to acknowledge receipt and prevent the provider from resending.
          return new NextResponse('success');
      }
  } catch (dbError) {
      // If the check itself fails, we can't safely proceed.
      const errorMessage = dbError instanceof Error ? dbError.message : 'Database error during idempotency check.';
      console.error(`[SpeedyPay Webhook Idempotency Error] for ${eventIdentifier}:`, errorMessage);
       await addAuditLog({
            eventType: 'webhook.idempotency.failed',
            user: 'System',
            details: `Failed to check for duplicate webhooks. Error: ${errorMessage}`,
            entityId: orderSeq,
            entityType: null,
        });
      return new NextResponse('failed', { status: 500 });
  }
  
  // 4. Determine if this is for a Payout or a Collection by checking our internal records.
  // Payout `orderSeq` corresponds to our internal `Settlement` ID.
  const settlement = await getSettlementById(orderSeq);
  if (settlement) {
    return handlePayoutWebhook(payload as SpeedyPayPayoutWebhookPayload, eventIdentifier);
  }

  // Collection `orderSeq` corresponds to our internal `Payment` ID.
  const payment = await getPaymentById(orderSeq);
  if (payment) {
    return handleCollectionWebhook(payload as SpeedyPayCollectionWebhookPayload, eventIdentifier);
  }

  // 5. If neither is found, it's an unknown webhook.
  await addAuditLog({
    eventType: 'webhook.unknown.received',
    user: 'SpeedyPay Webhook',
    details: `Webhook received for an unknown orderSeq that is not a settlement or payment: ${orderSeq}`,
    entityId: orderSeq,
    entityType: null,
    eventIdentifier,
  });
  return new NextResponse('failed', { status: 404 });
}

async function handlePayoutWebhook(payload: SpeedyPayPayoutWebhookPayload, eventIdentifier: string) {
  // Log that we received it, but do NOT include the idempotency key yet.
  await addAuditLog({
    eventType: 'webhook.received',
    user: 'SpeedyPay Webhook',
    details: `Received PAYOUT webhook for OrderSeq ${payload.orderSeq} with state ${payload.transState}`,
    entityId: payload.orderSeq,
    entityType: 'settlement',
  });

  try {
    await processPayoutWebhookEvent(payload);

    // CRITICAL: The idempotency key is only logged AFTER successful processing.
    await addAuditLog({
      eventType: 'webhook.processed',
      user: 'SpeedyPay Webhook',
      details: `Successfully processed PAYOUT webhook for OrderSeq: ${payload.orderSeq}`,
      entityId: payload.orderSeq,
      entityType: 'settlement',
      eventIdentifier, // The idempotency key is now stored.
    });
    return new NextResponse('success');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[SpeedyPay Payout Webhook Error] Failed to process event for ${payload.orderSeq}:`, errorMessage);
    await addAuditLog({
      eventType: 'webhook.processing.failed',
      user: 'SpeedyPay Webhook',
      details: `Failed to process PAYOUT webhook. Error: ${errorMessage}`,
      entityId: payload.orderSeq,
      entityType: 'settlement',
    });
    // Return 'failed' so the provider will retry. The idempotency key was not logged, so the retry will be processed.
    return new NextResponse('failed', { status: 500 });
  }
}

async function handleCollectionWebhook(payload: SpeedyPayCollectionWebhookPayload, eventIdentifier: string) {
   // Log that we received it, but do NOT include the idempotency key yet.
   await addAuditLog({
    eventType: 'webhook.received',
    user: 'SpeedyPay Webhook',
    details: `Received COLLECTION webhook for OrderSeq ${payload.orderSeq} with state ${payload.transState}`,
    entityId: payload.orderSeq,
    entityType: 'payment',
  });

  try {
    await processCollectionWebhookEvent(payload);
    
    // CRITICAL: The idempotency key is only logged AFTER successful processing.
    await addAuditLog({
      eventType: 'webhook.processed',
      user: 'SpeedyPay Webhook',
      details: `Successfully processed COLLECTION webhook for OrderSeq: ${payload.orderSeq}`,
      entityId: payload.orderSeq,
      entityType: 'payment',
      eventIdentifier, // The idempotency key is now stored.
    });
    return new NextResponse('success');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[SpeedyPay Collection Webhook Error] Failed to process event for ${payload.orderSeq}:`, errorMessage);
    await addAuditLog({
      eventType: 'webhook.processing.failed',
      user: 'SpeedyPay Webhook',
      details: `Failed to process COLLECTION webhook. Error: ${errorMessage}`,
      entityId: payload.orderSeq,
      entityType: 'payment',
    });
    // Return 'failed' so the provider will retry. The idempotency key was not logged, so the retry will be processed.
    return new NextResponse('failed', { status: 500 });
  }
}

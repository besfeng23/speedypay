import { NextResponse } from 'next/server';
import { verifySignature } from '@/lib/speedypay/crypto';
import { processPayoutWebhookEvent, processCollectionWebhookEvent } from '@/lib/speedypay/events';
import type { SpeedyPayPayoutWebhookPayload, SpeedyPayCollectionWebhookPayload } from '@/lib/speedypay/types';
import { addAuditLog, getPaymentById, getSettlementById } from '@/lib/data';
import { speedypayConfig } from '@/lib/speedypay/config';


// ##################################################################################
// IMPORTANT: PRODUCTION IDEMPOTENCY CONSIDERATIONS
// ##################################################################################
// The `processedEventIds` Set is an in-memory store. This is NOT suitable for a
// production environment with multiple serverless function instances or container
// replicas, as each instance will have its own separate memory space, and the store
// will be cleared on server restarts. This will lead to duplicate event processing.
//
// FOR PRODUCTION: This MUST be replaced with a persistent, distributed data store
// like Redis, a database table (e.g., Firestore, DynamoDB), or a similar solution
// that can be shared across all instances of your application.
// ##################################################################################
const processedEventIds = new Set<string>();

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

  // 2. Verify webhook signature
  if (!signature || !verifySignature(payload, speedypayConfig.secretKey!)) {
    await addAuditLog({
      eventType: 'webhook.security.failure',
      user: 'SpeedyPay Webhook',
      details: 'Webhook signature verification failed. Signature was missing or invalid.',
      entityId: orderSeq,
      entityType: null,
    });
    // According to docs, return "failed" to signal an issue to the provider.
    return new NextResponse('failed', { status: 400 });
  }

  // 3. Protect against duplicate events (idempotency)
  // The unique identifier for an event is the combination of the order and transaction sequence.
  const eventIdentifier = `${orderSeq}-${transSeq}`;
  if (processedEventIds.has(eventIdentifier)) {
    await addAuditLog({
      eventType: 'webhook.duplicate.received',
      user: 'SpeedyPay Webhook',
      details: `Duplicate event received and ignored: ${eventIdentifier}`,
      entityId: orderSeq,
      entityType: null
    });
    // Return "success" to acknowledge receipt and prevent the provider from resending.
    return new NextResponse('success');
  }
  processedEventIds.add(eventIdentifier);
  
  // 4. Determine if this is for a Payout or a Collection by checking our internal records.
  // Payout `orderSeq` corresponds to our internal `Settlement` ID.
  const settlement = await getSettlementById(orderSeq);
  if (settlement) {
    return handlePayoutWebhook(payload as SpeedyPayPayoutWebhookPayload);
  }

  // Collection `orderSeq` corresponds to our internal `Payment` ID.
  const payment = await getPaymentById(orderSeq);
  if (payment) {
    return handleCollectionWebhook(payload as SpeedyPayCollectionWebhookPayload);
  }

  // 5. If neither is found, it's an unknown webhook.
  await addAuditLog({
    eventType: 'webhook.unknown.received',
    user: 'SpeedyPay Webhook',
    details: `Webhook received for an unknown orderSeq that is not a settlement or payment: ${orderSeq}`,
    entityId: orderSeq,
    entityType: null,
  });
  return new NextResponse('failed', { status: 404 });
}

async function handlePayoutWebhook(payload: SpeedyPayPayoutWebhookPayload) {
  await addAuditLog({
    eventType: 'webhook.received',
    user: 'SpeedyPay Webhook',
    details: `Received PAYOUT webhook for OrderSeq ${payload.orderSeq} with state ${payload.transState}`,
    entityId: payload.orderSeq,
    entityType: 'settlement',
  });

  try {
    await processPayoutWebhookEvent(payload);
    await addAuditLog({
      eventType: 'webhook.processed',
      user: 'SpeedyPay Webhook',
      details: `Successfully processed PAYOUT webhook for OrderSeq: ${payload.orderSeq}`,
      entityId: payload.orderSeq,
      entityType: 'settlement',
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
    return new NextResponse('failed', { status: 500 });
  }
}

async function handleCollectionWebhook(payload: SpeedyPayCollectionWebhookPayload) {
   await addAuditLog({
    eventType: 'webhook.received',
    user: 'SpeedyPay Webhook',
    details: `Received COLLECTION webhook for OrderSeq ${payload.orderSeq} with state ${payload.transState}`,
    entityId: payload.orderSeq,
    entityType: 'payment',
  });

  try {
    await processCollectionWebhookEvent(payload);
    await addAuditLog({
      eventType: 'webhook.processed',
      user: 'SpeedyPay Webhook',
      details: `Successfully processed COLLECTION webhook for OrderSeq: ${payload.orderSeq}`,
      entityId: payload.orderSeq,
      entityType: 'payment',
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
    return new NextResponse('failed', { status: 500 });
  }
}

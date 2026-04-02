import { NextResponse } from 'next/server';
import { verifySignature } from '@/lib/speedypay/crypto';
import { processPayoutWebhookEvent, processCollectionWebhookEvent } from '@/lib/speedypay/events';
import type { SpeedyPayPayoutWebhookPayload, SpeedyPayCollectionWebhookPayload } from '@/lib/speedypay/types';
import { addAuditLog, getPaymentById, getSettlementById } from '@/lib/data';
import { speedypayConfig } from '@/lib/speedypay/config';

// A mock store for processed event IDs to ensure idempotency.
// In a production environment, this should be a persistent store like Redis or a database table.
const processedEventIds = new Set<string>();

/**
 * API route to handle incoming webhooks from SpeedyPay for BOTH payouts and collections.
 * It distinguishes the webhook type by checking if the orderSeq matches a settlement or a payment.
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

  if (!orderSeq || !transSeq) {
    return new NextResponse('Missing orderSeq or transSeq', { status: 400 });
  }

  // 1. Verify webhook signature
  if (!signature || !verifySignature(payload, speedypayConfig.secretKey!)) {
    await addAuditLog({
      eventType: 'webhook.security.failure',
      user: 'SpeedyPay Webhook',
      details: 'Webhook signature verification failed. Signature was missing or invalid.',
      entityId: orderSeq,
      entityType: null,
    });
    // According to docs, return "failed"
    return new NextResponse('failed', { status: 400 });
  }

  // 2. Protect against duplicate events (idempotency)
  const eventIdentifier = `${orderSeq}-${transSeq}`;
  if (processedEventIds.has(eventIdentifier)) {
    await addAuditLog({
      eventType: 'webhook.duplicate.received',
      user: 'SpeedyPay Webhook',
      details: `Duplicate event received and ignored: ${eventIdentifier}`,
      entityId: orderSeq,
      entityType: null
    });
    return new NextResponse('success');
  }
  processedEventIds.add(eventIdentifier);
  
  // 3. Determine if this is for a Payout or a Collection
  const settlement = await getSettlementById(orderSeq);
  if (settlement) {
    // It's a PAYOUT notification
    return handlePayoutWebhook(payload as SpeedyPayPayoutWebhookPayload);
  }

  const payment = await getPaymentById(orderSeq);
  if (payment) {
    // It's a COLLECTION notification
    return handleCollectionWebhook(payload as SpeedyPayCollectionWebhookPayload);
  }

  // 4. If neither is found, it's an unknown webhook
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

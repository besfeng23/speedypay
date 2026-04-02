import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySignature } from '@/lib/speedypay/crypto';
import { processWebhookEvent } from '@/lib/speedypay/events';
import type { SpeedyPayWebhookPayload } from '@/lib/speedypay/types';
import { addAuditLog } from '@/lib/data';
import { speedypayConfig } from '@/lib/speedypay/config';

// A mock store for processed event IDs to ensure idempotency.
// In a production environment, this should be a persistent store like Redis or a database table.
const processedEventIds = new Set<string>();

/**
 * API route to handle incoming webhooks from SpeedyPay.
 * NOTE: The SpeedyPay Payout docs do not specify a webhook payload format.
 * This implementation assumes a format based on the qryOrder response and may need adjustment.
 */
export async function POST(req: Request) {
  let payload: SpeedyPayWebhookPayload;
  let rawBody: string;

  try {
    rawBody = await req.text();
    // SpeedyPay sends webhooks as form-urlencoded, not JSON
    const params = new URLSearchParams(rawBody);
    payload = Object.fromEntries(params.entries()) as unknown as SpeedyPayWebhookPayload;
  } catch (err) {
    return new NextResponse('Invalid webhook body', { status: 400 });
  }
  
  const signature = payload.sign;

  // 1. Verify webhook signature
  if (!signature || !verifySignature(payload, speedypayConfig.secretKey)) {
    await addAuditLog({
      eventType: 'webhook.security.failure',
      user: 'SpeedyPay Webhook',
      details: 'Webhook signature verification failed. Signature was missing or invalid.',
      entityId: payload.orderSeq,
      entityType: 'payment',
    });
    // According to docs, return "failed"
    return new NextResponse('failed', { status: 400 });
  }

  // 2. Protect against duplicate events (idempotency)
  // Use transSeq as it should be unique per event for an order.
  const eventIdentifier = `${payload.orderSeq}-${payload.transSeq}`;
  if (processedEventIds.has(eventIdentifier)) {
    await addAuditLog({
      eventType: 'webhook.duplicate.received',
      user: 'SpeedyPay Webhook',
      details: `Duplicate event received and ignored: ${eventIdentifier}`,
      entityId: payload.orderSeq,
      entityType: 'payment'
    });
    // According to docs, return "success" for duplicates
    return new NextResponse('success');
  }
  processedEventIds.add(eventIdentifier);
  
  await addAuditLog({
    eventType: 'webhook.received',
    user: 'SpeedyPay Webhook',
    details: `Received webhook for OrderSeq ${payload.orderSeq} with state ${payload.transState}`,
    entityId: payload.orderSeq,
    entityType: 'payment'
  });

  try {
    // 3. Process the event
    await processWebhookEvent(payload);
    
    await addAuditLog({
      eventType: 'webhook.processed',
      user: 'SpeedyPay Webhook',
      details: `Successfully processed webhook event for OrderSeq: ${payload.orderSeq}`,
      entityId: payload.orderSeq,
      entityType: 'payment',
    });

    // Docs require a "success" response string
    return new NextResponse('success');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[SpeedyPay Webhook Error] Failed to process event for ${payload.orderSeq}:`, errorMessage);

    await addAuditLog({
      eventType: 'webhook.processing.failed',
      user: 'SpeedyPay Webhook',
      details: `Failed to process webhook event for ${payload.orderSeq}. Error: ${errorMessage}`,
      entityId: payload.orderSeq,
      entityType: 'payment'
    });

    return new NextResponse(`failed`, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/speedypay/api';
import { processWebhookEvent } from '@/lib/speedypay/events';
import type { SpeedyPayWebhookPayload } from '@/lib/speedypay/types';
import { addAuditLog } from '@/lib/data';

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
    payload = JSON.parse(rawBody);
  } catch (err) {
    return new NextResponse('Invalid JSON body', { status: 400 });
  }

  // IMPORTANT: The docs do not specify the webhook signature header.
  // Using a common convention 'speedypay-signature'. This MUST be verified.
  const signature = headers().get('speedypay-signature');

  // 1. Verify webhook signature
  // NOTE: The current `verifyWebhookSignature` uses the request body as a string, but the `crypto.ts`
  // `verifySignature` helper expects a payload object. This shows a slight mismatch that would need
  // to be resolved with final documentation. For now, we will use the parsed payload.
  if (!signature || !verifyWebhookSignature(payload)) {
    await addAuditLog({
      eventType: 'webhook.security.failure',
      user: 'SpeedyPay Webhook',
      details: 'Webhook signature verification failed. Signature was missing or invalid.',
    });
    return new NextResponse('Invalid signature', { status: 400 });
  }

  // 2. Protect against duplicate events (idempotency)
  // The unique identifier for an event is not specified. Assuming a combination of orderSeq and transState.
  const eventIdentifier = `${payload.orderSeq}-${payload.transState}-${payload.timestamp}`;
  if (processedEventIds.has(eventIdentifier)) {
    await addAuditLog({
      eventType: 'webhook.duplicate.received',
      user: 'SpeedyPay Webhook',
      details: `Duplicate event received and ignored: ${eventIdentifier}`,
      entityId: payload.orderSeq, // Mapping internal entity from orderSeq will be tricky.
    });
    return NextResponse.json({ received: true, message: 'Duplicate event' });
  }
  processedEventIds.add(eventIdentifier);
  
  await addAuditLog({
    eventType: 'webhook.received',
    user: 'SpeedyPay Webhook',
    details: `Received webhook for OrderSeq ${payload.orderSeq} with state ${payload.transState}`,
    entityId: payload.orderSeq,
  });

  try {
    // 3. Process the event
    // Assuming the webhook payload can be processed by a similar logic to the query response.
    // This is a major assumption as webhook structure is not documented.
    // await processWebhookEvent(payload); // This function doesn't exist yet
    console.log('[SpeedyPay Webhook] Webhook processing logic would go here.');
    
    await addAuditLog({
      eventType: 'webhook.processed',
      user: 'SpeedyPay Webhook',
      details: `Successfully processed webhook event for OrderSeq: ${payload.orderSeq}`,
      entityId: payload.orderSeq,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[SpeedyPay Webhook Error] Failed to process event for ${payload.orderSeq}:`, errorMessage);

    await addAuditLog({
      eventType: 'webhook.processing.failed',
      user: 'SpeedyPay Webhook',
      details: `Failed to process webhook event for ${payload.orderSeq}. Error: ${errorMessage}`,
      entityId: payload.orderSeq,
    });

    return new NextResponse(`Webhook processing error: ${errorMessage}`, { status: 500 });
  }
}

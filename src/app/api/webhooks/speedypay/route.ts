import 'server-only';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/speedypay/api';
import { processWebhookEvent } from '@/lib/speedypay/events';
import type { SpeedyPayWebhookEvent } from '@/lib/speedypay/types';
import { addAuditLog } from '@/lib/data';

// A mock store for processed event IDs to ensure idempotency.
// In a production environment, this should be a persistent store like Redis or a database table.
const processedEventIds = new Set<string>();

/**
 * API route to handle incoming webhooks from SpeedyPay.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('speedypay-signature');

  // 1. Verify webhook signature
  if (!signature || !verifyWebhookSignature(body, signature)) {
    await addAuditLog({
      eventType: 'webhook.security.failure',
      user: 'SpeedyPay Webhook',
      details: 'Webhook signature verification failed.',
    });
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body) as SpeedyPayWebhookEvent;

  // 2. Protect against duplicate events (idempotency)
  if (processedEventIds.has(event.id)) {
    await addAuditLog({
      eventType: 'webhook.duplicate.received',
      user: 'SpeedyPay Webhook',
      details: `Duplicate event received and ignored: ${event.id}`,
      entityId: event.data.object.id,
    });
    return NextResponse.json({ received: true, message: 'Duplicate event' });
  }
  processedEventIds.add(event.id);
  
  await addAuditLog({
    eventType: 'webhook.received',
    user: 'SpeedyPay Webhook',
    details: `Received webhook event type: ${event.type}`,
    entityId: event.data.object.id,
  });

  try {
    // 3. Process the event
    await processWebhookEvent(event);
    
    await addAuditLog({
      eventType: 'webhook.processed',
      user: 'SpeedyPay Webhook',
      details: `Successfully processed webhook event: ${event.id}`,
      entityId: event.data.object.id,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[SpeedyPay Webhook Error] Failed to process event ${event.id}:`, errorMessage);

    await addAuditLog({
      eventType: 'webhook.processing.failed',
      user: 'SpeedyPay Webhook',
      details: `Failed to process webhook event ${event.id}. Error: ${errorMessage}`,
      entityId: event.data.object.id,
    });

    return new NextResponse(`Webhook processing error: ${errorMessage}`, { status: 500 });
  }
}

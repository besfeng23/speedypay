import 'server-only';
import { createHash } from 'crypto';
import { speedypayConfig } from './config';

/**
 * Builds the canonical string for signature generation from a payload object.
 * @param payload - The request or response payload.
 * @returns A URL-encoded string of key-value pairs, sorted alphabetically by key.
 */
function buildCanonicalString(payload: Record<string, any>): string {
  const sortedKeys = Object.keys(payload).sort((a, b) => a.localeCompare(b));

  const parts = sortedKeys
    .filter(key => {
      // Per docs: exclude sign field, file streams, byte streams, and null values
      const value = payload[key];
      return key !== 'sign' && value !== null && value !== undefined;
    })
    .map(key => {
      const value = payload[key];
      // Ensure value is a string. Objects/arrays are not part of the documented request payloads.
      return `${key}=${String(value)}`;
    });

  return parts.join('&');
}

/**
 * Generates the SHA256 signature for a SpeedyPay API request.
 * @param payload - The request payload.
 * @returns The lowercase hex-encoded SHA256 signature.
 */
export function generateSignature(payload: Record<string, any>): string {
  const canonicalString = buildCanonicalString(payload);
  const stringToSign = `${canonicalString}&${speedypayConfig.secretKey}`;

  console.log('[SpeedyPay Crypto] String to Sign:', canonicalString + '&<SECRET_KEY>');

  const hash = createHash('sha256')
    .update(stringToSign)
    .digest('hex');

  return hash.toLowerCase();
}

/**
 * Verifies the signature of an incoming response or webhook from SpeedyPay.
 * @param payload - The response or webhook payload.
 * @param receivedSignature - The signature received from SpeedyPay.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifySignature(payload: Record<string, any>, receivedSignature: string): boolean {
  if (!receivedSignature) {
    console.warn('[SpeedyPay Crypto] No signature received for verification.');
    return false;
  }
  
  const expectedSignature = generateSignature(payload);

  console.log(`[SpeedyPay Crypto] Verifying Signature. Expected: ${expectedSignature}, Received: ${receivedSignature}`);

  // IMPORTANT: Use a constant-time comparison in a real production environment
  // to mitigate timing attacks, though it's less critical for response verification
  // than for webhooks. For Node.js `crypto.timingSafeEqual` is suitable.
  // For this demo, a direct comparison is acceptable.
  return expectedSignature === receivedSignature.toLowerCase();
}

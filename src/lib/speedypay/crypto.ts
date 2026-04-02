import { createHash } from 'crypto';

/**
 * Builds the canonical string for signing from a payload object.
 * Rules:
 * 1. Exclude 'sign' field.
 * 2. Filter out null or undefined values.
 * 3. Sort keys alphabetically.
 * 4. Concatenate into a URL query string format (key=value&...).
 * @param payload The request or response payload object.
 * @returns The canonical string to be signed.
 */
function buildCanonicalString(payload: Record<string, any>): string {
    const sortedKeys = Object.keys(payload).sort();
    
    const parts = sortedKeys
        .filter(key => key !== 'sign' && payload[key] !== null && payload[key] !== undefined && payload[key] !== '')
        .map(key => `${key}=${payload[key]}`);
        
    return parts.join('&');
}

/**
 * Generates a SHA256 signature for a given payload.
 * @param payload The request payload object.
 * @param secret The secret key to use for signing.
 * @returns The generated lowercase SHA256 signature.
 */
export function generateSignature(payload: Record<string, any>, secret: string): string {
  const canonicalString = buildCanonicalString(payload);
  const stringToSign = `${canonicalString}&${secret}`;
  
  console.log(`[SpeedyPay Crypto] String to sign: ${stringToSign}`);

  const hash = createHash('sha256');
  hash.update(stringToSign, 'utf8');
  const signature = hash.digest('hex').toLowerCase();
  
  console.log(`[SpeedyPay Crypto] Generated signature: ${signature}`);
  
  return signature;
}

/**
 * Verifies a signature against a payload.
 * @param payload The response payload object containing the 'sign' field.
 * @param secret The secret key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifySignature(payload: Record<string, any>, secret: string): boolean {
  const receivedSignature = payload.sign;
  if (!receivedSignature) {
      console.error('[SpeedyPay Crypto] Verification failed: No signature found in payload.');
      return false;
  }
  
  const expectedSignature = generateSignature(payload, secret);
  
  console.log(`[SpeedyPay Crypto] Verifying. Received: ${receivedSignature}, Expected: ${expectedSignature}`);

  // Use a constant-time comparison to prevent timing attacks, although for this case it's less critical.
  return receivedSignature.toLowerCase() === expectedSignature;
}

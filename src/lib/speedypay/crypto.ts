import { createHash } from 'crypto';

/**
 * Builds the canonical string for signing from a payload object according to provider rules.
 * Rules:
 * 1. Exclude 'sign' field.
 * 2. Filter out fields with null, undefined, or empty string values.
 * 3. Sort remaining fields alphabetically (ASCII order) by key.
 * 4. Concatenate into a URL query string format (e.g., key1=value1&key2=value2).
 * @param payload The request or response payload object.
 * @returns The canonical string to be signed.
 */
type SignableValue = string | number | boolean | null | undefined;
type SignablePayload = Record<string, SignableValue>;

function toSignablePayload(payload: object): SignablePayload {
  return Object.fromEntries(Object.entries(payload)) as SignablePayload;
}

function buildCanonicalString(payload: SignablePayload): string {
    const sortedKeys = Object.keys(payload).sort();
    
    const parts = sortedKeys
        // Rule 1 & 2: Exclude 'sign' and filter out null, undefined, or empty values.
        .filter(key => key !== 'sign' && payload[key] !== null && payload[key] !== undefined && payload[key] !== '')
        // Rule 3 is handled by using the sortedKeys array.
        // Rule 4: Concatenate into key=value pairs joined by '&'.
        .map(key => `${key}=${payload[key]}`);
        
    return parts.join('&');
}

/**
 * Generates a SHA256 signature for a given payload, following documented provider rules.
 * @param payload The request payload object.
 * @param secret The merchant secret key to use for signing.
 * @returns The generated lowercase SHA256 signature.
 */
export function generateSignature(payload: object, secret: string): string {
  const normalizedPayload = toSignablePayload(payload);
  // Steps 1-3: Build the canonical string from the payload.
  const canonicalString = buildCanonicalString(normalizedPayload);
  
  // Step 4: Append the merchant secret key.
  const stringToSign = `${canonicalString}&${secret}`;
  
  console.log(`[SpeedyPay Crypto] String to sign: ${stringToSign}`);

  // Step 5: Apply SHA256 hashing.
  const hash = createHash('sha256');
  hash.update(stringToSign, 'utf8');
  
  // Step 6: Use the resulting lowercase hash as the signature.
  const signature = hash.digest('hex').toLowerCase();
  
  console.log(`[SpeedyPay Crypto] Generated signature: ${signature}`);
  
  return signature;
}

/**
 * Verifies a signature against a payload using the provider's specified rules.
 * @param payload The response payload object containing the 'sign' field to be verified.
 * @param secret The merchant secret key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifySignature(payload: object, secret: string): boolean {
  const normalizedPayload = toSignablePayload(payload);
  // Step 7.1: Extract the signature from the payload.
  const receivedSignature = normalizedPayload.sign;
  if (typeof receivedSignature !== 'string' || receivedSignature.length === 0) {
      console.error('[SpeedyPay Crypto] Verification failed: No signature found in payload.');
      return false;
  }
  
  // Step 7.2 & 7.3: Recompute the signature based on the rest of the payload.
  const expectedSignature = generateSignature(normalizedPayload, secret);
  
  console.log(`[SpeedyPay Crypto] Verifying. Received: ${receivedSignature}, Expected: ${expectedSignature}`);

  // Step 7.4: Compare signatures.
  return receivedSignature.toLowerCase() === expectedSignature;
}

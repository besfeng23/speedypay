/**
 * Centralized configuration for the SpeedyPay provider.
 * Reads values from environment variables.
 * 
 * IMPORTANT: For client-side access, environment variables MUST be prefixed with `NEXT_PUBLIC_`.
 * Server-side-only variables should not have this prefix.
 */

// Use NEXT_PUBLIC_ for the environment so it can be read by client components for display purposes.
const speedyPayEnv = process.env.NEXT_PUBLIC_SPEEDYPAY_ENV === 'production' ? 'production' : 'test';

export const speedypayConfig = {
  /** The environment for the SpeedyPay API. Can be 'test' or 'production'. Read from NEXT_PUBLIC_SPEEDYPAY_ENV. */
  env: speedyPayEnv,
  
  /** The base URL for the SpeedyPay Payout API (e.g., cashOut, qryOrder). */
  payoutBaseUrl: speedyPayEnv === 'production'
    ? (process.env.SPEEDYPAY_PAYOUT_BASE_URL_PROD || 'https://www.emangopay.com') 
    : (process.env.SPEEDYPAY_PAYOUT_BASE_URL_TEST || 'https://test.emangopay.com'),

  /** The base URL for the SpeedyPay Collection/Cashier API (e.g., qrPay, qryOrder). */
  cashierBaseUrl: speedyPayEnv === 'production'
    ? (process.env.SPEEDYPAY_CASHIER_BASE_URL_PROD || 'https://pay.e-mango.ph')
    : (process.env.SPEEDYPAY_CASHIER_BASE_URL_TEST || 'https://test.e-mango.ph'),
  
  /** Your merchant sequence number (merchSeq) provided by SpeedyPay. Server-side only. */
  merchSeq: process.env.SPEEDYPAY_MERCH_SEQ,
  
  /** Your secret key for signing requests, provided by SpeedyPay. Server-side only. */
  secretKey: process.env.SPEEDYPAY_SECRET_KEY,
  
  /** The full public URL for your webhook notification endpoint. Server-side only. */
  notifyUrl: process.env.SPEEDYPAY_NOTIFY_URL,
};


/**
 * Checks if the essential server-side SpeedyPay configuration values are present.
 * @returns `true` if the merchant sequence and secret key are configured, `false` otherwise.
 */
export function isSpeedyPayConfigured(): boolean {
    return !!(speedypayConfig.merchSeq && speedypayConfig.secretKey);
}

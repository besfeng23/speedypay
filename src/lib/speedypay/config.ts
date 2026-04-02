/**
 * Centralized configuration for the SpeedyPay provider.
 * Reads values from environment variables.
 */

// Determine if we are in production or test environment.
const isProd = process.env.SPEEDYPAY_ENV === 'production';

export const speedypayConfig = {
  /** The environment for the SpeedyPay API. Can be 'test' or 'production'. */
  env: process.env.SPEEDYPAY_ENV || 'test',
  
  /** The base URL for the SpeedyPay Payout API (e.g., cashOut, qryOrder). */
  payoutBaseUrl: isProd 
    ? (process.env.SPEEDYPAY_BASE_URL_PROD || 'https://www.emangopay.com') 
    : (process.env.SPEEDYPAY_BASE_URL_TEST || 'https://test.emangopay.com'),

  /** The base URL for the SpeedyPay Cashier API (e.g., qrPay, qrPayB). */
  cashierBaseUrl: isProd
    ? (process.env.SPEEDYPAY_CASHIER_URL_PROD || 'https://pay.e-mango.ph')
    : (process.env.SPEEDYPAY_CASHIER_URL_TEST || 'https://test.e-mango.ph'),
  
  /** Your merchant sequence number (merchSeq) provided by SpeedyPay. */
  merchSeq: process.env.SPEEDYPAY_MERCH_SEQ,
  
  /** Your secret key for signing requests, provided by SpeedyPay. */
  secretKey: process.env.SPEEDYPAY_SECRET_KEY,
  
  /** The webhook notification URL you provide to SpeedyPay. */
  notifyUrl: process.env.SPEEDYPAY_NOTIFY_URL,
};

/**
 * @deprecated Use payoutBaseUrl or cashierBaseUrl directly from speedypayConfig
 */
export function getBaseUrl(): string {
    return speedypayConfig.payoutBaseUrl;
}

/**
 * Checks if the essential SpeedyPay configuration values are present.
 * @returns `true` if the merchant sequence and secret key are configured, `false` otherwise.
 */
export function isSpeedyPayConfigured(): boolean {
    return !!(speedypayConfig.merchSeq && speedypayConfig.secretKey);
}

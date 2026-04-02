
/**
 * Centralized configuration for the SpeedyPay provider.
 * Reads values from environment variables.
 * 
 * In a Next.js app, create a `.env.local` file in the root of your project
 * to store these values securely.
 */

export const speedypayConfig = {
  /** The environment to use: 'test' or 'production'. */
  env: process.env.SPEEDYPAY_ENV || 'test',

  /** The base URL for the SpeedyPay API in the test environment. */
  baseUrlTest: process.env.SPEEDYPAY_BASE_URL_TEST || 'https://test-api.emangopay.com/api',
  
  /** The base URL for the SpeedyPay API in the production environment. */
  baseUrlProd: process.env.SPEEDYPAY_BASE_URL_PROD || 'https://api.emangopay.com/api',

  /** Your unique merchant sequence ID provided by SpeedyPay. */
  merchSeq: process.env.SPEEDYPAY_MERCH_SEQ,
  
  /** Your secret key provided by SpeedyPay for signing requests. */
  secretKey: process.env.SPEEDYPAY_SECRET_KEY,
  
  /** The default callback URL for receiving webhook notifications. */
  notifyUrl: process.env.SPEEDYPAY_NOTIFY_URL,
};

/**
 * Returns the appropriate base URL based on the configured environment.
 */
export function getBaseUrl(): string {
    return speedypayConfig.env === 'production' ? speedypayConfig.baseUrlProd : speedypayConfig.baseUrlTest;
}

/**
 * Checks if the essential SpeedyPay configuration values are present.
 * @returns `true` if the API keys and webhook secret are configured, `false` otherwise.
 */
export function isSpeedyPayConfigured(): boolean {
    return !!(speedypayConfig.merchSeq && speedypayConfig.secretKey);
}

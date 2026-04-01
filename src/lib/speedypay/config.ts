import 'server-only';

/**
 * Centralized configuration for the SpeedyPay provider.
 * Reads values from environment variables.
 * 
 * In a Next.js app, create a `.env.local` file in the root of your project
 * to store these values securely.
 * 
 * .env.local
 * SPEEDYPAY_API_BASE_URL="https://api.sandbox.speedypay.com/v1"
 * SPEEDYPAY_API_KEY="YOUR_API_KEY"
 * SPEEDYPAY_API_SECRET="YOUR_API_SECRET"
 * SPEEDYPAY_WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
 */

export const speedypayConfig = {
  /** The base URL for the SpeedyPay API. Defaults to the sandbox environment. */
  apiBaseUrl: process.env.SPEEDYPAY_API_BASE_URL || 'https://api.sandbox.speedypay.com/v1',
  
  /** Your public API key for SpeedyPay. */
  apiKey: process.env.SPEEDYPAY_API_KEY,
  
  /** Your secret API key for SpeedyPay. Should be kept private. */
  apiSecret: process.env.SPEEDYPAY_API_SECRET,
  
  /** The secret used to verify incoming webhooks from SpeedyPay. */
  webhookSecret: process.env.SPEEDYPAY_WEBHOOK_SECRET,
};

/**
 * Checks if the essential SpeedyPay configuration values are present.
 * @returns `true` if the API keys and webhook secret are configured, `false` otherwise.
 */
export function isSpeedyPayConfigured(): boolean {
    return !!(speedypayConfig.apiKey && speedypayConfig.apiSecret && speedypayConfig.webhookSecret);
}

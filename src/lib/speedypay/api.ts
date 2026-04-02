import 'server-only';
import { speedypayConfig } from './config';
import type { CashOutRequest, QryOrderRequest, QryBalanceRequest, QrPayRequest, SpeedyPayResponse, QryBalanceResponse, QrPayResponse } from './types';
import { generateSignature, verifySignature } from './crypto';
import { format } from 'date-fns';

/**
 * A generic service adapter for making signed POST requests to the SpeedyPay/eMango Pay API.
 */
async function postToSpeedyPay<TRequest extends object, TResponse>(
    baseUrl: string, 
    endpoint: string, 
    payload: TRequest
): Promise<TResponse> {
  const { merchSeq, secretKey } = speedypayConfig;
  if (!merchSeq || !secretKey) {
    throw new Error('SpeedyPay API credentials are not configured.');
  }
  
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const requestPayload = {
    ...payload,
    merchSeq,
    timestamp,
    signType: 'SHA256',
  };

  const signature = generateSignature(requestPayload, secretKey);
  const signedPayload = { ...requestPayload, sign: signature };

  const fullUrl = `${baseUrl}${endpoint}`;
  console.log(`[SpeedyPay API] POST to ${fullUrl}`);
  console.log(`[SpeedyPay API] Payload:`, signedPayload);

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(signedPayload as Record<string, string>).toString(),
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[SpeedyPay API] Error response from ${fullUrl}:`, errorBody);
    throw new Error(`SpeedyPay API Error: ${response.status} ${response.statusText}`);
  }

  const responseText = await response.text();
  const responseData = Object.fromEntries(new URLSearchParams(responseText).entries()) as TResponse & { sign?: string };
  
  // Verify the response signature if a signature is present in the response
  if (responseData.sign && !verifySignature(responseData, secretKey)) {
      console.error(`[SpeedyPay API] Invalid response signature for orderSeq:`, (responseData as any).orderSeq);
      throw new Error('SpeedyPay API Error: Invalid response signature.');
  }

  console.log(`[SpeedyPay API] Response:`, responseData);
  return responseData;
}


// --- Payout API Methods ---

/**
 * Initiates a payout (cash out) request.
 * Corresponds to the `cashOut.do` endpoint.
 */
export async function cashOut(params: Omit<CashOutRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType' | 'orderDate' | 'currency' | 'fee' | 'notifyUrl'>) {
    const orderDate = format(new Date(), 'yyyy-MM-dd');
    const fullParams: Partial<CashOutRequest> = {
        ...params,
        orderDate,
        currency: 'PHP', // Defaulted as per docs
        fee: '0.00', // Reserved field
        notifyUrl: speedypayConfig.notifyUrl,
    };
    return postToSpeedyPay<Partial<CashOutRequest>, SpeedyPayResponse>(speedypayConfig.payoutBaseUrl, '/emg/cashOut.do', fullParams);
}

/**
 * Queries the status of a specific payout or collection order.
 * Corresponds to the `qryOrder.do` endpoint.
 */
export async function qryOrder(params: Omit<QryOrderRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType'>) {
    // Note: qryOrder is on the payout API host, even for collection orders.
    return postToSpeedyPay<QryOrderRequest, SpeedyPayResponse>(speedypayConfig.payoutBaseUrl, '/emg/qryOrder.do', params);
}

/**
 * Queries the merchant's balance for payouts.
 * Corresponds to the `qryBalance.do` endpoint.
 */
export async function qryBalance() {
    return postToSpeedyPay<{}, QryBalanceResponse>(speedypayConfig.payoutBaseUrl, '/emg/qryBalance.do', {});
}


// --- Collection API Methods ---

/**
 * Creates a QRPh Direct Payment request.
 * Corresponds to the `/cashier/qrPay.do` endpoint.
 * @param params The payment details.
 * @returns The provider's response, including the payment URL.
 */
export async function createQrPhDirectPayment(params: Omit<QrPayRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType' | 'orderDate' | 'currency' | 'fee' | 'busiType' | 'notifyUrl'>) {
    const orderDate = format(new Date(), 'yyyy-MM-dd');
    const fullParams: Partial<QrPayRequest> = {
        ...params,
        orderDate,
        currency: 'PHP',
        fee: '0.00',
        busiType: '1',
        notifyUrl: speedypayConfig.notifyUrl,
    };

    return postToSpeedyPay<Partial<QrPayRequest>, QrPayResponse>(speedypayConfig.cashierBaseUrl, '/cashier/qrPay.do', fullParams);
}

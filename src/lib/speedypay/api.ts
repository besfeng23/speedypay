import 'server-only';
import { speedypayConfig } from './config';
import type { 
    CashOutRequest, 
    QryOrderRequest, 
    QrPayRequest, 
    SpeedyPayResponse, 
    QryBalanceResponse, 
    QrPayResponse,
    QryCollectionOrderResponse,
    QryCollectionBalanceResponse
} from './types';
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
      const unsafeResponse = responseData as { orderSeq?: string };
      console.error(`[SpeedyPay API] Invalid response signature for orderSeq:`, unsafeResponse.orderSeq ?? 'unknown');
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
 * Queries the status of a specific payout order.
 * Corresponds to the `qryOrder.do` endpoint ON THE PAYOUT HOST.
 */
export async function qryOrder(params: Omit<QryOrderRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType'>) {
    return postToSpeedyPay<Omit<QryOrderRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType'>, SpeedyPayResponse>(speedypayConfig.payoutBaseUrl, '/emg/qryOrder.do', params);
}

/**
 * Queries the merchant's balance for payouts.
 * Corresponds to the `qryBalance.do` endpoint ON THE PAYOUT HOST.
 */
export async function qryBalance() {
    return postToSpeedyPay<{}, QryBalanceResponse>(speedypayConfig.payoutBaseUrl, '/emg/qryBalance.do', {});
}


// --- Collection API Methods ---

/**
 * Queries the status of a specific collection order.
 * Corresponds to the `/cashier/qryOrder.do` endpoint.
 */
export async function qryCollectionOrder(params: Omit<QryOrderRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType'>) {
    return postToSpeedyPay<Omit<QryOrderRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType'>, QryCollectionOrderResponse>(speedypayConfig.cashierBaseUrl, '/cashier/qryOrder.do', params);
}

/**
 * Queries the merchant's balance for collections.
 * Corresponds to the `qryBalance.do` endpoint ON THE CASHIER HOST.
 */
export async function qryCollectionBalance() {
    return postToSpeedyPay<{}, QryCollectionBalanceResponse>(speedypayConfig.cashierBaseUrl, '/cashier/qryBalance.do', {});
}


/**
 * Creates a collection payment link via the QR Pay endpoint.
 * Corresponds to the `/cashier/qrPay.do` endpoint.
 * @param params The payment details.
 * @returns The provider's response, including the payment URL.
 */
export async function createCollectionPayment(params: Omit<QrPayRequest, 'merchSeq' | 'timestamp' | 'sign' | 'signType' | 'orderDate' | 'currency' | 'fee' | 'busiType' | 'notifyUrl'>) {
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

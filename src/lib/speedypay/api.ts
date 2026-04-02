import 'server-only';
import { speedypayConfig, getBaseUrl } from './config';
import type {
  PayoutRequest,
  PayoutResponse,
  QueryOrderRequest,
  QueryOrderResponse,
  QueryBalanceRequest,
  QueryBalanceResponse,
  SpeedyPayWebhookPayload,
} from './types';
import { generateSignature, verifySignature } from './crypto';
import { format } from 'date-fns';

/**
 * A service adapter for interacting with the SpeedyPay Payout API.
 * This implementation is based on the provided eMango Pay documentation.
 */

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

/**
 * A generic fetch wrapper to handle API requests to SpeedyPay.
 * In a real app, this would use `fetch` and handle errors, retries, etc.
 * Here, it simulates the API call and returns a mock response.
 */
async function postToSpeedyPay<TRequest, TResponse>(endpoint: string, request: TRequest): Promise<TResponse | { respCode: string; respMessage: string; }> {
    const url = `${getBaseUrl()}/${endpoint}`;
    console.log(`[SpeedyPay API] Simulating POST to ${url}`);
    console.log(`[SpeedyPay API] Request Body:`, JSON.stringify(request, null, 2));

    // In a real application, you would use fetch:
    /*
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            // Handle HTTP errors
            const errorBody = await response.text();
            console.error(`[SpeedyPay API] HTTP Error ${response.status}:`, errorBody);
            return {
                respCode: String(response.status),
                respMessage: `HTTP Error: ${response.statusText}`,
            };
        }

        return await response.json() as TResponse;

    } catch (error) {
        console.error('[SpeedyPay API] Network or fetch error:', error);
        return {
            respCode: 'NET_ERROR',
            respMessage: error instanceof Error ? error.message : 'A network error occurred',
        };
    }
    */

    // For now, return a successful-looking mock response for demonstration.
    // The specific mock logic will be in each function.
    // This is a generic fallback.
    return {
        respCode: 'MOCK_ERROR',
        respMessage: 'This is a mock response. API method not fully mocked.',
    } as any;
}


/**
 * Submits a payout (cash out) request.
 * @param params - The payout request parameters.
 * @returns The response from SpeedyPay.
 */
export async function createPayout(params: Omit<PayoutRequest, 'signType' | 'sign' | 'timestamp' | 'merchSeq'>): Promise<PayoutResponse> {
  const request: Omit<PayoutRequest, 'sign'> = {
    ...params,
    merchSeq: speedypayConfig.merchSeq!,
    timestamp: format(new Date(), 'yyyyMMddHHmmss'),
    signType: 'SHA256',
  };
  const signature = generateSignature(request);
  const signedRequest: PayoutRequest = { ...request, sign: signature };

  // This is where you would make the actual API call.
  // For now, we simulate a successful response.
  console.log(`[SpeedyPay API] Calling cashOut.do with orderSeq: ${params.orderSeq}`);
  
  // MOCK RESPONSE
  const mockResponsePayload: Omit<PayoutResponse, 'sign' | 'signType'> = {
      respCode: '00000000',
      respMessage: 'Transaction is accepted',
      timestamp: format(new Date(), 'yyyyMMddHHmmss'),
      merchSeq: speedypayConfig.merchSeq!,
      orderSeq: params.orderSeq,
      transSeq: `T${Date.now()}`,
      amount: params.amount,
      currency: 'PHP',
      transState: '06', // In Process
  };
  
  const responseSignature = generateSignature(mockResponsePayload);
  const mockResponse: PayoutResponse = {
      ...mockResponsePayload,
      signType: 'SHA256',
      sign: responseSignature,
  };

  // Simulate network delay
  await new Promise(res => setTimeout(res, 500));

  return mockResponse;
}

/**
 * Queries the status of a specific order/transaction.
 * @param orderSeq - The unique order sequence ID to query.
 * @returns The transaction details from SpeedyPay.
 */
export async function queryOrder(orderSeq: string): Promise<QueryOrderResponse> {
    const request: Omit<QueryOrderRequest, 'sign'> = {
        merchSeq: speedypayConfig.merchSeq!,
        timestamp: format(new Date(), 'yyyyMMddHHmmss'),
        signType: 'SHA256',
        orderSeq: orderSeq,
    };
    const signature = generateSignature(request);
    const signedRequest: QueryOrderRequest = { ...request, sign: signature };

    console.log(`[SpeedyPay API] Calling qryOrder.do for orderSeq: ${orderSeq}`);

    // MOCK RESPONSE - in a real scenario, this would come from the API
    const mockResponsePayload: Omit<QueryOrderResponse, 'sign' | 'signType'> = {
        respCode: '00000000',
        respMessage: 'Query Success',
        timestamp: format(new Date(), 'yyyyMMddHHmmss'),
        merchSeq: speedypayConfig.merchSeq!,
        orderSeq: orderSeq,
        transSeq: `T${Date.now()}`,
        amount: "100.00", // Example
        fee: "0.00",
        currency: 'PHP',
        transState: '00', // Assume it succeeded for the query
        busiType: 'CashOut',
        createTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        notifyTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };
    const responseSignature = generateSignature(mockResponsePayload);
    const mockResponse: QueryOrderResponse = {
        ...mockResponsePayload,
        signType: 'SHA256',
        sign: responseSignature,
    };
    
    await new Promise(res => setTimeout(res, 300));
    return mockResponse;
}

/**
 * Queries the merchant's current balance with SpeedyPay.
 * @returns The balance information.
 */
export async function queryBalance(): Promise<QueryBalanceResponse> {
    const request: Omit<QueryBalanceRequest, 'sign'> = {
        merchSeq: speedypayConfig.merchSeq!,
        timestamp: format(new Date(), 'yyyyMMddHHmmss'),
        signType: 'SHA256',
    };
    const signature = generateSignature(request);
    const signedRequest: QueryBalanceRequest = { ...request, sign: signature };

    console.log(`[SpeedyPay API] Calling qryBalance.do`);

    // MOCK RESPONSE
    const mockResponsePayload: Omit<QueryBalanceResponse, 'sign' | 'signType'> = {
        respCode: '00000000',
        respMessage: 'Query Success',
        timestamp: format(new Date(), 'yyyyMMddHHmmss'),
        merchSeq: speedypayConfig.merchSeq!,
        amount: (Math.random() * 100000).toFixed(2), // Random balance for demo
    };
    const responseSignature = generateSignature(mockResponsePayload);
    const mockResponse: QueryBalanceResponse = {
        ...mockResponsePayload,
        signType: 'SHA256',
        sign: responseSignature,
    };

    await new Promise(res => setTimeout(res, 300));
    return mockResponse;
}


/**
 * Verifies the signature of an incoming webhook payload.
 * The payload is assumed to be the parsed JSON body of the request.
 * @param payload - The webhook payload object.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(payload: SpeedyPayWebhookPayload): boolean {
  console.log('[SpeedyPay Webhook] Verifying webhook signature.');
  if (!speedypayConfig.secretKey) {
    console.error('[SpeedyPay Webhook] Webhook secret key is not configured. Cannot verify signature.');
    return false;
  }
  if (!payload.sign) {
      console.error('[SpeedyPay Webhook] Payload has no signature.');
      return false;
  }
  
  return verifySignature(payload, payload.sign);
}

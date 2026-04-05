import type { RemittanceStatus, PaymentStatus, ProviderTransState } from '../types';

/**
 * Maps the provider's `transState` for a payout to our internal `remittanceStatus`.
 * This is crucial for decoupling our internal state from the provider's.
 * @param providerState The `transState` from the SpeedyPay API response.
 * @returns The corresponding internal `RemittanceStatus`.
 */
export function mapProviderStateToInternal(providerState: ProviderTransState): RemittanceStatus {
  switch (providerState) {
    case '00': // transaction succeeded
      return 'sent';
    case '06': // in process
    case '07': // order to be paid
      return 'processing';
    case '01': // transaction failed
    case '05': // failed refund
    case '08': // cancelled order
    case '09': // order expired
      return 'failed';
    default:
      return 'pending'; // Default to pending if unknown
  }
}

/**
 * Maps the provider's `transState` for a collection to our internal `paymentStatus`.
 * @param providerState The `transState` from the SpeedyPay API response.
 * @returns The corresponding internal `Payment['paymentStatus']`.
 */
export function mapCollectionStateToPaymentStatus(providerState: ProviderTransState): PaymentStatus {
  switch (providerState) {
    case '00': // transaction succeeded
      return 'succeeded';
    case '01': // transaction failed
      return 'failed';
    case '06': // in process
      return 'processing';
    case '07': // order to be paid
      return 'pending';
    case '08': // cancelled order
      return 'failed'; // Treat cancelled as failed
    case '09': // order expired
      return 'expired';
    default:
      return 'pending';
  }
}

/**
 * A dictionary to provide human-readable labels for provider transaction states.
 * All labels are lowercase for consistency.
 */
export const providerStateLabels: { [key in ProviderTransState]?: string } = {
  '00': 'succeeded',
  '01': 'failed',
  '03': 'partial-refund',
  '04': 'full-refund',
  '05': 'failed-refund',
  '06': 'in-process',
  '07': 'to-be-paid',
  '08': 'cancelled',
  '09': 'expired',
};

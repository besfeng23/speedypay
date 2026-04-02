import type { RemittanceStatus } from '../types';

/**
 * Maps the provider's `transState` to our internal `remittanceStatus`.
 * This is crucial for decoupling our internal state from the provider's.
 * @param providerState The `transState` from the SpeedyPay API response.
 * @returns The corresponding internal `RemittanceStatus`.
 */
export function mapProviderStateToInternal(providerState: string): RemittanceStatus {
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
 * A dictionary to provide human-readable labels for provider transaction states.
 */
export const providerStateLabels: { [key: string]: string } = {
  '00': 'Succeeded',
  '01': 'Failed',
  '03': 'Partial Refund',
  '04': 'Full Refund',
  '05': 'Failed Refund',
  '06': 'In Process',
  '07': 'To Be Paid',
  '08': 'Cancelled',
  '09': 'Expired',
};

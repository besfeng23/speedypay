'use server';
/**
 * @fileOverview A Genkit flow to simulate end-to-end payment and settlement scenarios.
 *
 * - simulatePayment - A function that handles the simulation process.
 * - SimulatePaymentInput - The input type for the simulatePayment function.
 * - SimulatePaymentOutput - The return type for the simulatePayment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SimulatePaymentInputSchema = z.object({
  scenarioType: z.enum(['success', 'payment_failed', 'settlement_failed', 'remittance_failed']).describe('The type of scenario to simulate: success, payment_failed, settlement_failed, or remittance_failed.'),
  grossAmount: z.number().positive().describe('The gross amount of the payment.'),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/).describe('The currency code (e.g., USD, EUR).'),
  feeType: z.enum(['percentage', 'fixed']).describe('The type of fee: percentage or fixed.'),
  feeValue: z.number().min(0).describe('The value of the fee. If percentage, a value between 0 and 100. If fixed, a monetary amount.'),
  merchantId: z.string().describe('The ID of the merchant for this transaction.'),
  customerName: z.string().describe('The name of the customer making the payment.'),
  description: z.string().optional().describe('An optional description for the simulation scenario.'),
});
export type SimulatePaymentInput = z.infer<typeof SimulatePaymentInputSchema>;

const PaymentRecordSchema = z.object({
  paymentId: z.string().describe('Unique identifier for the payment.'),
  externalReference: z.string().describe('External reference for the payment.'),
  bookingReferenceOrInvoiceReference: z.string().describe('Booking or invoice reference.'),
  customerName: z.string().describe('Name of the customer.'),
  customerEmail: z.string().email().describe('Email of the customer.'),
  merchantId: z.string().describe('ID of the merchant.'),
  grossAmount: z.number().describe('Gross amount of the payment.'),
  currency: z.string().length(3).describe('Currency code (e.g., USD).'),
  feeType: z.enum(['percentage', 'fixed']).describe('Type of fee applied.'),
  feeValue: z.number().describe('Value of the fee.'),
  platformFeeAmount: z.number().describe('Amount deducted as platform fee.'),
  merchantNetAmount: z.number().describe('Net amount remitted to the merchant.'),
  paymentStatus: z.enum(['payment pending', 'payment succeeded', 'payment failed']).describe('Current status of the payment.'),
  settlementStatus: z.enum(['settlement pending', 'settlement processing', 'settlement completed', 'settlement failed', 'N/A']).describe('Current status of settlement. Use N/A if not applicable.'),
  remittanceStatus: z.enum(['remittance pending', 'remittance sent', 'remittance failed', 'N/A']).describe('Current status of remittance. Use N/A if not applicable.'),
  sourceChannel: z.string().describe('Source channel of the payment (e.g., Web, Mobile).'),
  createdAt: z.string().datetime().describe('Timestamp when the payment record was created.'),
  updatedAt: z.string().datetime().describe('Timestamp when the payment record was last updated.'),
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

const SettlementRecordSchema = z.object({
  settlementId: z.string().describe('Unique identifier for the settlement.'),
  paymentId: z.string().describe('ID of the associated payment.'),
  merchantId: z.string().describe('ID of the merchant.'),
  grossAmount: z.number().describe('Gross amount of the payment.'),
  platformFeeAmount: z.number().describe('Amount deducted as platform fee.'),
  merchantNetAmount: z.number().describe('Net amount remitted to the merchant.'),
  settlementStatus: z.enum(['settlement pending', 'settlement processing', 'settlement completed', 'settlement failed']).describe('Current status of the settlement.'),
  remittanceStatus: z.enum(['remittance pending', 'remittance sent', 'remittance failed']).describe('Current status of remittance.'),
  payoutReference: z.string().describe('Reference for the payout transaction.'),
  failureReason: z.string().optional().describe('Reason for settlement or remittance failure. Omit if not applicable.'),
  createdAt: z.string().datetime().describe('Timestamp when the settlement record was created.'),
  updatedAt: z.string().datetime().describe('Timestamp when the settlement record was last updated.'),
});
export type SettlementRecord = z.infer<typeof SettlementRecordSchema>;

const SimulatePaymentOutputSchema = z.object({
  paymentRecord: PaymentRecordSchema,
  settlementRecord: SettlementRecordSchema.optional(),
});
export type SimulatePaymentOutput = z.infer<typeof SimulatePaymentOutputSchema>;

export async function simulatePayment(input: SimulatePaymentInput): Promise<SimulatePaymentOutput> {
  return simulatePaymentFlow(input);
}

const simulatePaymentPrompt = ai.definePrompt({
  name: 'simulatePaymentPrompt',
  input: { schema: SimulatePaymentInputSchema },
  output: { schema: SimulatePaymentOutputSchema },
  prompt: `You are an AI assistant tasked with simulating payment and settlement scenarios for the SpeedyPay Marketplace Console.
Your goal is to generate realistic JSON output conforming to the provided schemas for a PaymentRecord and an optional SettlementRecord, based on the input parameters.

Here are the details for the simulation:
- Scenario Type: {{{scenarioType}}}
- Gross Amount: {{{grossAmount}}}
- Currency: {{{currency}}}
- Fee Type: {{{feeType}}}
- Fee Value: {{{feeValue}}}
- Merchant ID: {{{merchantId}}}
- Customer Name: {{{customerName}}}
{{#if description}}- Description: {{{description}}}{{/if}}

Follow these rules for generating the output:
1.  **Unique IDs:** Generate unique string IDs for 'paymentId' and 'settlementId' (if applicable), and 'externalReference', 'bookingReferenceOrInvoiceReference', 'payoutReference'.
2.  **Dates:** Use current or slightly past ISO 8601 formatted timestamps for 'createdAt' and 'updatedAt'.
3.  **Customer Email:** Generate a plausible customer email based on the 'customerName' (e.g., lowercase name, replace spaces with dots, add @example.com).
4.  **Source Channel:** Choose a plausible source channel (e.g., 'Web', 'Mobile App', 'POS').
5.  **Fee Calculation:**
    - If 'feeType' is 'percentage', 'platformFeeAmount' = (grossAmount * feeValue / 100). This must be rounded to two decimal places.
    - If 'feeType' is 'fixed', 'platformFeeAmount' = feeValue. This must be rounded to two decimal places.
    - 'merchantNetAmount' = grossAmount - platformFeeAmount. This must be rounded to two decimal places.
    - All currency amounts ('grossAmount', 'platformFeeAmount', 'merchantNetAmount') must be rounded to exactly two decimal places.
6.  **Status Determination:** Based on 'scenarioType':
    - **'success'**: All systems go.
        - 'paymentStatus': 'payment succeeded'
        - 'settlementStatus': 'settlement completed'
        - 'remittanceStatus': 'remittance sent'
        - 'failureReason' (in settlementRecord): Omit or set to null.
    - **'payment_failed'**: Payment was not successful at the very beginning.
        - 'paymentStatus': 'payment failed'
        - 'settlementStatus': 'N/A'
        - 'remittanceStatus': 'N/A'
        - **Do not generate a settlementRecord.**
        - 'failureReason': "Payment declined by customer's bank due to insufficient funds."
    - **'settlement_failed'**: Payment succeeded, but settlement failed.
        - 'paymentStatus': 'payment succeeded'
        - 'settlementStatus': 'settlement failed'
        - 'remittanceStatus': 'remittance pending'
        - 'failureReason' (in settlementRecord): "Issue with merchant's settlement account details or bank processing."
    - **'remittance_failed'**: Payment and settlement succeeded, but remittance to merchant failed.
        - 'paymentStatus': 'payment succeeded'
        - 'settlementStatus': 'settlement completed'
        - 'remittanceStatus': 'remittance failed'
        - 'failureReason' (in settlementRecord): "Remittance transfer failed due to invalid beneficiary details or network error."
7.  Ensure that if 'scenarioType' is 'payment_failed', the 'settlementRecord' field is entirely omitted from the output. For other scenarios, it should be present. Do not use an empty object for an optional field.
`,
});

const simulatePaymentFlow = ai.defineFlow(
  { 
    name: 'simulatePaymentFlow',
    inputSchema: SimulatePaymentInputSchema,
    outputSchema: SimulatePaymentOutputSchema,
  },
  async (input) => {
    const { output } = await simulatePaymentPrompt(input);
    if (!output) {
      throw new Error('Failed to generate simulation output.');
    }
    return output;
  }
);

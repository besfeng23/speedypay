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
import { v4 as uuidv4 } from 'uuid';
import { PAYMENT_STATUSES, REMITTANCE_STATUSES, SETTLEMENT_STATUSES } from '@/lib/types';


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
  externalReference: z.string().describe('External reference for the payment, like from a payment gateway (e.g., ch_xxxxxxxx).'),
  bookingReferenceOrInvoiceReference: z.string().describe('Booking or invoice reference (e.g., inv-2024-xxxx).'),
  customerName: z.string().describe('Name of the customer.'),
  customerEmail: z.string().email().describe('Email of the customer.'),
  merchantId: z.string().describe('ID of the merchant.'),
  grossAmount: z.number().describe('Gross amount of the payment.'),
  currency: z.string().length(3).describe('Currency code (e.g., USD).'),
  feeType: z.enum(['percentage', 'fixed']).describe('Type of fee applied.'),
  feeValue: z.number().describe('Value of the fee.'),
  platformFeeAmount: z.number().describe('Amount deducted as platform fee.'),
  merchantNetAmount: z.number().describe('Net amount remitted to the merchant.'),
  paymentStatus: z.enum(PAYMENT_STATUSES).describe('Current status of the payment.'),
  settlementStatus: z.enum(SETTLEMENT_STATUSES).describe('Current status of settlement. Use N/A if not applicable.'),
  remittanceStatus: z.enum(REMITTANCE_STATUSES).describe('Current status of remittance. Use N/A if not applicable.'),
  sourceChannel: z.string().describe('Source channel of the payment (e.g., Web, Mobile).'),
  createdAt: z.string().datetime().describe('Timestamp when the payment record was created.'),
  updatedAt: z.string().datetime().describe('Timestamp when the payment record was last updated.'),
  failureReason: z.string().optional().describe('Reason for payment failure. Omit if not applicable.'),
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

const SettlementRecordSchema = z.object({
  settlementId: z.string().describe('Unique identifier for the settlement.'),
  paymentId: z.string().describe('ID of the associated payment.'),
  merchantId: z.string().describe('ID of the merchant.'),
  grossAmount: z.number().describe('Gross amount of the payment.'),
  currency: z.string().length(3).describe('Currency code (e.g., USD).'),
  platformFeeAmount: z.number().describe('Amount deducted as platform fee.'),
  merchantNetAmount: z.number().describe('Net amount remitted to the merchant.'),
  settlementStatus: z.enum(['pending', 'completed']).describe('Current status of the settlement.'),
  remittanceStatus: z.enum(['pending', 'processing', 'sent', 'failed']).describe('Current status of remittance.'),
  payoutReference: z.string().optional().describe('Reference for the payout transaction (e.g., po_xxxxxxxx).'),
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
1.  **Unique IDs:** Generate unique and realistic-looking string IDs:
    - 'paymentId': "pay-" + 8 random hex characters.
    - 'settlementId' (if applicable): "set-" + 8 random hex characters.
    - 'externalReference': "ch_" + 12 random alphanumeric characters.
    - 'bookingReferenceOrInvoiceReference': "inv-2024-" + 5 random digits.
    - 'payoutReference': "po_" + 12 random alphanumeric characters.
2.  **Dates:** Use current or slightly past ISO 8601 formatted timestamps for 'createdAt' and 'updatedAt'. 'updatedAt' should be slightly after 'createdAt'.
3.  **Customer Email:** Generate a plausible customer email based on the 'customerName' (e.g., lowercase name, replace spaces with dots, add @example.com).
4.  **Source Channel:** Choose a plausible source channel (e.g., 'Web', 'Mobile App', 'POS').
5.  **Fee Calculation (CRITICAL):**
    - Calculate 'platformFeeAmount'. If 'feeType' is 'percentage', 'platformFeeAmount' = (grossAmount * feeValue / 100). If 'feeType' is 'fixed', 'platformFeeAmount' = feeValue.
    - 'merchantNetAmount' = grossAmount - platformFeeAmount.
    - **All currency amounts ('grossAmount', 'platformFeeAmount', 'merchantNetAmount') must be numbers rounded to exactly two decimal places.** For example, 12.3 must be 12.30, and 15 must be 15.00.
6.  **Currency:** The currency for the settlement record must be the same as the payment record.
7.  **Status Determination:** Based on 'scenarioType', use the exact lowercase status strings as defined in the schemas.
    - **'success'**: All systems go.
        - 'paymentStatus': 'succeeded'
        - 'settlementStatus' (in both records): 'completed'
        - 'remittanceStatus' (in both records): 'sent'
        - 'failureReason' (in settlementRecord): Omit or set to null.
    - **'payment_failed'**: Payment was not successful at the very beginning.
        - 'paymentStatus': 'failed'
        - 'settlementStatus': 'N/A'
        - 'remittanceStatus': 'N/A'
        - **Do not generate a settlementRecord.**
        - A realistic failure reason should be included in the 'paymentRecord' in a new 'failureReason' field, e.g., "Payment declined by customer\'s bank due to insufficient funds."
    - **'settlement_failed'**: Payment succeeded, but settlement failed.
        - 'paymentStatus': 'succeeded'
        - 'settlementStatus': 'failed' // This status would not exist in real-world logic, but for simulation it's ok.
        - 'remittanceStatus': 'pending'
        - 'failureReason' (in settlementRecord): "Issue with merchant\'s settlement account details or bank processing."
    - **'remittance_failed'**: Payment and settlement succeeded, but remittance to merchant failed.
        - 'paymentStatus': 'succeeded'
        - 'settlementStatus': 'completed'
        - 'remittanceStatus': 'failed'
        - 'failureReason' (in settlementRecord): "Remittance transfer failed due to invalid beneficiary details or network error."
8.  Ensure that if 'scenarioType' is 'payment_failed', the 'settlementRecord' field is entirely omitted from the output. For other scenarios, it must be present. Do not use an empty object for an optional field.
`,
});


const simulatePaymentFlow = ai.defineFlow(
  {
    name: 'simulatePaymentFlow',
    inputSchema: SimulatePaymentInputSchema,
    outputSchema: SimulatePaymentOutputSchema,
  },
  async (input) => {
    // Generate IDs on the server for consistency, pass them to the prompt
    const paymentId = `pay-${uuidv4().slice(0, 8)}`;
    const settlementId = `set-${uuidv4().slice(0, 8)}`;

    const { output } = await simulatePaymentPrompt({
      ...input,
    });

    if (!output) {
      throw new Error('Failed to generate simulation output.');
    }

    // Post-process to ensure IDs are what we generated, as LLM can sometimes ignore instructions.
    output.paymentRecord.paymentId = paymentId;
    if (output.settlementRecord) {
        output.settlementRecord.settlementId = settlementId;
        output.settlementRecord.paymentId = paymentId;
    }

    // Enforce 2-decimal rounding post-generation
    const roundToTwo = (num: number) => Math.round(num * 100) / 100;
    output.paymentRecord.grossAmount = roundToTwo(output.paymentRecord.grossAmount);
    output.paymentRecord.platformFeeAmount = roundToTwo(output.paymentRecord.platformFeeAmount);
    output.paymentRecord.merchantNetAmount = roundToTwo(output.paymentRecord.merchantNetAmount);

    if (output.settlementRecord) {
       output.settlementRecord.grossAmount = roundToTwo(output.settlementRecord.grossAmount);
       output.settlementRecord.platformFeeAmount = roundToTwo(output.settlementRecord.platformFeeAmount);
       output.settlementRecord.merchantNetAmount = roundToTwo(output.settlementRecord.merchantNetAmount);
    }

    return output;
  }
);

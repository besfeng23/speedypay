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
import { PAYMENT_STATUSES, SETTLEMENT_STATUSES, PAYOUT_STATUSES } from '@/lib/types';


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
  id: z.string().describe('Unique identifier for the payment.'),
  externalReference: z.string().describe('External reference for the payment, like from a payment gateway (e.g., ch_xxxxxxxx).'),
  bookingReferenceOrInvoiceReference: z.string().describe('Booking or invoice reference (e.g., inv-2024-xxxx).'),
  customerName: z.string().describe('Name of the customer.'),
  customerEmail: z.string().email().describe('Email of the customer.'),
  merchantId: z.string().describe('ID of the merchant.'),
  grossAmount: z.number().describe('Gross amount of the payment.'),
  currency: z.string().length(3).describe('Currency code (e.g., USD).'),
  platformFeeAmount: z.number().describe('Amount deducted as platform fee.'),
  merchantNetAmount: z.number().describe('Net amount remitted to the merchant.'),
  paymentStatus: z.enum(PAYMENT_STATUSES).describe('Current status of the payment.'),
  settlementStatus: z.enum(['pending', 'completed', 'N/A']).describe('Current status of internal settlement creation.'),
  sourceChannel: z.enum(['Web', 'Mobile', 'API', 'Manual']).describe('Source channel of the payment.'),
  createdAt: z.string().datetime().describe('Timestamp when the payment record was created.'),
  updatedAt: z.string().datetime().describe('Timestamp when the payment record was last updated.'),
  failureReason: z.string().nullable().describe('Reason for payment failure. Use null if not applicable.'),
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

const SettlementRecordSchema = z.object({
  id: z.string().describe('Unique identifier for the internal settlement record.'),
  paymentId: z.string().describe('ID of the associated payment.'),
  merchantId: z.string().describe('ID of the merchant.'),
  status: z.enum(SETTLEMENT_STATUSES).describe('Current status of the settlement.'),
  grossAmount: z.number().describe('Gross amount of the payment.'),
  currency: z.string().length(3).describe('Currency code (e.g., USD).'),
  platformFeeAmount: z.number().describe('Amount deducted as platform fee.'),
  merchantNetAmount: z.number().describe('Net amount remitted to the merchant.'),
  payoutId: z.string().nullable().describe('Reference ID to the Payout record. Should be null if no payout has been created.'),
  createdAt: z.string().datetime().describe('Timestamp when the settlement record was created.'),
  updatedAt: z.string().datetime().describe('Timestamp when the settlement record was last updated.'),
});
export type SettlementRecord = z.infer<typeof SettlementRecordSchema>;

const PayoutRecordSchema = z.object({
    id: z.string().describe('Unique identifier for the payout, should match payoutId in SettlementRecord.'),
    settlementId: z.string().describe('ID of the parent settlement record.'),
    merchantAccountId: z.string().describe('ID of the merchant.'),
    amount: z.number().describe('The net amount to be paid out.'),
    currency: z.string().length(3).describe('Currency code (e.g., USD).'),
    status: z.enum(PAYOUT_STATUSES).describe('Status of the external payout process.'),
    providerName: z.string().describe('Name of the payout provider, e.g., "SpeedyPay".'),
    failureReason: z.string().nullable().describe('Reason for payout failure. Use null if not applicable.'),
    createdAt: z.string().datetime().describe('Timestamp when the payout record was created.'),
    updatedAt: z.string().datetime().describe('Timestamp when the payout record was last updated.'),
});
export type PayoutRecord = z.infer<typeof PayoutRecordSchema>;


const SimulatePaymentOutputSchema = z.object({
  paymentRecord: PaymentRecordSchema,
  settlementRecord: SettlementRecordSchema.optional(),
  payoutRecord: PayoutRecordSchema.optional(),
});
export type SimulatePaymentOutput = z.infer<typeof SimulatePaymentOutputSchema>;

export async function simulatePayment(input: SimulatePaymentInput): Promise<SimulatePaymentOutput> {
  return simulatePaymentFlow(input);
}

const simulatePaymentPrompt = ai.definePrompt({
  name: 'simulatePaymentPrompt',
  input: { schema: SimulatePaymentInputSchema },
  output: { schema: SimulatePaymentOutputSchema },
  prompt: `You are an AI assistant tasked with simulating payment, settlement, and payout scenarios for the SpeedyPay Marketplace Console.
Your goal is to generate realistic JSON output conforming to the provided schemas for a PaymentRecord, an optional SettlementRecord, and an optional PayoutRecord based on the input parameters.

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
    - 'id' in paymentRecord: "pay-" + 8 random hex characters.
    - 'id' in settlementRecord: "set-" + 8 random hex characters.
    - 'id' in payoutRecord: "po-" + 8 random hex characters.
    - 'externalReference': "ch_" + 12 random alphanumeric characters.
    - 'bookingReferenceOrInvoiceReference': "inv-2024-" + 5 random digits.
2.  **Dates:** Use current or slightly past ISO 8601 formatted timestamps for 'createdAt' and 'updatedAt'. 'updatedAt' should be slightly after 'createdAt'.
3.  **Customer Email:** Generate a plausible customer email based on 'customerName'.
4.  **Source Channel:** Choose a plausible source channel (e.g., 'Web', 'API').
5.  **Fee Calculation (CRITICAL):**
    - Calculate 'platformFeeAmount'. If 'feeType' is 'percentage', 'platformFeeAmount' = (grossAmount * feeValue / 100). If 'feeType' is 'fixed', 'platformFeeAmount' = feeValue.
    - 'merchantNetAmount' = grossAmount - platformFeeAmount.
    - **All currency amounts must be numbers rounded to exactly two decimal places.**
6.  **Scenario Logic:**
    - **'success'**: All systems go.
        - paymentRecord: 'paymentStatus': 'succeeded', 'settlementStatus': 'completed'.
        - settlementRecord: 'status': 'paid'. 'payoutId' must link to the payoutRecord's ID.
        - payoutRecord: 'status': 'sent'.
    - **'payment_failed'**: Payment failed at the start.
        - paymentRecord: 'paymentStatus': 'failed', 'settlementStatus': 'N/A', include a realistic 'failureReason'.
        - **Do not generate settlementRecord or payoutRecord.**
    - **'settlement_failed'**: This scenario is now equivalent to a remittance_failed, as internal settlement creation is atomic. Simulate a remittance failure instead.
        - paymentRecord: 'paymentStatus': 'succeeded', 'settlementStatus': 'completed'.
        - settlementRecord: 'status': 'failed'. 'payoutId' must link to the payoutRecord's ID.
        - payoutRecord: 'status': 'failed'. Include a 'failureReason', e.g., "Remittance transfer failed due to invalid beneficiary details."
    - **'remittance_failed'**: Payment succeeded, but the final payout failed.
        - paymentRecord: 'paymentStatus': 'succeeded', 'settlementStatus': 'completed'.
        - settlementRecord: 'status': 'failed'. 'payoutId' must link to the payoutRecord's ID.
        - payoutRecord: 'status': 'failed'. Include a 'failureReason', e.g., "Remittance transfer failed due to invalid beneficiary details."
7.  **Relationships:**
    - settlementRecord.paymentId must match paymentRecord.id.
    - payoutRecord.settlementId must match settlementRecord.id.
    - settlementRecord.payoutId must match payoutRecord.id.
    - payoutRecord.merchantAccountId must match paymentRecord.merchantId.
8.  Omit optional records ('settlementRecord', 'payoutRecord') entirely if they are not generated. Do not use empty objects.
`,
});


const simulatePaymentFlow = ai.defineFlow(
  {
    name: 'simulatePaymentFlow',
    inputSchema: SimulatePaymentInputSchema,
    outputSchema: SimulatePaymentOutputSchema,
  },
  async (input) => {
    // Generate IDs on the server for consistency
    const paymentId = `pay-${uuidv4().slice(0, 8)}`;
    const settlementId = `set-${uuidv4().slice(0, 8)}`;
    const payoutId = `po-${uuidv4().slice(0, 8)}`;

    const { output } = await simulatePaymentPrompt({
      ...input,
    });

    if (!output) {
      throw new Error('Failed to generate simulation output.');
    }

    // Post-process to enforce data integrity, as LLM can sometimes ignore instructions.
    output.paymentRecord.id = paymentId;
    if (output.settlementRecord) {
        output.settlementRecord.id = settlementId;
        output.settlementRecord.paymentId = paymentId;
    }
    if (output.payoutRecord) {
        output.payoutRecord.id = payoutId;
        output.payoutRecord.settlementId = settlementId;
        output.settlementRecord!.payoutId = payoutId;
    }


    // Enforce 2-decimal rounding post-generation
    const roundToTwo = (num: number) => Math.round(num * 100) / 100;
    output.paymentRecord.grossAmount = roundToTwo(output.paymentRecord.grossAmount);
    output.paymentRecord.platformFeeAmount = roundToTwo(output.paymentRecord.platformFeeAmount);
    output.paymentRecord.merchantNetAmount = roundToTwo(output.paymentRecord.merchantNetAmount);
    output.paymentRecord.failureReason = output.paymentRecord.failureReason ?? null;

    if (output.settlementRecord) {
       output.settlementRecord.grossAmount = roundToTwo(output.settlementRecord.grossAmount);
       output.settlementRecord.platformFeeAmount = roundToTwo(output.settlementRecord.platformFeeAmount);
       output.settlementRecord.merchantNetAmount = roundToTwo(output.settlementRecord.merchantNetAmount);
    }
    if (output.payoutRecord) {
        output.payoutRecord.amount = roundToTwo(output.payoutRecord.amount);
        output.payoutRecord.failureReason = output.payoutRecord.failureReason ?? null;
    }

    return output;
  }
);

'use server';
/**
 * @fileOverview An AI assistant flow that suggests default fee configurations and KYC requirements for merchant onboarding.
 *
 * - getMerchantOnboardingSuggestions - A function that provides AI-driven suggestions for merchant onboarding.
 * - MerchantOnboardingSuggestionsInput - The input type for the getMerchantOnboardingSuggestions function.
 * - MerchantOnboardingSuggestionsOutput - The return type for the getMerchantOnboardingSuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MerchantOnboardingSuggestionsInputSchema = z.object({
  businessType: z
    .string()
    .describe('The type of business the merchant operates (e.g., "retail", "restaurant", "software as a service").'),
  country: z
    .string()
    .describe('The country where the merchant operates (e.g., "USA", "Canada", "UK").'),
});
export type MerchantOnboardingSuggestionsInput = z.infer<typeof MerchantOnboardingSuggestionsInputSchema>;

const MerchantOnboardingSuggestionsOutputSchema = z.object({
  suggestedFeeConfig: z
    .object({
      type: z.enum(['percentage', 'fixed']).describe('The suggested fee type.'),
      value: z
        .number()
        .describe('The suggested fee value (e.g., 2.9 for percentage, 0.30 for fixed).'),
    })
    .describe('Suggested default fee configuration.'),
  kycRequirementsSummary: z
    .string()
    .describe(
      'A summary of potential KYC requirements for the merchant based on their business type and country.'
    ),
});
export type MerchantOnboardingSuggestionsOutput = z.infer<typeof MerchantOnboardingSuggestionsOutputSchema>;

export async function getMerchantOnboardingSuggestions(
  input: MerchantOnboardingSuggestionsInput
): Promise<MerchantOnboardingSuggestionsOutput> {
  return merchantOnboardingSuggestionsFlow(input);
}

const merchantOnboardingSuggestionsPrompt = ai.definePrompt({
  name: 'merchantOnboardingSuggestionsPrompt',
  input: { schema: MerchantOnboardingSuggestionsInputSchema },
  output: { schema: MerchantOnboardingSuggestionsOutputSchema },
  prompt: `You are an AI assistant helping with merchant onboarding for a payment platform. Your task is to suggest a default fee configuration and summarize potential KYC requirements based on the merchant's business type and country.

Consider the following merchant details:
Business Type: {{{businessType}}}
Country: {{{country}}}

Provide a suggested default fee configuration, choosing between a 'percentage' or 'fixed' fee type, along with a reasonable value. Additionally, provide a concise summary of general KYC (Know Your Customer) requirements that might apply to this type of business in the specified country.

The output must be a JSON object strictly adhering to the following schema:
{{jsonSchema MerchantOnboardingSuggestionsOutputSchema}}`,
});

const merchantOnboardingSuggestionsFlow = ai.defineFlow(
  {
    name: 'merchantOnboardingSuggestionsFlow',
    inputSchema: MerchantOnboardingSuggestionsInputSchema,
    outputSchema: MerchantOnboardingSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await merchantOnboardingSuggestionsPrompt(input);
    return output!;
  }
);
